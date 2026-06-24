from rest_framework.test import APITestCase
from rest_framework import status
from api.models import User, StudentBalance, StudentTransaction, TransactionAllocation
from decimal import Decimal
from django.utils import timezone
import datetime

class AccountingLedgerViewsTest(APITestCase):
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

    def test_student_ledger_summary_last_payment(self):
        """
        Check if reallocation audit transactions (which are 0.00 Payments)
        wrongfully overwrite the 'last_payment_amount' and 'last_payment_date'
        in the student ledger summary response.
        """
        # 1. Login as accounting staff to set up transactions
        session = self.client.session
        session["user_id"] = self.accounting_user.user_id
        session.save()

        # 2. Create Charge 1 (100.00)
        self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_user.user_id,
            "amount": "100.00",
            "transaction_type": "Charge",
            "category": "Tuition",
            "description": "Tuition fee"
        }, format="json")
        c1 = StudentTransaction.objects.get(category="Tuition")

        # 3. Create actual Payment (50.00)
        self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_user.user_id,
            "amount": "50.00",
            "transaction_type": "Payment",
            "category": "Tuition Payment",
            "description": "Part payment"
        }, format="json")
        p1 = StudentTransaction.objects.get(category="Tuition Payment")

        # Let's adjust the created_at of p1 to be slightly in the past
        p1.created_at = timezone.now() - datetime.timedelta(hours=1)
        p1.save()

        # 4. Create Charge 2 (100.00)
        self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_user.user_id,
            "amount": "100.00",
            "transaction_type": "Charge",
            "category": "Miscellaneous",
            "description": "Miscellaneous fee"
        }, format="json")
        c2 = StudentTransaction.objects.get(category="Miscellaneous")

        # 5. Perform Reallocation of 20.00 from P1 to C2
        self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_user.user_id,
            "amount": "0.00",
            "transaction_type": "Payment",
            "category": "Reallocation Audit",
            "reallocations": [
                {"credit_id": p1.transaction_id, "charge_id": c2.transaction_id, "amount": "20.00"}
            ]
        }, format="json")
        
        # 6. Login as student
        session = self.client.session
        session["user_id"] = self.student_user.user_id
        session.save()

        # 7. Retrieve student ledger summary
        resp = self.client.get("/api/student/ledger/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        last_payment_amount = resp.data.get("last_payment_amount")
        
        # Assert that the last payment is the actual 50.00 payment, not the 0.00 reallocation audit!
        self.assertEqual(float(last_payment_amount), 50.00, 
                         "Bug: Reallocation audit transaction wrongfully overwrote student's last payment amount!")

    def test_accounting_students_list_last_payment(self):
        """
        Check if reallocation audit transactions (which are 0.00 Payments)
        wrongfully overwrite the 'last_payment' date in the accounting students list view.
        """
        # 1. Login as accounting staff
        session = self.client.session
        session["user_id"] = self.accounting_user.user_id
        session.save()

        # 2. Create Charge (100.00)
        self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_user.user_id,
            "amount": "100.00",
            "transaction_type": "Charge",
            "category": "Tuition"
        }, format="json")
        c1 = StudentTransaction.objects.get(category="Tuition")

        # 3. Create actual Payment (50.00)
        self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_user.user_id,
            "amount": "50.00",
            "transaction_type": "Payment",
            "category": "Tuition Payment"
        }, format="json")
        p1 = StudentTransaction.objects.get(category="Tuition Payment")

        # Set payment in the past
        payment_time = timezone.now() - datetime.timedelta(hours=1)
        p1.created_at = payment_time
        p1.save()

        # 4. Create Reallocation Audit (amount 0.00)
        self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_user.user_id,
            "amount": "0.00",
            "transaction_type": "Payment",
            "category": "Reallocation Audit",
            "reallocations": [
                {"credit_id": p1.transaction_id, "charge_id": c1.transaction_id, "amount": "10.00"}
            ]
        }, format="json")

        # 5. Fetch students list
        resp = self.client.get("/api/accounting/students/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        student_data = [s for s in resp.data if s["id"] == self.student_user.user_id][0]
        last_payment_date_str = student_data.get("last_payment")

        # Assert that the last payment date matches the actual payment, not the reallocation audit
        actual_payment_dt = timezone.datetime.fromisoformat(last_payment_date_str)
        expected_payment_dt = payment_time
        
        self.assertAlmostEqual(actual_payment_dt.timestamp(), expected_payment_dt.timestamp(), delta=5,
                               msg="Bug: Reallocation audit transaction wrongfully overwrote last payment date in students list!")

    def test_student_ledger_excludes_zero_amount_transactions(self):
        """
        Verify that the student ledger summary response excludes transactions with amount = 0.00
        (such as Reallocation Audits).
        """
        # 1. Login as accounting staff
        session = self.client.session
        session["user_id"] = self.accounting_user.user_id
        session.save()

        # 2. Create Charge (100.00)
        self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_user.user_id,
            "amount": "100.00",
            "transaction_type": "Charge",
            "category": "Tuition"
        }, format="json")
        c1 = StudentTransaction.objects.get(category="Tuition")

        # 3. Create Payment (50.00)
        self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_user.user_id,
            "amount": "50.00",
            "transaction_type": "Payment",
            "category": "Tuition Payment"
        }, format="json")
        p1 = StudentTransaction.objects.get(category="Tuition Payment")

        # 4. Create Reallocation Audit (amount 0.00)
        self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_user.user_id,
            "amount": "0.00",
            "transaction_type": "Payment",
            "category": "Reallocation Audit",
            "reallocations": [
                {"credit_id": p1.transaction_id, "charge_id": c1.transaction_id, "amount": "10.00"}
            ]
        }, format="json")

        # 5. Login as student
        session = self.client.session
        session["user_id"] = self.student_user.user_id
        session.save()

        # 6. Fetch student ledger summary
        resp = self.client.get("/api/student/ledger/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        transactions_list = resp.data.get("transactions", [])
        
        # Verify that the Reallocation Audit (amount 0.00) is NOT in the transactions list
        zero_amount_txs = [tx for tx in transactions_list if float(tx["amount"]) == 0.00]
        
        self.assertEqual(len(zero_amount_txs), 0, 
                         "Bug: Reallocation audit or zero-amount transactions should not be visible in student ledger transactions list!")

    def test_student_ledger_returns_allocations(self):
        """
        Verify that the student ledger summary returns allocations detail:
        - A payment lists the charges it paid (including reallocations).
        - A charge lists the payments that paid it off (displaying original payment category even if reallocated).
        """
        # 1. Login as accounting staff
        session = self.client.session
        session["user_id"] = self.accounting_user.user_id
        session.save()

        # 2. Create Charge 1 (100.00, category Tuition)
        self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_user.user_id,
            "amount": "100.00",
            "transaction_type": "Charge",
            "category": "Tuition"
        }, format="json")
        c1 = StudentTransaction.objects.get(category="Tuition")

        # 3. Create Payment (50.00, category Deposit)
        self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_user.user_id,
            "amount": "50.00",
            "transaction_type": "Payment",
            "category": "Deposit"
        }, format="json")
        p1 = StudentTransaction.objects.get(category="Deposit")

        # 4. Perform Reallocation of 20.00 from Deposit to Tuition
        self.client.post("/api/accounting/transactions/", {
            "student_id": self.student_user.user_id,
            "amount": "0.00",
            "transaction_type": "Payment",
            "category": "Reallocation Audit",
            "reallocations": [
                {"credit_id": p1.transaction_id, "charge_id": c1.transaction_id, "amount": "20.00"}
            ]
        }, format="json")

        # 5. Login as student
        session = self.client.session
        session["user_id"] = self.student_user.user_id
        session.save()

        # 6. Fetch student ledger summary
        resp = self.client.get("/api/student/ledger/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        transactions_list = resp.data.get("transactions", [])
        
        # 7. Find Tuition charge in response
        tuition_tx = [tx for tx in transactions_list if tx["category"] == "Tuition"][0]
        # Should show paid by "Deposit" 20.00
        self.assertEqual(len(tuition_tx["allocations"]), 1)
        self.assertEqual(tuition_tx["allocations"][0]["category"], "Deposit")
        self.assertEqual(float(tuition_tx["allocations"][0]["amount"]), 20.00)

        # 8. Find Deposit payment in response
        deposit_tx = [tx for tx in transactions_list if tx["category"] == "Deposit"][0]
        # Should show applied to "Tuition" 20.00
        self.assertEqual(len(deposit_tx["allocations"]), 1)
        self.assertEqual(deposit_tx["allocations"][0]["category"], "Tuition")
        self.assertEqual(float(deposit_tx["allocations"][0]["amount"]), 20.00)

    def test_identical_timestamp_ordering_in_ledger(self):
        """
        Check if transactions with identical created_at timestamps can cause running balance vs outstanding balance discrepancy.
        """
        # Create a student balance
        bal = StudentBalance.objects.get(student=self.student_user)
        bal.outstanding_balance = Decimal("200.00")
        bal.save()

        # Create two charges and a payment with the EXACT SAME timestamp
        now = timezone.now()
        
        c1 = StudentTransaction.objects.create(
            student=self.student_user, amount=Decimal("100.00"), remaining_balance=Decimal("100.00"),
            transaction_type="Charge", category="Tuition", created_by=self.accounting_user,
            created_at=now
        )
        c2 = StudentTransaction.objects.create(
            student=self.student_user, amount=Decimal("100.00"), remaining_balance=Decimal("100.00"),
            transaction_type="Charge", category="Miscellaneous", created_by=self.accounting_user,
            created_at=now
        )
        
        # Payment that pays 50.00 of C1
        p1 = StudentTransaction.objects.create(
            student=self.student_user, amount=Decimal("50.00"), remaining_balance=Decimal("0.00"),
            transaction_type="Payment", category="Tuition Payment", created_by=self.accounting_user,
            created_at=now
        )
        
        # Allocate the payment
        TransactionAllocation.objects.create(
            payment=p1,
            charge=c1,
            amount_allocated=Decimal("50.00")
        )
        c1.remaining_balance = Decimal("50.00")
        c1.save()

        bal.outstanding_balance = Decimal("150.00")
        bal.save()

        # Retrieve the ledger
        session = self.client.session
        session["user_id"] = self.accounting_user.user_id
        session.save()
        resp = self.client.get(f"/api/accounting/students/{self.student_user.user_id}/ledger/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        outstanding_bal = resp.data["balance"]
        ledger_list = resp.data["ledger"]

        # Ensure latest running balance matches the outstanding balance
        latest_running_balance = ledger_list[0]["running_balance"] if ledger_list else 0.0
        self.assertEqual(Decimal(str(outstanding_bal)), Decimal(str(latest_running_balance)),
                         "Outstanding balance and running balance in ledger should match even with identical timestamps!")

    def test_multi_reallocation_cascade_voiding_ledger_discrepancy(self):
        """
        Multi-reallocation cascade voiding discrepancy.
        Voiding one source payment marks the entire reallocation audit transaction
        as voided, but leaves the other allocation active, causing running balance vs outstanding balance discrepancy.
        """
        # Setup as accounting staff
        session = self.client.session
        session["user_id"] = self.accounting_user.user_id
        session.save()

        c1 = StudentTransaction.objects.create(
            student=self.student_user, amount=Decimal("100.00"), remaining_balance=Decimal("100.00"),
            transaction_type="Charge", category="Tuition", created_by=self.accounting_user
        )
        c2 = StudentTransaction.objects.create(
            student=self.student_user, amount=Decimal("100.00"), remaining_balance=Decimal("100.00"),
            transaction_type="Charge", category="Miscellaneous", created_by=self.accounting_user
        )
        
        p1 = StudentTransaction.objects.create(
            student=self.student_user, amount=Decimal("40.00"), remaining_balance=Decimal("40.00"),
            transaction_type="Payment", category="Payment 1", created_by=self.accounting_user
        )
        p2 = StudentTransaction.objects.create(
            student=self.student_user, amount=Decimal("40.00"), remaining_balance=Decimal("40.00"),
            transaction_type="Payment", category="Payment 2", created_by=self.accounting_user
        )
        
        bal = StudentBalance.objects.get(student=self.student_user)
        bal.outstanding_balance = Decimal("200.00")
        bal.save()

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

        void_resp = self.client.patch(f"/api/accounting/transactions/{p1.transaction_id}/void/", {
            "reason": "Voiding P1"
        }, format="json")
        self.assertEqual(void_resp.status_code, status.HTTP_200_OK)

        ledger_resp = self.client.get(f"/api/accounting/students/{self.student_user.user_id}/ledger/")
        self.assertEqual(ledger_resp.status_code, status.HTTP_200_OK)
        
        outstanding_bal = ledger_resp.data["balance"]
        ledger_list = ledger_resp.data["ledger"]
        latest_running_balance = ledger_list[0]["running_balance"] if ledger_list else 0.0
        
        self.assertEqual(Decimal(str(outstanding_bal)), Decimal(str(latest_running_balance)),
                         "Bug: Outstanding balance and running balance in ledger should be equal!")

    def test_charge_reallocation_voiding_ledger_discrepancy(self):
        """
        Charge reallocation voiding discrepancy.
        Voiding a source payment marks the reallocation audit Charge as voided
        without running the Charge voiding logic (remaining balance is not set to 0, outstanding is not reduced).
        """
        session = self.client.session
        session["user_id"] = self.accounting_user.user_id
        session.save()

        p1 = StudentTransaction.objects.create(
            student=self.student_user, amount=Decimal("100.00"), remaining_balance=Decimal("100.00"),
            transaction_type="Payment", category="Deposit", created_by=self.accounting_user
        )
        
        c2 = StudentTransaction.objects.create(
            student=self.student_user, amount=Decimal("100.00"), remaining_balance=Decimal("100.00"),
            transaction_type="Charge", category="Old Charge", created_by=self.accounting_user
        )
        
        bal = StudentBalance.objects.get(student=self.student_user)
        bal.outstanding_balance = Decimal("100.00")
        bal.save()

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

        void_resp = self.client.patch(f"/api/accounting/transactions/{p1.transaction_id}/void/", {
            "reason": "Voiding P1"
        }, format="json")
        self.assertEqual(void_resp.status_code, status.HTTP_200_OK)

        c1.refresh_from_db()
        self.student_user.refresh_from_db()
        outstanding_bal = self.student_user.balance.outstanding_balance
        
        self.assertFalse(c1.is_voided)
        self.assertEqual(c1.remaining_balance, Decimal("100.00"), "C1 remaining balance should remain 100.00!")
        self.assertEqual(outstanding_bal, Decimal("200.00"), "Student outstanding balance should go back to 200.00!")
