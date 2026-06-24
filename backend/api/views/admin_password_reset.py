# views/admin_password_reset.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db import transaction
from ..models import User, PasswordReset
from ..utils import is_admin_or_superadmin


@api_view(["POST"])
def admin_password_reset(request):
    # 1. Check if logged in
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    # 2. Validate current user
    try:
        current_user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)

    # 3. Ensure only admins can reset passwords
    if not is_admin_or_superadmin(current_user):
        return Response({"detail": "Forbidden"}, status=403)

    # 4. Extract input data
    target_user_id = request.data.get("user_id")
    new_password1 = request.data.get("new_password1")
    new_password2 = request.data.get("new_password2")

    if not target_user_id:
        return Response({"detail": "Target user_id is required"}, status=400)

    if not new_password1 or not new_password2:
        return Response({"detail": "Passwords cannot be empty"}, status=400)

    if new_password1 != new_password2:
        return Response({"detail": "Passwords do not match"}, status=400)

    try:
        with transaction.atomic():
            # 5. Fetch target user
            target_user = User.objects.get(user_id=target_user_id)

            # Security Check: Only Superadmins can reset Superadmin or Administrator passwords
            if (
                target_user.user_type in ["Superadmin", "Administrator"]
                and current_user.user_type != "Superadmin"
            ):
                return Response(
                    {"detail": f"Only Superadmins can reset {target_user.user_type} passwords."},
                    status=403,
                )

            # 6. Update password
            target_user.set_password(new_password1)
            target_user.save()

            # 7. Mark PasswordReset as completed
            PasswordReset.objects.filter(user=target_user, status="Pending").update(
                status="Completed"
            )

    except User.DoesNotExist:
        return Response({"detail": "Target user not found"}, status=404)

    # 8. Success response
    return Response({"message": "Password reset successfully"}, status=200)
