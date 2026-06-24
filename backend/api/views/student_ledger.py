from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from ..models import User, StudentBalance, StudentTransaction

@api_view(["GET"])
def student_ledger_summary(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)
    
    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)
    
    if user.user_type != "Student":
        return Response({"detail": "Forbidden"}, status=403)

    transactions = user.transactions.exclude(amount=0).order_by("-created_at")
    
    transactions_data = []
    for t in transactions:
        t_data = {
            "id": t.transaction_id,
            "amount": float(t.amount),
            "transaction_type": t.transaction_type,
            "category": t.category,
            "description": t.description,
            "date": t.created_at.isoformat(),
            "status": "Voided" if t.is_voided else "Active",
            "allocations": []
        }
        
        if t.transaction_type == "Payment":
            # Direct allocations from this payment
            for a in t.allocations_from.all().select_related("charge"):
                t_data["allocations"].append({
                    "category": a.charge.category,
                    "amount": float(a.amount_allocated),
                })
            # Reallocation allocations where this payment provided credit
            for a in t.reallocations_provided.all().select_related("charge"):
                t_data["allocations"].append({
                    "category": a.charge.category,
                    "amount": float(a.amount_allocated),
                })
        else:
            # Allocations received by this charge
            for a in t.allocations_to.all().select_related("payment", "source_payment"):
                source_category = a.source_payment.category if a.source_payment else a.payment.category
                t_data["allocations"].append({
                    "category": source_category,
                    "amount": float(a.amount_allocated),
                })
        transactions_data.append(t_data)

    outstanding = 0.00
    if hasattr(user, "balance"):
        outstanding = float(user.balance.outstanding_balance)

    last_payment = transactions.filter(transaction_type="Payment", is_voided=False).exclude(category="Reallocation Audit").first()
    last_payment_amount = float(last_payment.amount) if last_payment else 0.00
    last_payment_date = last_payment.created_at.isoformat() if last_payment else None

    from django.db.models import Sum
    from decimal import Decimal
    total_unapplied = user.transactions.filter(
        transaction_type="Payment",
        remaining_balance__gt=0,
        is_voided=False
    ).aggregate(Sum('remaining_balance'))['remaining_balance__sum'] or Decimal("0.00")

    return Response({
        "balance": outstanding,
        "available_credit": float(total_unapplied),
        "transactions": transactions_data,
        "last_payment_amount": last_payment_amount,
        "last_payment_date": last_payment_date
    })
