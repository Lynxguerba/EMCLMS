# backend/api/views/admin_get_users_by_type.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import User
from ..utils import is_admin_or_superadmin


@api_view(["GET"])
def admin_get_users_by_type(request, user_type: str):
    # 1. Check if there's a logged-in user in the session
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    # 2. Verify the logged-in user exists
    try:
        current_user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)

    # 3. Ensure only admins can access this endpoint
    if not is_admin_or_superadmin(current_user):
        return Response({"detail": "Forbidden"}, status=403)

    # 4. Validate user_type input
    valid_types = [choice[0] for choice in User.USER_TYPES]
    if user_type not in valid_types:
        return Response(
            {"detail": f"Invalid user_type. Must be one of {valid_types}"},
            status=400,
        )

    # 5. Query users by type
    users = User.objects.filter(user_type=user_type).values(
        "user_id",
        "first_name",
        "last_name",
        "email",
        "user_type",
        "program",
        "last_online",
    )

    return Response(list(users), status=200)
