from rest_framework.test import APITestCase, APITransactionTestCase
from rest_framework import status
from api.models import User, StudentBalance, StudentTransaction, TransactionAllocation, Course, CourseSchoolYear, Enrollment
from decimal import Decimal
import threading

class AccountingBusinessLogicTest(APITestCase):
    def setUp(self):
        # Create Accounting staff
        self.accounting_user = User.objects.create(
            user_id=2026001,
            email="accounting@test.com",
            user_type="Accounting"
        )
        self.accounting_user.set_password("password123")
        self.accounting_user.save()

        # Create Student
        self.student_user = User.objects.create(
            user_id=2026002,
            email="student@test.com",
            user_type="Student",
            program="AB-Theology"
        )
        self.student_user.set_password("password123")
        self.student_user.save()
        self.student_a = self.student_user

        # Login as accounting staff by setting session
        session = self.client.session
        session["user_id"] = self.accounting_user.user_id
        session.save()

    def test_setup_sanity(self):
        """Sanity check that users and balance objects exist."""
        self.assertEqual(User.objects.count(), 2)
        # Student balance is auto-created by signal
        bal = StudentBalance.objects.get(student=self.student_user)
        self.assertEqual(bal.outstanding_balance, Decimal("0.00"))

    def test_create_payment_outstanding_balance_update(self):
        """Test that creating a payment and applying it decreases the outstanding balance."""
        # 1. Create a charge of 100.00
        charge_resp = self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_user.user_id,
            "amount": "100.00",
            "transaction_type": "Charge",
            "category": "Tuition",
            "description": "Tuition fee"
        }, format="json")
        self.assertEqual(charge_resp.status_code, status.HTTP_201_CREATED)

        # Verify balance is 100
        self.student_user.refresh_from_db()
        self.assertEqual(self.student_user.balance.outstanding_balance, Decimal("100.00"))
        
        charge = StudentTransaction.objects.get(transaction_type="Charge")
        self.assertEqual(charge.remaining_balance, Decimal("100.00"))

        # 2. Create a payment of 40.00, allocating it to the charge
        payment_resp = self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_user.user_id,
            "amount": "40.00",
            "transaction_type": "Payment",
            "category": "Tuition Payment",
            "description": "Part payment",
            "allocations": [
                {"charge_id": charge.transaction_id, "amount": "40.00"}
            ]
        }, format="json")
        self.assertEqual(payment_resp.status_code, status.HTTP_201_CREATED)

        # Verify balance decreases to 60.00
        self.student_user.refresh_from_db()
        self.assertEqual(self.student_user.balance.outstanding_balance, Decimal("60.00"))

        # Verify charge remaining balance decreases to 60.00
        charge.refresh_from_db()
        self.assertEqual(charge.remaining_balance, Decimal("60.00"))

        # Verify payment remaining balance is 0.00
        payment = StudentTransaction.objects.get(transaction_type="Payment")
        self.assertEqual(payment.remaining_balance, Decimal("0.00"))

        # Verify allocation record
        alloc = TransactionAllocation.objects.get(payment=payment, charge=charge)
        self.assertEqual(alloc.amount_allocated, Decimal("40.00"))

    def test_payment_no_allocations(self):
        """Test payment created with no allocations doesn't change outstanding balance but increases credit."""
        # 1. Create a charge of 100.00
        self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_user.user_id,
            "amount": "100.00",
            "transaction_type": "Charge",
            "category": "Tuition"
        }, format="json")
        
        # 2. Create a payment of 40.00 without allocations
        self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_user.user_id,
            "amount": "40.00",
            "transaction_type": "Payment",
            "category": "General Payment"
        }, format="json")

        # Outstanding balance should still be 100.00
        self.student_user.refresh_from_db()
        self.assertEqual(self.student_user.balance.outstanding_balance, Decimal("100.00"))

        # Payment remaining balance (unused credit) should be 40.00
        payment = StudentTransaction.objects.get(transaction_type="Payment")
        self.assertEqual(payment.remaining_balance, Decimal("40.00"))

    def test_charge_auto_reallocate_credits(self):
        """
        Verify that posting a Charge with auto_reallocate=True auto-applies existing unused credits.
        Also verify that voiding the source payment restores the Charge balance correctly.
        """
        p1 = StudentTransaction.objects.create(
            student=self.student_user, amount=Decimal("100.00"), remaining_balance=Decimal("100.00"),
            transaction_type="Payment", category="Deposit", created_by=self.accounting_user
        )
        
        bal = StudentBalance.objects.get(student=self.student_user)
        bal.outstanding_balance = Decimal("0.00")
        bal.save()

        charge_resp = self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_user.user_id,
            "amount": "150.00",
            "transaction_type": "Charge",
            "category": "New Tuition",
            "auto_reallocate": True
        }, format="json")
        self.assertEqual(charge_resp.status_code, status.HTTP_201_CREATED)

        c1 = StudentTransaction.objects.get(category="New Tuition")
        p1.refresh_from_db()
        self.student_user.refresh_from_db()

        self.assertEqual(c1.remaining_balance, Decimal("50.00"), "Auto-reallocation should apply 100.00 to charge, leaving 50.00 remaining.")
        self.assertEqual(p1.remaining_balance, Decimal("0.00"), "Credit P1 should be fully consumed.")
        self.assertEqual(self.student_user.balance.outstanding_balance, Decimal("50.00"), "Student outstanding balance should be 50.00.")

        # Void source payment P1
        void_resp = self.client.patch(f"/api/accounting/transactions/{p1.transaction_id}/void/", {
            "reason": "Voiding P1"
        }, format="json")
        self.assertEqual(void_resp.status_code, status.HTTP_200_OK)

        c1.refresh_from_db()
        p1.refresh_from_db()
        self.student_user.refresh_from_db()

        self.assertFalse(c1.is_voided, "Charge should not be voided recursively.")
        self.assertEqual(c1.remaining_balance, Decimal("150.00"), "C1 remaining balance should be restored to 150.00.")
        self.assertEqual(self.student_user.balance.outstanding_balance, Decimal("150.00"), "Student outstanding balance should return to 150.00.")
        self.assertTrue(p1.is_voided, "Payment should be voided.")

    def test_cascade_voiding_reallocations_bug(self):
        """Test multi-reallocations and verification of voiding consistency/cascade voiding."""
        # Create two charges
        self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_user.user_id,
            "amount": "100.00",
            "transaction_type": "Charge",
            "category": "Tuition"
        }, format="json")
        self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_user.user_id,
            "amount": "100.00",
            "transaction_type": "Charge",
            "category": "Miscellaneous"
        }, format="json")
        c1 = StudentTransaction.objects.get(category="Tuition")
        c2 = StudentTransaction.objects.get(category="Miscellaneous")

        # Create two payments without allocations
        self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_user.user_id,
            "amount": "40.00",
            "transaction_type": "Payment",
            "category": "Payment 1"
        }, format="json")
        self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_user.user_id,
            "amount": "40.00",
            "transaction_type": "Payment",
            "category": "Payment 2"
        }, format="json")
        p1 = StudentTransaction.objects.get(category="Payment 1")
        p2 = StudentTransaction.objects.get(category="Payment 2")

        # Perform a reallocation of credits: 20.00 from P1 to C1, and 20.00 from P2 to C2 in one go
        realloc_resp = self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_user.user_id,
            "amount": "0.00",
            "transaction_type": "Payment",
            "category": "Reallocation Audit",
            "reallocations": [
                {"credit_id": p1.transaction_id, "charge_id": c1.transaction_id, "amount": "20.00"},
                {"credit_id": p2.transaction_id, "charge_id": c2.transaction_id, "amount": "20.00"}
            ]
        }, format="json")
        self.assertEqual(realloc_resp.status_code, status.HTTP_201_CREATED)

        # Student's outstanding balance should be 200 - 40 = 160.00
        self.student_user.refresh_from_db()
        self.assertEqual(self.student_user.balance.outstanding_balance, Decimal("160.00"))

        p1.refresh_from_db()
        p2.refresh_from_db()
        c1.refresh_from_db()
        c2.refresh_from_db()
        self.assertEqual(p1.remaining_balance, Decimal("20.00"))
        self.assertEqual(p2.remaining_balance, Decimal("20.00"))
        self.assertEqual(c1.remaining_balance, Decimal("80.00"))
        self.assertEqual(c2.remaining_balance, Decimal("80.00"))

        # Now void P1 (Payment 1)
        void_resp = self.client.patch(f"/api/accounting/transactions/{p1.transaction_id}/void/", {
            "reason": "Accidental payment entry"
        }, format="json")
        self.assertEqual(void_resp.status_code, status.HTTP_200_OK)

        # Check if C1 was restored by 20.00, outstanding increases by 20.00 (from 160 to 180)
        c1.refresh_from_db()
        self.assertEqual(c1.remaining_balance, Decimal("100.00"))
        self.student_user.refresh_from_db()
        self.assertEqual(self.student_user.balance.outstanding_balance, Decimal("180.00"))

        # Check the reallocation audit transaction
        realloc_tx = StudentTransaction.objects.get(category="Reallocation Audit")
        
        # P1 is voided, which triggers deleting of the P1 -> C1 allocation.
        # But wait! P2 -> C2 reallocation should STILL be active.
        # Since active allocations remain, the Reallocation Audit transaction should NOT be marked as voided.
        self.assertFalse(realloc_tx.is_voided, "Reallocation audit transaction should not be voided because active allocations remain.")
        
        # P2 -> C2 allocation should still exist
        p2_alloc_exists = TransactionAllocation.objects.filter(source_payment=p2, charge=c2).exists()
        self.assertTrue(p2_alloc_exists, "P2 -> C2 allocation should still exist because P2 is NOT voided.")

        # Let's check if C2 and P2 remaining balances are still correct
        c2.refresh_from_db()
        p2.refresh_from_db()
        self.assertEqual(c2.remaining_balance, Decimal("80.00"), "C2 remaining balance should still be 80.00")
        self.assertEqual(p2.remaining_balance, Decimal("20.00"), "P2 remaining balance should still be 20.00")

    def test_void_charge_with_reallocation(self):
        """Test creating a Charge transaction with reallocations, and voiding the Charge."""
        # 1. Create a payment P1 of 100 without allocation (credit)
        self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_user.user_id,
            "amount": "100.00",
            "transaction_type": "Payment",
            "category": "Deposit"
        }, format="json")
        p1 = StudentTransaction.objects.get(category="Deposit")

        # 2. Create another charge C2 (100)
        self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_user.user_id,
            "amount": "100.00",
            "transaction_type": "Charge",
            "category": "Old Charge"
        }, format="json")
        c2 = StudentTransaction.objects.get(category="Old Charge")

        # 3. Create a Charge C1 (100) and pass a reallocation from P1 to C2
        charge_resp = self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_user.user_id,
            "amount": "100.00",
            "transaction_type": "Charge",
            "category": "New Charge",
            "reallocations": [
                {"credit_id": p1.transaction_id, "charge_id": c2.transaction_id, "amount": "50.00"}
            ]
        }, format="json")
        self.assertEqual(charge_resp.status_code, status.HTTP_201_CREATED)
        c1 = StudentTransaction.objects.get(category="New Charge")

        # Verify C2 was partially paid by 50, and P1 credit is down to 50
        c2.refresh_from_db()
        p1.refresh_from_db()
        self.assertEqual(c2.remaining_balance, Decimal("50.00"))
        self.assertEqual(p1.remaining_balance, Decimal("50.00"))

        # Outstanding balance should be: C2 (50) + C1 (100) = 150.00
        self.student_user.refresh_from_db()
        self.assertEqual(self.student_user.balance.outstanding_balance, Decimal("150.00"))

        # Check allocation record. Its payment field points to C1 (a Charge!)
        alloc = TransactionAllocation.objects.get(source_payment=p1, charge=c2)
        self.assertEqual(alloc.payment, c1)

        # 4. Void C1 (the new Charge)
        void_resp = self.client.patch(f"/api/accounting/transactions/{c1.transaction_id}/void/", {
            "reason": "Duplicate charge"
        }, format="json")
        self.assertEqual(void_resp.status_code, status.HTTP_200_OK)

        # Outstanding balance should go back to C2 (100) = 100.00 since the reallocation is reverted
        self.student_user.refresh_from_db()
        self.assertEqual(self.student_user.balance.outstanding_balance, Decimal("100.00"))

        c2.refresh_from_db()
        p1.refresh_from_db()
        self.assertEqual(c2.remaining_balance, Decimal("100.00"), "C2 remaining balance should be restored to 100.00")
        self.assertEqual(p1.remaining_balance, Decimal("100.00"), "P1 remaining balance should be restored to 100.00")

        # Allocation record should be deleted when the audit transaction was voided
        alloc_exists = TransactionAllocation.objects.filter(source_payment=p1, charge=c2).exists()
        self.assertFalse(alloc_exists, "Allocation record should have been deleted when the audit transaction was voided.")

    def test_double_voiding_transaction(self):
        """Verify that double-voiding a transaction is blocked (400 Bad Request)."""
        c1 = StudentTransaction.objects.create(
            student=self.student_a, amount=Decimal("100.00"), remaining_balance=Decimal("100.00"),
            transaction_type="Charge", category="Tuition", created_by=self.accounting_user
        )
        bal = StudentBalance.objects.get(student=self.student_a)
        bal.outstanding_balance = Decimal("100.00")
        bal.save()

        # Void first time
        resp1 = self.client.patch(f"/api/accounting/transactions/{c1.transaction_id}/void/", {
            "reason": "First void"
        }, format="json")
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)

        # Void second time
        resp2 = self.client.patch(f"/api/accounting/transactions/{c1.transaction_id}/void/", {
            "reason": "Second void"
        }, format="json")
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_over_allocation_payment_amount(self):
        """Verify that allocating an amount larger than the payment's value caps the allocation correctly."""
        c1 = StudentTransaction.objects.create(
            student=self.student_a, amount=Decimal("100.00"), remaining_balance=Decimal("100.00"),
            transaction_type="Charge", category="Tuition", created_by=self.accounting_user
        )
        bal = StudentBalance.objects.get(student=self.student_a)
        bal.outstanding_balance = Decimal("100.00")
        bal.save()

        # Create payment of 50.00 but try to allocate 80.00
        resp = self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_a.user_id,
            "amount": "50.00",
            "transaction_type": "Payment",
            "category": "Deposit",
            "allocations": [
                {"charge_id": c1.transaction_id, "amount": "80.00"}
            ]
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

        c1.refresh_from_db()
        self.assertEqual(c1.remaining_balance, Decimal("50.00"), "Charge remaining balance should drop by exactly 50.00 (capped by payment amount)")
        
        # Verify outstanding balance drops by 50.00
        bal.refresh_from_db()
        self.assertEqual(bal.outstanding_balance, Decimal("50.00"))

    def test_over_reallocation_credit_balance(self):
        """Verify that reallocating an amount larger than the unused credit caps the reallocation correctly."""
        c1 = StudentTransaction.objects.create(
            student=self.student_a, amount=Decimal("100.00"), remaining_balance=Decimal("100.00"),
            transaction_type="Charge", category="Tuition", created_by=self.accounting_user
        )
        p1 = StudentTransaction.objects.create(
            student=self.student_a, amount=Decimal("30.00"), remaining_balance=Decimal("30.00"),
            transaction_type="Payment", category="Deposit", created_by=self.accounting_user
        )
        bal = StudentBalance.objects.get(student=self.student_a)
        bal.outstanding_balance = Decimal("100.00")
        bal.save()

        # Try to reallocate 50.00 from p1 to c1
        resp = self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_a.user_id,
            "amount": "0.00",
            "transaction_type": "Payment",
            "category": "Reallocation Audit",
            "reallocations": [
                {"credit_id": p1.transaction_id, "charge_id": c1.transaction_id, "amount": "50.00"}
            ]
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

        p1.refresh_from_db()
        c1.refresh_from_db()
        bal.refresh_from_db()

        self.assertEqual(p1.remaining_balance, Decimal("0.00"), "Credit should be fully consumed")
        self.assertEqual(c1.remaining_balance, Decimal("70.00"), "Charge remaining balance should drop by exactly 30.00")
        self.assertEqual(bal.outstanding_balance, Decimal("70.00"), "Outstanding balance should drop by exactly 30.00")

    def test_charge_paid_by_multiple_reallocations_voiding(self):
        """
        Verify that voiding a charge paid by multiple reallocations correctly restores the source payment's remaining balance
        and voids the reallocation audit transactions if they have no other allocations remaining.
        """
        c1 = StudentTransaction.objects.create(
            student=self.student_a, amount=Decimal("100.00"), remaining_balance=Decimal("100.00"),
            transaction_type="Charge", category="Tuition", created_by=self.accounting_user
        )
        p1 = StudentTransaction.objects.create(
            student=self.student_a, amount=Decimal("100.00"), remaining_balance=Decimal("100.00"),
            transaction_type="Payment", category="Deposit", created_by=self.accounting_user
        )
        bal = StudentBalance.objects.get(student=self.student_a)
        bal.outstanding_balance = Decimal("100.00")
        bal.save()

        # Reallocate 40.00 first
        resp1 = self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_a.user_id,
            "amount": "0.00",
            "transaction_type": "Payment",
            "category": "Reallocation Audit",
            "reallocations": [
                {"credit_id": p1.transaction_id, "charge_id": c1.transaction_id, "amount": "40.00"}
            ]
        }, format="json")
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)
        r1 = StudentTransaction.objects.get(category="Reallocation Audit", amount=Decimal("0.00"))

        # Reallocate 60.00 second
        resp2 = self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_a.user_id,
            "amount": "0.00",
            "transaction_type": "Payment",
            "category": "Reallocation Audit",
            "reallocations": [
                {"credit_id": p1.transaction_id, "charge_id": c1.transaction_id, "amount": "60.00"}
            ]
        }, format="json")
        self.assertEqual(resp2.status_code, status.HTTP_201_CREATED)
        r2 = StudentTransaction.objects.exclude(transaction_id=r1.transaction_id).get(category="Reallocation Audit", amount=Decimal("0.00"))

        # Now void C1
        void_resp = self.client.patch(f"/api/accounting/transactions/{c1.transaction_id}/void/", {
            "reason": "Voiding C1"
        }, format="json")
        self.assertEqual(void_resp.status_code, status.HTTP_200_OK)

        p1.refresh_from_db()
        r1.refresh_from_db()
        r2.refresh_from_db()
        bal.refresh_from_db()

        self.assertEqual(p1.remaining_balance, Decimal("100.00"), "P1 balance should be fully restored to 100.00")
        self.assertTrue(r1.is_voided, "R1 reallocation audit transaction should be voided")
        self.assertTrue(r2.is_voided, "R2 reallocation audit transaction should be voided")
        self.assertEqual(bal.outstanding_balance, Decimal("0.00"), "Student outstanding balance should remain 0.00")

    def test_void_target_charge_does_not_void_reallocation_audit(self):
        """
        Check if voiding a target charge voids the reallocation audit transaction
        when all of its allocations have been deleted/undone.
        Expected: The reallocation audit transaction should be marked as voided.
        """
        # 1. Create a charge C1 (100) and a payment P1 (40)
        c1 = StudentTransaction.objects.create(
            student=self.student_a, amount=Decimal("100.00"), remaining_balance=Decimal("100.00"),
            transaction_type="Charge", category="Tuition", created_by=self.accounting_user
        )
        p1 = StudentTransaction.objects.create(
            student=self.student_a, amount=Decimal("40.00"), remaining_balance=Decimal("40.00"),
            transaction_type="Payment", category="Deposit", created_by=self.accounting_user
        )
        bal = StudentBalance.objects.get(student=self.student_a)
        bal.outstanding_balance = Decimal("100.00")
        bal.save()

        # 2. Reallocate 20.00 from P1 to C1 (creating reallocation audit transaction R1)
        realloc_resp = self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_a.user_id,
            "amount": "0.00",
            "transaction_type": "Payment",
            "category": "Reallocation Audit",
            "reallocations": [
                {"credit_id": p1.transaction_id, "charge_id": c1.transaction_id, "amount": "20.00"}
            ]
        }, format="json")
        self.assertEqual(realloc_resp.status_code, status.HTTP_201_CREATED)
        
        r1 = StudentTransaction.objects.get(category="Reallocation Audit")
        
        # 3. Void C1 (the target charge)
        void_resp = self.client.patch(f"/api/accounting/transactions/{c1.transaction_id}/void/", {
            "reason": "Voiding target charge C1"
        }, format="json")
        self.assertEqual(void_resp.status_code, status.HTTP_200_OK)

        r1.refresh_from_db()
        self.assertTrue(r1.is_voided, "Reallocation audit transaction should be voided when its only allocation is undone via target charge voiding")

    def test_bulk_charge_course_filter(self):
        """Test bulk charge targeting a specific course, charging only enrolled students."""
        # 1. Create a CourseSchoolYear and Course
        school_year = CourseSchoolYear.objects.create(school_year="2026-2027")
        instructor = User.objects.create(
            user_id=2026004,
            email="instructor_test@test.com",
            user_type="Instructor"
        )
        course = Course.objects.create(
            course_title="Accounting 101",
            course_code="ACC101",
            description="Intro to Accounting",
            instructor=instructor,
            school_year=school_year
        )

        # 2. Create another student who is NOT enrolled
        student_unrelated = User.objects.create(
            user_id=2026005,
            email="student_unrelated@test.com",
            user_type="Student"
        )

        # Enroll self.student_user in course
        Enrollment.objects.create(student=self.student_user, course=course)

        # 3. Post a bulk charge targeting the course
        resp = self.client.post("/api/accounting/bulk-charge/", {
            "target": "Course",
            "course_id": course.course_id,
            "amount": "250.00",
            "category": "Lab Fee",
            "description": "Lab fee for ACC101"
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIn("1 students", resp.data.get("detail", ""))

        # 4. Verify student_user is charged
        self.student_user.refresh_from_db()
        self.assertEqual(self.student_user.balance.outstanding_balance, Decimal("250.00"))
        
        tx = StudentTransaction.objects.get(student=self.student_user, category="Lab Fee")
        self.assertEqual(tx.amount, Decimal("250.00"))
        self.assertEqual(tx.remaining_balance, Decimal("250.00"))

        # 5. Verify student_unrelated is NOT charged
        student_unrelated.refresh_from_db()
        self.assertEqual(student_unrelated.balance.outstanding_balance, Decimal("0.00"))
        self.assertFalse(StudentTransaction.objects.filter(student=student_unrelated, category="Lab Fee").exists())

    def test_bulk_charge_auto_reallocate_credits(self):
        """Test bulk charge with auto_reallocate=True auto-applies existing unused credits."""
        # 1. Create a payment of 100.00 (credit) for student_a
        p1 = StudentTransaction.objects.create(
            student=self.student_a,
            amount=Decimal("100.00"),
            remaining_balance=Decimal("100.00"),
            transaction_type="Payment",
            category="Deposit",
            created_by=self.accounting_user
        )
        bal = StudentBalance.objects.get(student=self.student_a)
        bal.outstanding_balance = Decimal("0.00")
        bal.save()

        # 2. Post bulk charge of 150.00 with auto_reallocate=True (default is True)
        resp = self.client.post("/api/accounting/bulk-charge/", {
            "amount": "150.00",
            "category": "Tuition",
            "description": "Bulk charge auto-reallocate",
            "auto_reallocate": True
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

        # 3. Verify credit p1 is consumed and charge remaining is reduced
        c1 = StudentTransaction.objects.get(student=self.student_a, category="Tuition")
        p1.refresh_from_db()
        self.student_a.refresh_from_db()

        self.assertEqual(c1.remaining_balance, Decimal("50.00"))
        self.assertEqual(p1.remaining_balance, Decimal("0.00"))
        self.assertEqual(self.student_a.balance.outstanding_balance, Decimal("50.00"))

        # Verify allocation record
        alloc_exists = TransactionAllocation.objects.filter(source_payment=p1, charge=c1).exists()
        self.assertTrue(alloc_exists)

        # 4. Post another bulk charge of 150.00 but with auto_reallocate=False
        # First create another payment credit of 50.00
        p2 = StudentTransaction.objects.create(
            student=self.student_a,
            amount=Decimal("50.00"),
            remaining_balance=Decimal("50.00"),
            transaction_type="Payment",
            category="Deposit 2",
            created_by=self.accounting_user
        )
        
        # Post bulk charge with auto_reallocate=False
        resp2 = self.client.post("/api/accounting/bulk-charge/", {
            "amount": "150.00",
            "category": "Tuition 2",
            "description": "Bulk charge without auto-reallocate",
            "auto_reallocate": False
        }, format="json")
        self.assertEqual(resp2.status_code, status.HTTP_201_CREATED)

        # Verify charge is NOT paid by credits
        c2 = StudentTransaction.objects.get(student=self.student_a, category="Tuition 2")
        p2.refresh_from_db()
        self.student_a.refresh_from_db()

        self.assertEqual(c2.remaining_balance, Decimal("150.00"))
        self.assertEqual(p2.remaining_balance, Decimal("50.00"))
        self.assertEqual(self.student_a.balance.outstanding_balance, Decimal("200.00"))


class AccountingConcurrencyTest(APITransactionTestCase):
    def setUp(self):
        # Create Accounting staff
        self.accounting_user = User.objects.create(
            user_id=2026001,
            email="accounting@test.com",
            user_type="Accounting"
        )
        self.accounting_user.set_password("password123")
        self.accounting_user.save()

        # Create Student
        self.student_user = User.objects.create(
            user_id=2026002,
            email="student@test.com",
            user_type="Student"
        )
        self.student_user.set_password("password123")
        self.student_user.save()

        # Login as accounting staff by setting session
        session = self.client.session
        session["user_id"] = self.accounting_user.user_id
        session.save()

    def test_concurrency_race_condition_outstanding_balance(self):
        """
        Simulate concurrent charge postings for a single student to check if race conditions
        on updating outstanding_balance can occur.
        """
        # Ensure database connections are managed properly across threads
        def post_charge():
            from django.test import Client
            client = Client()
            session = client.session
            session["user_id"] = self.accounting_user.user_id
            session.save()

            client.post("/api/accounting/transactions/", {
                "student_id": self.student_user.user_id,
                "amount": "10.00",
                "transaction_type": "Charge",
                "category": "Tuition"
            }, content_type="application/json")

            from django.db import connections
            connections.close_all()

        threads = []
        # Spawn 5 concurrent threads to charge the student 10.00 each
        for _ in range(5):
            t = threading.Thread(target=post_charge)
            threads.append(t)
            t.start()

        for t in threads:
            t.join()

        # Refresh student balance from db
        bal = StudentBalance.objects.get(student=self.student_user)
        self.assertEqual(bal.outstanding_balance, Decimal("50.00"), "Final outstanding balance should be 50.00 under concurrent requests (no lost updates)")
