from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q
from ..models import User, StudentBalance, StudentTransaction, Notification, Enrollment, TransactionAllocation, Course
from django.utils import timezone
from decimal import Decimal, InvalidOperation

def is_numeric_id(val):
    if val is None:
        return False
    if isinstance(val, (int, float)):
        return True
    val_str = str(val).strip()
    return val_str.isdigit()


def check_accounting_auth(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return None, Response({"detail": "Unauthorized"}, status=401)
    
    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return None, Response({"detail": "User not found"}, status=404)
    
    if user.user_type != "Accounting":
        return None, Response({"detail": "Forbidden"}, status=403)
    
    return user, None

@api_view(["GET"])
def accounting_students_list(request):
    user, error_response = check_accounting_auth(request)
    if error_response:
        return error_response

    search_query = request.query_params.get("search", "")
    program_filter = request.query_params.get("program", "All Programs")
    balance_filter = request.query_params.get("balance", "All")

    students = User.objects.filter(user_type="Student").select_related("balance")

    if search_query:
        students = students.filter(
            Q(first_name__icontains=search_query) |
            Q(last_name__icontains=search_query) |
            Q(email__icontains=search_query) |
            Q(user_id__icontains=search_query)
        )

    if program_filter != "All Programs":
        students = students.filter(program=program_filter)

    # Convert to list and filter further by balance if needed
    data = []
    for s in students:
        outstanding = Decimal("0.00")
        if hasattr(s, "balance"):
            outstanding = s.balance.outstanding_balance
        
        last_payment = s.transactions.filter(transaction_type="Payment", is_voided=False).exclude(category="Reallocation Audit").order_by("-created_at").first()
        
        # Balance filter logic
        if balance_filter == "Outstanding" and outstanding <= 0:
            continue
        if balance_filter == "Cleared" and outstanding > 0:
            continue
            
        data.append({
            "id": s.user_id,
            "name": f"{s.first_name} {s.last_name}",
            "email": s.email,
            "program": s.program,
            "balance": float(outstanding),
            "last_payment": last_payment.created_at.isoformat() if last_payment else None,
        })

    return Response(data)

@api_view(["GET"])
def accounting_student_ledger(request, student_id):
    user, error_response = check_accounting_auth(request)
    if error_response:
        return error_response

    student = get_object_or_404(User, pk=student_id, user_type="Student")
    # Rebuild Logic: Running Balance based on Debt Impact
    # We fetch chronologically to calculate the "Debt History"
    chrono_transactions = student.transactions.all().order_by("created_at")
    
    current_debt = Decimal("0.00")
    balances_map = {}
    impact_map = {}
    
    for t in chrono_transactions:
        if not t.is_voided:
            from django.db.models import Sum
            allocated = t.allocations_from.aggregate(Sum('amount_allocated'))['amount_allocated__sum'] or Decimal("0.00")
            if t.transaction_type == "Charge":
                net_impact = t.amount - allocated
                current_debt += net_impact
                impact_map[t.transaction_id] = float(net_impact)
            else:
                current_debt -= allocated
                impact_map[t.transaction_id] = float(allocated)
        
        balances_map[t.transaction_id] = float(current_debt)
    
    # Now build the display data (newest first)
    search_query = request.query_params.get("search", "")
    type_filter = request.query_params.get("type", "All")
    category_filter = request.query_params.get("category", "All")
    
    transactions = student.transactions.all().order_by("-created_at")
    
    if search_query:
        transactions = transactions.filter(
            Q(description__icontains=search_query) |
            Q(category__icontains=search_query)
        )
    
    if type_filter != "All":
        transactions = transactions.filter(transaction_type=type_filter)
        
    if category_filter != "All":
        transactions = transactions.filter(category=category_filter)

    ledger_data = []
    for t in transactions:
        t_impact = impact_map.get(t.transaction_id, 0.0)
        
        t_data = {
            "id": t.transaction_id,
            "amount": float(t.amount), # Raw transaction amount
            "impact_amount": t_impact, # Debt-reduction amount
            "running_balance": balances_map.get(t.transaction_id, 0.0),
            "type": t.transaction_type,
            "category": t.category,
            "description": t.description,
            "created_at": t.created_at.isoformat(),
            "created_by": f"{t.created_by.first_name} {t.created_by.last_name}" if t.created_by else "System",
            "is_voided": t.is_voided,
            "void_reason": t.void_reason,
            "remaining_balance": float(t.remaining_balance),
            "allocations": []
        }
        
        # Link from the audit record to the charges/payments it impacted
        if t.transaction_type == "Payment":
            allocs = t.allocations_from.all().select_related('charge')
            for a in allocs:
                t_data["allocations"].append({
                    "id": a.charge.transaction_id,
                    "category": a.charge.category,
                    "amount": float(a.amount_allocated),
                    "charge_remaining": float(a.charge.remaining_balance),
                    "charge_is_voided": a.charge.is_voided
                })
        else:
            allocs = t.allocations_to.all().select_related('payment')
            for a in allocs:
                t_data["allocations"].append({
                    "id": a.payment.transaction_id,
                    "category": a.payment.category,
                    "amount": float(a.amount_allocated),
                    "payment_remaining": float(a.payment.remaining_balance),
                    "payment_is_voided": a.payment.is_voided
                })
        ledger_data.append(t_data)

    from django.db.models import Sum
    total_unapplied = student.transactions.filter(
        transaction_type="Payment",
        remaining_balance__gt=0,
        is_voided=False
    ).aggregate(Sum('remaining_balance'))['remaining_balance__sum'] or Decimal("0.00")

    outstanding = Decimal("0.00")
    if hasattr(student, "balance"):
        outstanding = student.balance.outstanding_balance

    return Response({
        "student": {
            "id": student.user_id,
            "name": f"{student.first_name} {student.last_name}",
            "email": student.email,
            "program": student.program,
            "total_unapplied_credits": float(total_unapplied)
        },
        "balance": float(outstanding),
        "ledger": ledger_data
    })

@api_view(["GET"])
def accounting_unpaid_charges(request, student_id):
    user, error_response = check_accounting_auth(request)
    if error_response:
        return error_response

    student = get_object_or_404(User, pk=student_id, user_type="Student")
    unpaid = StudentTransaction.objects.filter(
        student=student, 
        transaction_type="Charge", 
        remaining_balance__gt=0,
        is_voided=False
    ).order_by("created_at")

    data = [
        {
            "id": t.transaction_id,
            "category": t.category,
            "amount": float(t.amount),
            "remaining": float(t.remaining_balance),
            "created_at": t.created_at.isoformat(),
        }
        for t in unpaid
    ]
    return Response(data)
    
@api_view(["GET"])
def accounting_unused_credits(request, student_id):
    user, error_response = check_accounting_auth(request)
    if error_response:
        return error_response

    student = get_object_or_404(User, pk=student_id, user_type="Student")
    unused = StudentTransaction.objects.filter(
        student=student, 
        transaction_type="Payment", 
        remaining_balance__gt=0,
        is_voided=False
    ).order_by("created_at")

    data = [
        {
            "id": t.transaction_id,
            "category": t.category,
            "amount": float(t.amount),
            "remaining": float(t.remaining_balance),
            "created_at": t.created_at.isoformat(),
        }
        for t in unused
    ]
    return Response(data)

@api_view(["POST"])
def accounting_create_transaction(request):
    user, error_response = check_accounting_auth(request)
    if error_response:
        return error_response

    student_id = request.data.get("student_id")
    amount_raw = request.data.get("amount")
    t_type = request.data.get("transaction_type") or request.data.get("type")
    category = request.data.get("category")
    description = request.data.get("description", "")
    reallocations = request.data.get("reallocations", [])

    if not all([student_id, t_type, category]):
        return Response({"detail": "Missing required fields (student_id, type, or category)"}, status=400)

    # Validate student_id is numeric
    if not is_numeric_id(student_id):
        return Response({"detail": "student_id must be a numeric integer"}, status=400)

    # Validate transaction type
    if t_type not in ["Charge", "Payment"]:
        return Response({"detail": "Invalid transaction type"}, status=400)

    # Process amount
    amount_decimal = Decimal("0.00")
    if amount_raw:
        try:
            if isinstance(amount_raw, str):
                amount_val = amount_raw.replace("₱", "").replace(",", "").strip()
                if amount_val:
                    amount_decimal = Decimal(amount_val)
            else:
                amount_decimal = Decimal(str(amount_raw))
        except:
            return Response({"detail": "Invalid amount format"}, status=400)

    # Validation logic
    if amount_decimal < 0:
        return Response({"detail": "Transaction amount cannot be negative"}, status=400)

    if amount_decimal >= Decimal("100000000.00"):
        return Response({"detail": "Transaction amount is too large"}, status=400)

    if t_type == "Charge" and amount_decimal == 0:
        return Response({"detail": "Charges must have an amount greater than zero"}, status=400)
    
    if t_type == "Payment" and amount_decimal == 0 and not reallocations:
        return Response({"detail": "Payments must have an amount or reallocations"}, status=400)

    student = get_object_or_404(User, pk=student_id, user_type="Student")
    allocations = request.data.get("allocations", []) # List of {charge_id, amount}

    # Validate allocations ownership and status
    if t_type == "Payment" and allocations:
        for alloc in allocations:
            charge_id = alloc.get("charge_id")
            if not charge_id:
                return Response({"detail": "Missing charge_id in allocations"}, status=400)
            if not is_numeric_id(charge_id):
                return Response({"detail": "charge_id must be a numeric integer"}, status=400)
            charge = get_object_or_404(StudentTransaction, pk=charge_id, transaction_type="Charge")
            if charge.student != student:
                return Response({"detail": "Cannot allocate payment to another student's charge"}, status=400)
            if charge.is_voided:
                return Response({"detail": "Cannot allocate to a voided charge"}, status=400)
            
            # Validate allocation amount if provided
            alloc_amount = alloc.get("amount")
            if alloc_amount is not None:
                try:
                    if isinstance(alloc_amount, str):
                        alloc_amount_str = alloc_amount.replace("₱", "").replace(",", "").strip()
                    else:
                        alloc_amount_str = str(alloc_amount)
                    
                    if alloc_amount_str:
                        alloc_amount_decimal = Decimal(alloc_amount_str)
                        if alloc_amount_decimal < 0:
                            return Response({"detail": "Allocation amount cannot be negative"}, status=400)
                    else:
                        return Response({"detail": "Allocation amount cannot be empty"}, status=400)
                except (ValueError, InvalidOperation):
                    return Response({"detail": "Allocation amount must be a valid number"}, status=400)

    # Validate reallocations ownership and status
    if reallocations:
        for realloc in reallocations:
            credit_id = realloc.get("credit_id")
            charge_id = realloc.get("charge_id")
            if not all([credit_id, charge_id]):
                return Response({"detail": "Missing credit_id or charge_id in reallocations"}, status=400)
            if not is_numeric_id(credit_id) or not is_numeric_id(charge_id):
                return Response({"detail": "reallocation IDs must be numeric integers"}, status=400)
            credit_tx = get_object_or_404(StudentTransaction, pk=credit_id, transaction_type="Payment")
            charge_tx = get_object_or_404(StudentTransaction, pk=charge_id, transaction_type="Charge")
            if credit_tx.student != student or charge_tx.student != student:
                return Response({"detail": "Cannot reallocate transactions belonging to another student"}, status=400)
            if credit_tx.is_voided or charge_tx.is_voided:
                return Response({"detail": "Cannot reallocate voided transactions"}, status=400)
            
            # Validate reallocation amount if provided
            realloc_amount = realloc.get("amount")
            if realloc_amount is not None:
                try:
                    if isinstance(realloc_amount, str):
                        realloc_amount_str = realloc_amount.replace("₱", "").replace(",", "").strip()
                    else:
                        realloc_amount_str = str(realloc_amount)
                    
                    if realloc_amount_str:
                        realloc_amount_decimal = Decimal(realloc_amount_str)
                        if realloc_amount_decimal < 0:
                            return Response({"detail": "Reallocation amount cannot be negative"}, status=400)
                    else:
                        return Response({"detail": "Reallocation amount cannot be empty"}, status=400)
                except (ValueError, InvalidOperation):
                    return Response({"detail": "Reallocation amount must be a valid number"}, status=400)
    
    with transaction.atomic():
        # Always create a transaction record to preserve history/audit trail.
        # This record acts as the "Journal Entry" for the current action.
        t_main = StudentTransaction.objects.create(
            student=student,
            amount=amount_decimal,
            transaction_type=t_type,
            category=category,
            description=description,
            created_by=user
        )
        
        # Track how much debt is reduced in THIS specific transaction record
        total_allocated_in_this_request = Decimal("0.00")

        # 1. Handle specific allocations from the NEW payment
        if t_type == "Payment":
            payment_remaining_budget = amount_decimal
            if allocations:
                for alloc in allocations:
                    if payment_remaining_budget <= 0:
                        break
                    charge_id = alloc.get("charge_id")
                    target_alloc_amount = Decimal(str(alloc.get("amount", 0)))
                    
                    if target_alloc_amount > 0:
                        charge = StudentTransaction.objects.select_for_update().get(pk=charge_id, transaction_type="Charge")
                        actual_alloc = min(target_alloc_amount, charge.remaining_balance, payment_remaining_budget)
                        
                        if actual_alloc > 0:
                            TransactionAllocation.objects.create(
                                payment=t_main, # Linked to current audit row
                                charge=charge,
                                amount_allocated=actual_alloc
                            )
                            charge.remaining_balance -= actual_alloc
                            charge.save()
                            payment_remaining_budget -= actual_alloc
                            total_allocated_in_this_request += actual_alloc
            
            t_main.remaining_balance = payment_remaining_budget
            t_main.save()

        # 2. Handle Reallocations (Existing Unused Credits)
        # These are linked to t_main to show the audit trail of what happened TODAY.
        reallocations = request.data.get("reallocations", [])
        if reallocations:
            realloc_desc_parts = []
            for realloc in reallocations:
                credit_id = realloc.get("credit_id")
                charge_id = realloc.get("charge_id")
                re_amount = Decimal(str(realloc.get("amount", 0)))
                
                if re_amount > 0:
                    credit_tx = StudentTransaction.objects.select_for_update().get(pk=credit_id, transaction_type="Payment")
                    charge_tx = StudentTransaction.objects.select_for_update().get(pk=charge_id, transaction_type="Charge")
                    
                    actual_re = min(re_amount, credit_tx.remaining_balance, charge_tx.remaining_balance)
                    
                    if actual_re > 0:
                        # We link the allocation to t_main so the history table shows the impact TODAY
                        TransactionAllocation.objects.create(
                            payment=t_main, 
                            source_payment=credit_tx, # Track original source
                            charge=charge_tx,
                            amount_allocated=actual_re
                        )
                        credit_tx.remaining_balance -= actual_re
                        charge_tx.remaining_balance -= actual_re
                        credit_tx.save()
                        charge_tx.save()
                        total_allocated_in_this_request += actual_re
                        realloc_desc_parts.append(f"₱{actual_re} from {credit_tx.category} #{credit_tx.transaction_id}")

            # Ensure main transaction is saved without appending complex textual reallocation logic
            # The allocations are already tracked in TransactionAllocation for the frontend to render
            if realloc_desc_parts:
                t_main.save()

        # 3. Handle Auto-Reallocations for Charge (Existing Unused Credits)
        auto_reallocate = request.data.get("auto_reallocate", False)
        if t_type == "Charge" and auto_reallocate:
            unused_credits = StudentTransaction.objects.select_for_update().filter(
                student=student,
                transaction_type="Payment",
                remaining_balance__gt=0,
                is_voided=False
            ).order_by("created_at")
            
            charge_remaining = t_main.remaining_balance
            for credit in unused_credits:
                if charge_remaining <= 0:
                    break
                actual_re = min(credit.remaining_balance, charge_remaining)
                if actual_re > 0:
                    TransactionAllocation.objects.create(
                        payment=t_main, 
                        source_payment=credit, 
                        charge=t_main, 
                        amount_allocated=actual_re
                    )
                    credit.remaining_balance -= actual_re
                    credit.save()
                    charge_remaining -= actual_re
                    total_allocated_in_this_request += actual_re
            
            t_main.remaining_balance = charge_remaining
            t_main.save()

        # 4. Update the global student balance (Sum of Unpaid Charges)
        bal, created = StudentBalance.objects.get_or_create(student=student)
        bal = StudentBalance.objects.select_for_update().get(pk=bal.pk)
        outstanding = Decimal(str(bal.outstanding_balance))
        if t_type == "Charge":
            outstanding += amount_decimal
        
        # Balance drops by exactly what was allocated in this session
        outstanding -= total_allocated_in_this_request
        bal.outstanding_balance = outstanding
        bal.save()

        # Notify student
        n_message = f"A new {t_type} of ₱{amount_decimal} for {category} has been recorded to your account."
        if t_type == "Payment" and amount_decimal <= 0 and total_allocated_in_this_request > 0:
            n_message = f"Successfully applied ₱{total_allocated_in_this_request} from your available credits to your outstanding balance."
            
        Notification.objects.create(
            user=student,
            title=f"Account Update: {t_type}",
            message=n_message
        )

    return Response({"detail": "Transaction recorded successfully"}, status=201)

@api_view(["POST"])
def accounting_bulk_charge(request):
    user, error_response = check_accounting_auth(request)
    if error_response:
        return error_response

    target = request.data.get("target")
    program = request.data.get("program")
    course_id = request.data.get("course_id")
    amount = request.data.get("amount")
    category = request.data.get("category")
    description = request.data.get("description", "")
    auto_reallocate = request.data.get("auto_reallocate", True)

    if amount is None or category is None or str(amount).strip() == "" or str(category).strip() == "":
        return Response({"detail": "Missing required fields"}, status=400)

    try:
        if isinstance(amount, str):
            amount = amount.replace("₱", "").replace(",", "").strip()
        amount_decimal = Decimal(str(amount))
    except:
        return Response({"detail": "Invalid amount format"}, status=400)

    if amount_decimal <= 0:
        return Response({"detail": "Bulk charge amount must be greater than zero"}, status=400)

    if amount_decimal >= Decimal("100000000.00"):
        return Response({"detail": "Bulk charge amount is too large"}, status=400)

    # Resolve target if not explicitly provided (legacy support)
    if not target:
        if program and program != "All Programs":
            target = "Program"
        else:
            target = "All"

    students_to_charge = User.objects.filter(user_type="Student")

    if target == "Program":
        if not program or program == "All Programs":
            pass
        else:
            valid_programs = [choice[0] for choice in User.PROGRAM_CHOICES]
            if program not in valid_programs:
                return Response({"detail": "Invalid program selection"}, status=400)
            students_to_charge = students_to_charge.filter(program=program)

    elif target == "Course":
        if not course_id:
            return Response({"detail": "Course ID is required for course-targeted bulk charge"}, status=400)
        if not is_numeric_id(course_id):
            return Response({"detail": "course_id must be a numeric integer"}, status=400)
        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            return Response({"detail": "Course not found"}, status=404)
        students_to_charge = students_to_charge.filter(enrollment__course=course).distinct()

    elif target == "All":
        pass
    else:
        return Response({"detail": "Invalid target specified"}, status=400)

    count = 0
    with transaction.atomic():
        for student in students_to_charge:
            t = StudentTransaction.objects.create(
                student=student,
                amount=amount_decimal,
                transaction_type="Charge",
                category=category,
                description=description,
                created_by=user
            )
            
            total_allocated_in_this_request = Decimal("0.00")
            
            if auto_reallocate:
                unused_credits = StudentTransaction.objects.select_for_update().filter(
                    student=student,
                    transaction_type="Payment",
                    remaining_balance__gt=0,
                    is_voided=False
                ).order_by("created_at")
                
                charge_remaining = t.remaining_balance
                for credit in unused_credits:
                    if charge_remaining <= 0:
                        break
                    actual_re = min(credit.remaining_balance, charge_remaining)
                    if actual_re > 0:
                        TransactionAllocation.objects.create(
                            payment=t,
                            source_payment=credit,
                            charge=t,
                            amount_allocated=actual_re
                        )
                        credit.remaining_balance -= actual_re
                        credit.save()
                        charge_remaining -= actual_re
                        total_allocated_in_this_request += actual_re
                
                t.remaining_balance = charge_remaining
                t.save()
                
            bal, _ = StudentBalance.objects.get_or_create(student=student)
            bal = StudentBalance.objects.select_for_update().get(pk=bal.pk)
            
            new_outstanding = Decimal(str(bal.outstanding_balance)) + amount_decimal - total_allocated_in_this_request
            bal.outstanding_balance = new_outstanding
            bal.save()
            
            Notification.objects.create(
                user=student,
                title="Account Charge Applied",
                message=f"A charge of ₱{amount_decimal} for {category} has been applied to your ledger."
            )
            count += 1

    return Response({"detail": f"Bulk charge applied to {count} students"}, status=201)

@api_view(["GET"])
def accounting_bulk_charge_preview(request):
    user, error_response = check_accounting_auth(request)
    if error_response:
        return error_response

    target = request.query_params.get("target")
    program = request.query_params.get("program")
    course_id = request.query_params.get("course_id")

    # Resolve target if not explicitly provided (legacy support)
    if not target:
        if program and program != "All Programs":
            target = "Program"
        else:
            target = "All"

    students_to_charge = User.objects.filter(user_type="Student")

    if target == "Program":
        if not program or program == "All Programs":
            pass
        else:
            valid_programs = [choice[0] for choice in User.PROGRAM_CHOICES]
            if program not in valid_programs:
                return Response({"detail": "Invalid program selection"}, status=400)
            students_to_charge = students_to_charge.filter(program=program)

    elif target == "Course":
        if not course_id:
            return Response({"detail": "Course ID is required for course-targeted bulk charge"}, status=400)
        if not is_numeric_id(course_id):
            return Response({"detail": "course_id must be a numeric integer"}, status=400)
        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            return Response({"detail": "Course not found"}, status=404)
        students_to_charge = students_to_charge.filter(enrollment__course=course).distinct()

    elif target == "All":
        pass
    else:
        return Response({"detail": "Invalid target specified"}, status=400)

    count = students_to_charge.count()
    # Let's get up to 5 student names for preview in UI
    preview_students = list(students_to_charge.values_list('first_name', 'last_name')[:5])
    student_names = [f"{fn} {ln}" for fn, ln in preview_students]

    return Response({
        "student_count": count,
        "preview_names": student_names
    })

@api_view(["PATCH"])
def accounting_void_transaction(request, transaction_id):
    user, error_response = check_accounting_auth(request)
    if error_response:
        return error_response

    t = get_object_or_404(StudentTransaction, pk=transaction_id)
    void_reason = request.data.get("reason")
    
    if not void_reason:
        return Response({"detail": "Void reason is mandatory"}, status=400)

    if t.is_voided:
        return Response({"detail": "Transaction already voided"}, status=400)

    with transaction.atomic():
        # Lock root transaction and student balance
        t = StudentTransaction.objects.select_for_update().get(pk=t.pk)
        bal, created = StudentBalance.objects.get_or_create(student=t.student)
        bal = StudentBalance.objects.select_for_update().get(pk=bal.pk)
        outstanding_container = [Decimal(str(bal.outstanding_balance))]
        processed_allocations = set()

        def void_tx(tx):
            if tx.is_voided:
                return
            
            tx.is_voided = True
            if tx == t:
                tx.void_reason = void_reason
            else:
                tx.void_reason = f"Source payment #{t.transaction_id} was voided"
            tx.voided_at = timezone.now()
            tx.voided_by = user
            tx.save()

            if tx.transaction_type == "Charge":
                # If voiding a charge, the student is no longer liable for the UNPAID portion
                outstanding_container[0] -= tx.remaining_balance
                
                # For the portion ALREADY PAID, we must find the payments and restore their credit
                allocations_received = TransactionAllocation.objects.filter(charge=tx)
                realloc_txs_to_check = set()
                for alloc in allocations_received:
                    if alloc.allocation_id in processed_allocations:
                        continue
                    processed_allocations.add(alloc.allocation_id)
                    # Restore to original source if it was a reallocation, else to the payment audit record
                    target_for_restoration = alloc.source_payment if alloc.source_payment else alloc.payment
                    # Lock target for restoration
                    target_for_restoration = StudentTransaction.objects.select_for_update().get(pk=target_for_restoration.pk)
                    target_for_restoration.remaining_balance += alloc.amount_allocated
                    target_for_restoration.save()
                    
                    if alloc.source_payment and alloc.payment != tx:
                        realloc_txs_to_check.add(alloc.payment)
                
                # Remove allocations so they don't show up as 'Settling' anything anymore
                allocations_received.delete()

                # Now check if the reallocation audit transactions have any active allocations left
                for realloc_tx in realloc_txs_to_check:
                    if realloc_tx.transaction_type == "Payment" and realloc_tx.category == "Reallocation Audit":
                        # Check if any active allocations remain in the database for this realloc_tx
                        if not realloc_tx.allocations_from.exists():
                            realloc_tx = StudentTransaction.objects.select_for_update().get(pk=realloc_tx.pk)
                            void_tx(realloc_tx)

                # If this charge acted as the payment audit record for a reallocation,
                # we must restore the target charge and source payment balances, and delete them.
                allocations_provided = TransactionAllocation.objects.filter(payment=tx)
                for alloc in allocations_provided:
                    if alloc.allocation_id in processed_allocations:
                        continue
                    processed_allocations.add(alloc.allocation_id)
                    if not alloc.charge.is_voided:
                        charge_tx_locked = StudentTransaction.objects.select_for_update().get(pk=alloc.charge.pk)
                        charge_tx_locked.remaining_balance += alloc.amount_allocated
                        charge_tx_locked.save()
                        outstanding_container[0] += alloc.amount_allocated
                    if alloc.source_payment:
                        source_payment_locked = StudentTransaction.objects.select_for_update().get(pk=alloc.source_payment.pk)
                        source_payment_locked.remaining_balance += alloc.amount_allocated
                        source_payment_locked.save()
                allocations_provided.delete()
                
                tx.remaining_balance = Decimal("0.00")
                tx.save()
            else:
                # If voiding a payment, any fees it paid off are now unpaid again
                allocations_given = TransactionAllocation.objects.filter(Q(payment=tx) | Q(source_payment=tx))
                total_previously_paid = Decimal("0.00")
                
                for alloc in allocations_given:
                    if alloc.allocation_id in processed_allocations:
                        continue
                    processed_allocations.add(alloc.allocation_id)
                    target_charge = alloc.charge
                    # Restore charge balance
                    if not target_charge.is_voided:
                        target_charge = StudentTransaction.objects.select_for_update().get(pk=target_charge.pk)
                        target_charge.remaining_balance += alloc.amount_allocated
                        target_charge.save()
                        total_previously_paid += alloc.amount_allocated
                    
                    # If this was a reallocation and the voided payment is the original source,
                    # void the reallocation audit transaction itself if no other active allocations remain in it.
                    # Only void it if the reallocation audit transaction itself is a Reallocation Audit payment.
                    if alloc.source_payment == tx and alloc.payment != tx:
                        realloc_tx = alloc.payment
                        if realloc_tx.transaction_type == "Payment" and realloc_tx.category == "Reallocation Audit":
                            other_active_allocs = realloc_tx.allocations_from.exclude(source_payment=tx)
                            if not other_active_allocs.exists():
                                realloc_tx = StudentTransaction.objects.select_for_update().get(pk=realloc_tx.pk)
                                void_tx(realloc_tx)
                    
                    # If this was a reallocation and we are voiding the reallocation audit log itself,
                    # restore balance to the original credit source
                    elif alloc.source_payment and alloc.source_payment != tx:
                        source_payment_locked = StudentTransaction.objects.select_for_update().get(pk=alloc.source_payment.pk)
                        source_payment_locked.remaining_balance += alloc.amount_allocated
                        source_payment_locked.save()
                
                # Remove allocations so they don't show up as 'Providing Credit' anymore
                allocations_given.delete()
                
                # The student's debt (outstanding) increases by exactly what this payment had cleared
                # but only for charges that are still active.
                outstanding_container[0] += total_previously_paid
                
                tx.remaining_balance = 0
                tx.save()

        # Execute on the root transaction
        void_tx(t)

        bal.outstanding_balance = outstanding_container[0]
        bal.save()

    return Response({"detail": "Transaction voided successfully"})
