from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Sum
from ..models import User, StudentBalance, StudentTransaction
from decimal import Decimal

@api_view(["GET"])
def accounting_dashboard_stats(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)
    
    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)
    
    if user.user_type != "Accounting":
        return Response({"detail": "Forbidden"}, status=403)

    total_receivables = StudentBalance.objects.filter(outstanding_balance__gt=0).aggregate(total=Sum("outstanding_balance"))["total"] or Decimal("0.00")
    outstanding_accounts = StudentBalance.objects.filter(outstanding_balance__gt=0).count()
    total_students = User.objects.filter(user_type="Student").count()
    
    # 1. Recent Transactions (both Charges and Payments)
    recent_transactions_query = StudentTransaction.objects.select_related("student").order_by("-created_at")[:5]
    recent_transactions = [
        {
            "id": tx.transaction_id,
            "student_name": f"{tx.student.first_name} {tx.student.last_name}",
            "amount": float(tx.amount),
            "transaction_type": tx.transaction_type,
            "date": tx.created_at.isoformat(),
            "status": "Voided" if tx.is_voided else "Success",
        }
        for tx in recent_transactions_query
    ]

    # 2. Category Stats (Collection Target)
    from ..models import TransactionAllocation
    
    # Get distinct categories from non-voided charges
    # Note: .order_by() is essential here to remove default ordering which includes 'created_at',
    # causing .distinct() to return duplicate categories with different timestamps.
    categories = StudentTransaction.objects.filter(
        transaction_type="Charge", 
        is_voided=False
    ).order_by().values_list("category", flat=True).distinct()

    
    category_stats = []
    total_charged_overall = Decimal("0.00")
    total_collected_overall = Decimal("0.00")
    
    for cat in categories:
        total_charged = StudentTransaction.objects.filter(
            transaction_type="Charge", 
            category=cat, 
            is_voided=False
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        
        total_collected = TransactionAllocation.objects.filter(
            charge__category=cat,
            charge__is_voided=False,
            payment__is_voided=False
        ).aggregate(total=Sum("amount_allocated"))["total"] or Decimal("0.00")
        
        percentage = (float(total_collected) / float(total_charged) * 100) if total_charged > 0 else 0
        
        category_stats.append({
            "category": cat,
            "collected": float(total_collected),
            "percentage": min(percentage, 100.0) # Cap at 100%
        })
        
        total_charged_overall += total_charged
        total_collected_overall += total_collected
    
    collection_rate = (float(total_collected_overall) / float(total_charged_overall) * 100) if total_charged_overall > 0 else 0

    return Response({
        "total_receivables": float(total_receivables),
        "outstanding_accounts": outstanding_accounts,
        "total_students": total_students,
        "recent_transactions": recent_transactions,
        "category_stats": category_stats,
        "collection_rate": round(collection_rate, 1)
    })

