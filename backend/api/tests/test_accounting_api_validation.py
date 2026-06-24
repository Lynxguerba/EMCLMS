from rest_framework.test import APITestCase
from rest_framework import status
from api.models import User, StudentBalance, StudentTransaction, AccountingFee
from decimal import Decimal

class AccountingApiValidationTest(APITestCase):
    def setUp(self):
        # Create Accounting staff
        self.accounting_user = User.objects.create(
            user_id=2026001,
            email="accounting@test.com",
            user_type="Accounting"
        )
        self.accounting_user.set_password("password123")
        self.accounting_user.save()

        # Create Student A
        self.student_a = User.objects.create(
            user_id=2026002,
            email="student_a@test.com",
            user_type="Student",
            program="AB-Theology"
        )
        self.student_a.set_password("password123")
        self.student_a.save()

        # Create Student B
        self.student_b = User.objects.create(
            user_id=2026003,
            email="student_b@test.com",
            user_type="Student"
        )
        self.student_b.set_password("password123")
        self.student_b.save()

        # Login as accounting staff
        session = self.client.session
        session["user_id"] = self.accounting_user.user_id
        session.save()

    def test_fee_creation_negative_and_zero_amount(self):
        """Check if fee creation endpoint allows negative or zero amounts."""
        resp_neg = self.client.post("/api/accounting/fees/", {
            "name": "Negative Fee",
            "amount": "-10.00",
            "status": "Active"
        }, format="json")

        resp_zero = self.client.post("/api/accounting/fees/", {
            "name": "Zero Fee",
            "amount": "0.00",
            "status": "Active"
        }, format="json")

        self.assertEqual(resp_neg.status_code, status.HTTP_400_BAD_REQUEST, "Fee creation should not allow negative amounts")
        self.assertEqual(resp_zero.status_code, status.HTTP_400_BAD_REQUEST, "Fee creation should not allow zero amounts")

    def test_fee_update_negative_or_zero_amount(self):
        """Verify updating a fee with a negative/zero amount is correctly rejected (400 Bad Request)."""
        fee = AccountingFee.objects.create(
            name="Tuition Fee",
            amount=Decimal("100.00"),
            status="Active"
        )

        resp_neg = self.client.put(f"/api/accounting/fees/{fee.fee_id}/", {
            "amount": "-50.00"
        }, format="json")
        self.assertEqual(resp_neg.status_code, status.HTTP_400_BAD_REQUEST)

        resp_zero = self.client.put(f"/api/accounting/fees/{fee.fee_id}/", {
            "amount": "0.00"
        }, format="json")
        self.assertEqual(resp_zero.status_code, status.HTTP_400_BAD_REQUEST)

    def test_bulk_charge_negative_and_zero_amount(self):
        """Check if bulk charge endpoint allows negative or zero amounts."""
        resp_neg = self.client.post("/api/accounting/bulk-charge/", {
            "program": "All Programs",
            "amount": "-50.00",
            "category": "Tuition",
            "description": "Negative bulk charge"
        }, format="json")
        
        resp_zero = self.client.post("/api/accounting/bulk-charge/", {
            "program": "All Programs",
            "amount": "0.00",
            "category": "Tuition",
            "description": "Zero bulk charge"
        }, format="json")

        self.assertEqual(resp_neg.status_code, status.HTTP_400_BAD_REQUEST, "Bulk charge should not allow negative amounts")
        self.assertEqual(resp_zero.status_code, status.HTTP_400_BAD_REQUEST, "Bulk charge should not allow zero amounts")

    def test_bulk_charge_empty_program(self):
        """Verify bulk-charging an empty program is handled gracefully without errors."""
        resp = self.client.post("/api/accounting/bulk-charge/", {
            "program": "Master of Divinity programs",  # Student A is in AB-Theology
            "amount": "100.00",
            "category": "Miscellaneous",
            "description": "Empty bulk charge"
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIn("0 students", resp.data.get("detail", ""))

    def test_transaction_amount_overflow(self):
        """Check if submitting a transaction with an extremely large amount causes a 500 error."""
        resp = self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_a.user_id,
            "amount": "999999999999.00",
            "transaction_type": "Charge",
            "category": "Tuition",
            "description": "Overflow charge"
        }, format="json")

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST, "Extremely large amount should return 400 Bad Request instead of 500")

    def test_fee_update_invalid_amount_value_error(self):
        """Test that updating a fee with an invalid/non-numeric amount does not crash with a 500 error."""
        fee = AccountingFee.objects.create(
            name="Test Fee",
            amount=Decimal("100.00"),
            status="Active"
        )

        resp = self.client.put(f"/api/accounting/fees/{fee.fee_id}/", {
            "name": "Updated Fee",
            "amount": "abc",
            "status": "Active"
        }, format="json")

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST, "Invalid fee amount should return 400 Bad Request instead of causing a 500 error")

    def test_transaction_creation_invalid_student_id(self):
        """Test that submitting a transaction with a non-numeric student_id does not cause a 500 error."""
        resp = self.client.post("/api/accounting/transactions/", {
            "student_id": "abc",
            "amount": "100.00",
            "transaction_type": "Charge",
            "category": "Tuition"
        }, format="json")

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST, "Non-numeric student_id should return a 400 Bad Request, not 500")

    def test_transaction_creation_invalid_charge_id_in_allocations(self):
        """Test that submitting a payment with a non-numeric charge_id in allocations does not cause a 500 error."""
        resp = self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_a.user_id,
            "amount": "100.00",
            "transaction_type": "Payment",
            "category": "Tuition Payment",
            "allocations": [
                {"charge_id": "invalid_charge_id", "amount": "40.00"}
            ]
        }, format="json")

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST, "Non-numeric charge_id in allocations should return a 400 Bad Request, not 500")

    def test_transaction_creation_invalid_reallocations_ids(self):
        """Test that submitting a transaction with non-numeric credit_id or charge_id in reallocations does not cause a 500 error."""
        resp = self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_a.user_id,
            "amount": "0.00",
            "transaction_type": "Payment",
            "category": "Reallocation Audit",
            "reallocations": [
                {"credit_id": "invalid_credit_id", "charge_id": "invalid_charge_id", "amount": "20.00"}
            ]
        }, format="json")

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST, "Non-numeric IDs in reallocations should return a 400 Bad Request, not 500")

    def test_allocation_invalid_amount_value_error(self):
        """Check if submitting a payment with a non-numeric amount in allocations causes a 500 error."""
        charge = StudentTransaction.objects.create(
            student=self.student_a, amount=Decimal("100.00"), remaining_balance=Decimal("100.00"),
            transaction_type="Charge", category="Tuition", created_by=self.accounting_user
        )

        try:
            resp = self.client.post("/api/accounting/transactions/", {
                "student_id": self.student_a.user_id,
                "amount": "50.00",
                "transaction_type": "Payment",
                "category": "Tuition Payment",
                "allocations": [
                    {"charge_id": charge.transaction_id, "amount": "invalid_amount"}
                ]
            }, format="json")
            self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST, 
                             "Invalid allocation amount should return 400 Bad Request instead of causing a 500 error")
        except Exception as e:
            self.fail(f"Uncaught exception raised during invalid allocation amount post: {type(e).__name__}: {e}")

    def test_reallocation_invalid_amount_value_error(self):
        """Check if submitting a reallocation with a non-numeric amount causes a 500 error."""
        charge = StudentTransaction.objects.create(
            student=self.student_a, amount=Decimal("100.00"), remaining_balance=Decimal("100.00"),
            transaction_type="Charge", category="Tuition", created_by=self.accounting_user
        )
        payment = StudentTransaction.objects.create(
            student=self.student_a, amount=Decimal("50.00"), remaining_balance=Decimal("50.00"),
            transaction_type="Payment", category="Deposit", created_by=self.accounting_user
        )

        try:
            resp = self.client.post("/api/accounting/transactions/", {
                "student_id": self.student_a.user_id,
                "amount": "0.00",
                "transaction_type": "Payment",
                "category": "Reallocation Audit",
                "reallocations": [
                    {"credit_id": payment.transaction_id, "charge_id": charge.transaction_id, "amount": "invalid_amount"}
                ]
            }, format="json")
            self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST, 
                             "Invalid reallocation amount should return 400 Bad Request instead of causing a 500 error")
        except Exception as e:
            self.fail(f"Uncaught exception raised during invalid reallocation amount post: {type(e).__name__}: {e}")

    def test_negative_payment_with_reallocations_blocked(self):
        """
        Providing a negative amount for a Payment transaction is blocked even if reallocations are provided,
        preventing potential negative remaining balances.
        """
        c1 = StudentTransaction.objects.create(
            student=self.student_a, amount=Decimal("100.00"), remaining_balance=Decimal("100.00"),
            transaction_type="Charge", category="Tuition", created_by=self.accounting_user
        )
        p1 = StudentTransaction.objects.create(
            student=self.student_a, amount=Decimal("50.00"), remaining_balance=Decimal("50.00"),
            transaction_type="Payment", category="Deposit", created_by=self.accounting_user
        )

        # Post negative payment with reallocation
        resp = self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_a.user_id,
            "amount": "-50.00",
            "transaction_type": "Payment",
            "category": "Negative Payment",
            "reallocations": [
                {"credit_id": p1.transaction_id, "charge_id": c1.transaction_id, "amount": "20.00"}
            ]
        }, format="json")
        
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(StudentTransaction.objects.filter(category="Negative Payment").exists())

    def test_arbitrary_transaction_type_blocked(self):
        """The system validates transaction types against allowed Choices, blocking arbitrary values like 'Exploit'."""
        resp = self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_a.user_id,
            "amount": "100.00",
            "transaction_type": "Exploit",
            "category": "Malicious Activity"
        }, format="json")
        
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(StudentTransaction.objects.filter(category="Malicious Activity").exists())

    def test_validation_boundary_conditions(self):
        """Test various validation failures and edge cases."""
        # 1. Negative amount for Charge
        resp = self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_a.user_id,
            "amount": "-50.00",
            "transaction_type": "Charge",
            "category": "Tuition"
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

        # 2. Negative amount for Payment
        resp = self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_a.user_id,
            "amount": "-20.00",
            "transaction_type": "Payment",
            "category": "Tuition"
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. 0.00 Payment without reallocations
        resp = self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_a.user_id,
            "amount": "0.00",
            "transaction_type": "Payment",
            "category": "Tuition"
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

        # 4. Invalid amount format
        resp = self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_a.user_id,
            "amount": "abc",
            "transaction_type": "Charge",
            "category": "Tuition"
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

        # 5. Non-existent student
        resp = self.client.post("/api/accounting/transactions/", {
            "student_id": 999999,
            "amount": "100.00",
            "transaction_type": "Charge",
            "category": "Tuition"
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

        # 6. Missing required fields
        resp = self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_a.user_id,
            "transaction_type": "Charge",
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_void_errors(self):
        """Test errors when voiding transactions."""
        self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_a.user_id,
            "amount": "100.00",
            "transaction_type": "Charge",
            "category": "Tuition"
        }, format="json")
        tx = StudentTransaction.objects.get(category="Tuition")

        # 1. Void non-existent transaction
        resp = self.client.patch("/api/accounting/transactions/999999/void/", {
            "reason": "Test"
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

        # 2. Void with missing reason
        resp = self.client.patch(f"/api/accounting/transactions/{tx.transaction_id}/void/", {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Void already voided transaction
        self.client.patch(f"/api/accounting/transactions/{tx.transaction_id}/void/", {
            "reason": "Test"
        }, format="json")
        resp = self.client.patch(f"/api/accounting/transactions/{tx.transaction_id}/void/", {
            "reason": "Test again"
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_direct_cross_student_payment_allocation(self):
        """Verify if Student A's payment can be directly allocated to Student B's charge."""
        charge_b = StudentTransaction.objects.create(
            student=self.student_b, amount=Decimal("100.00"), remaining_balance=Decimal("100.00"),
            transaction_type="Charge", category="Tuition B", created_by=self.accounting_user
        )
        bal_b = StudentBalance.objects.get(student=self.student_b)
        bal_b.outstanding_balance = Decimal("100.00")
        bal_b.save()

        # Create a payment for Student A, but allocate it to Student B's charge
        resp = self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_a.user_id,
            "amount": "100.00",
            "transaction_type": "Payment",
            "category": "Payment A",
            "allocations": [
                {"charge_id": charge_b.transaction_id, "amount": "60.00"}
            ]
        }, format="json")

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

        # Check that Student B's charge was not paid
        charge_b.refresh_from_db()
        self.assertEqual(charge_b.remaining_balance, Decimal("100.00"), "Student B's charge should remain 100.00.")

        # Check that Student A's payment was not created
        self.assertFalse(StudentTransaction.objects.filter(category="Payment A").exists())

        # Check global outstanding balances remain correct
        self.student_a.refresh_from_db()
        self.student_b.refresh_from_db()
        
        self.assertEqual(self.student_a.balance.outstanding_balance, Decimal("0.00"))
        self.assertEqual(self.student_b.balance.outstanding_balance, Decimal("100.00"))

    def test_cross_student_credit_reallocation_blocked(self):
        """Credits cannot be reallocated between different students."""
        p1_student_a = StudentTransaction.objects.create(
            student=self.student_a, amount=Decimal("100.00"), remaining_balance=Decimal("100.00"),
            transaction_type="Payment", category="Deposit A", created_by=self.accounting_user
        )

        c1_student_b = StudentTransaction.objects.create(
            student=self.student_b, amount=Decimal("100.00"), remaining_balance=Decimal("100.00"),
            transaction_type="Charge", category="Tuition B", created_by=self.accounting_user
        )

        # Student B's outstanding balance initial
        bal_b = StudentBalance.objects.get(student=self.student_b)
        bal_b.outstanding_balance = Decimal("100.00")
        bal_b.save()

        # Create reallocation from Student A's credit to Student B's charge under Student B's account
        resp = self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_b.user_id,
            "amount": "0.00",
            "transaction_type": "Payment",
            "category": "Cross-Student Realloc",
            "reallocations": [
                {"credit_id": p1_student_a.transaction_id, "charge_id": c1_student_b.transaction_id, "amount": "50.00"}
            ]
        }, format="json")
        
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        
        p1_student_a.refresh_from_db()
        c1_student_b.refresh_from_db()
        
        self.assertEqual(p1_student_a.remaining_balance, Decimal("100.00"), "Student A's credit should not be modified.")
        self.assertEqual(c1_student_b.remaining_balance, Decimal("100.00"), "Student B's charge should not be modified.")

    def test_fractional_amount_precision_loss(self):
        """Check if submitting a transaction with fractional amounts (e.g. 100.005) is handled properly."""
        resp = self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_a.user_id,
            "amount": "100.005",
            "transaction_type": "Charge",
            "category": "Tuition"
        }, format="json")

        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        
        tx = StudentTransaction.objects.get(category="Tuition")
        bal = StudentBalance.objects.get(student=self.student_a)
        
        # Check if they are equal
        self.assertEqual(tx.amount, tx.remaining_balance, "Amount and remaining balance must be equal")
        self.assertEqual(bal.outstanding_balance, tx.amount, "Student balance must match transaction amount")

    def test_bulk_charge_amount_overflow(self):
        """Check if submitting a bulk charge with an extremely large amount is rejected."""
        resp = self.client.post("/api/accounting/bulk-charge/", {
            "program": "All Programs",
            "amount": "100000000.00",
            "category": "Tuition",
            "description": "Overflow bulk charge"
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_bulk_charge_invalid_program(self):
        """Verify that bulk-charging with an invalid program name is rejected."""
        resp = self.client.post("/api/accounting/bulk-charge/", {
            "target": "Program",
            "program": "Invalid Program Name",
            "amount": "100.00",
            "category": "Tuition"
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_bulk_charge_invalid_course_id(self):
        """Verify that targeting an invalid or non-existent course_id is rejected."""
        # Non-numeric
        resp_nan = self.client.post("/api/accounting/bulk-charge/", {
            "target": "Course",
            "course_id": "not_an_int",
            "amount": "100.00",
            "category": "Tuition"
        }, format="json")
        self.assertEqual(resp_nan.status_code, status.HTTP_400_BAD_REQUEST)

        # Non-existent ID
        resp_missing = self.client.post("/api/accounting/bulk-charge/", {
            "target": "Course",
            "course_id": 999999,
            "amount": "100.00",
            "category": "Tuition"
        }, format="json")
        self.assertEqual(resp_missing.status_code, status.HTTP_404_NOT_FOUND)

    def test_bulk_charge_missing_required_fields(self):
        """Verify that missing amount or category returns 400 Bad Request."""
        resp = self.client.post("/api/accounting/bulk-charge/", {
            "category": "Tuition"
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

        resp2 = self.client.post("/api/accounting/bulk-charge/", {
            "amount": "100.00"
        }, format="json")
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)
