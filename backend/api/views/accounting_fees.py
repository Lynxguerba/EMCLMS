from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from ..models import User, AccountingFee

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

@api_view(["GET", "POST"])
def accounting_fees_list_create(request):
    user, error_response = check_accounting_auth(request)
    if error_response:
        return error_response

    if request.method == "GET":
        fees = AccountingFee.objects.all().order_by("name")
        data = [
            {
                "id": fee.fee_id,
                "name": fee.name,
                "amount": str(fee.amount),
                "status": fee.status,
                "color": fee.color,
            }
            for fee in fees
        ]
        return Response(data)

    elif request.method == "POST":
        name = request.data.get("name")
        amount = request.data.get("amount")
        status_val = request.data.get("status", "Active")
        color = request.data.get("color", "")

        if not name or not amount:
            return Response({"detail": "Missing required fields"}, status=400)

        try:
            # Handle possible peso sign in amount string from frontend
            if isinstance(amount, str):
                amount_val = amount.replace("₱", "").replace(",", "").strip()
            else:
                amount_val = str(amount)
            
            from decimal import Decimal
            amount_decimal = Decimal(amount_val)
            if amount_decimal <= 0:
                return Response({"detail": "Fee amount must be greater than zero"}, status=400)
            
            fee = AccountingFee.objects.create(
                name=name,
                amount=amount_decimal,
                status=status_val,
                color=color
            )
            return Response({
                "id": fee.fee_id,
                "name": fee.name,
                "amount": str(fee.amount),
                "status": fee.status,
                "color": fee.color,
            }, status=201)
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

@api_view(["PUT", "DELETE"])
def accounting_fee_detail(request, fee_id):
    user, error_response = check_accounting_auth(request)
    if error_response:
        return error_response

    fee = get_object_or_404(AccountingFee, pk=fee_id)

    if request.method == "PUT":
        name = request.data.get("name")
        amount = request.data.get("amount")
        status_val = request.data.get("status")
        color = request.data.get("color")

        if name: fee.name = name
        if amount:
            try:
                if isinstance(amount, str):
                    amount_val = amount.replace("₱", "").replace(",", "").strip()
                else:
                    amount_val = str(amount)
                from decimal import Decimal, InvalidOperation
                amount_decimal = Decimal(amount_val)
                if amount_decimal <= 0:
                    return Response({"detail": "Fee amount must be greater than zero"}, status=400)
                fee.amount = amount_decimal
            except (ValueError, InvalidOperation):
                return Response({"detail": "Invalid amount format"}, status=400)
        if status_val: fee.status = status_val
        if color: fee.color = color

        fee.save()
        return Response({
            "id": fee.fee_id,
            "name": fee.name,
            "amount": str(fee.amount),
            "status": fee.status,
            "color": fee.color,
        })

    elif request.method == "DELETE":
        fee.delete()
        return Response(status=204)
