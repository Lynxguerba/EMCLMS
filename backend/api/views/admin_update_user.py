# backend/api/views/admin_update_user.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from ..models import User
from ..utils import is_admin_or_superadmin
from django.db import transaction

@api_view(["PATCH", "PUT"])
def admin_update_user(request, user_id):
    # 1. Auth check for the caller
    caller_id = request.session.get("user_id")
    if not caller_id:
        return Response({"detail": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        caller = User.objects.get(user_id=caller_id)
    except User.DoesNotExist:
        return Response({"detail": "Caller not found"}, status=status.HTTP_404_NOT_FOUND)

    if not is_admin_or_superadmin(caller):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    # 2. Find the target user
    try:
        target_user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "Target user not found"}, status=status.HTTP_404_NOT_FOUND)

    # 3. Security checks
    # - Normal Administrator cannot edit a Superadmin or another Administrator
    if target_user.user_type in ["Superadmin", "Administrator"] and caller.user_type != "Superadmin":
        return Response(
            {"detail": f"Only Superadmins can edit {target_user.user_type} accounts."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # 4. Update fields
    data = request.data
    
    # Optional: Update email (check uniqueness)
    email = data.get("email")
    if email and email.lower() != target_user.email.lower():
        if User.objects.filter(email__iexact=email).exists():
            return Response({"detail": "Email already exists"}, status=status.HTTP_400_BAD_REQUEST)
        target_user.email = email

    # Optional: Update password
    password = data.get("password")
    if password:
        target_user.set_password(password)

    # Update other standard fields
    if "first_name" in data:
        target_user.first_name = data["first_name"].strip().capitalize()
    if "last_name" in data:
        target_user.last_name = data["last_name"].strip().capitalize()
    
    # Update user_type with security check
    new_user_type = data.get("user_type")
    if new_user_type:
        valid_user_types = [choice[0] for choice in User.USER_TYPES]
        if new_user_type not in valid_user_types:
            return Response({"detail": "Invalid user type"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Only Superadmins can promote someone to Superadmin or Administrator
        if new_user_type in ["Superadmin", "Administrator"] and caller.user_type != "Superadmin":
             return Response(
                {"detail": f"Only Superadmins can set user type to {new_user_type}."},
                status=status.HTTP_403_FORBIDDEN,
            )
        
        target_user.user_type = new_user_type

    if "program" in data:
        target_user.program = data["program"]

    try:
        target_user.save()
    except Exception as e:
        return Response({"detail": f"Error updating user: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({
        "success": True,
        "user_id": target_user.user_id,
        "email": target_user.email,
        "first_name": target_user.first_name,
        "last_name": target_user.last_name,
        "user_type": target_user.user_type,
        "program": target_user.program,
    }, status=status.HTTP_200_OK)
