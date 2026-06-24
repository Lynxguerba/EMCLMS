from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import PasswordReset, User

from ..utils import is_admin_or_superadmin


@api_view(["GET"])
def admin_get_all_password_reset_of_users(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)

    if not is_admin_or_superadmin(user):
        return Response({"detail": "Forbidden"}, status=403)

    if user.user_type == "Superadmin":
        all_users = User.objects.all()
        resets = PasswordReset.objects.select_related("user").order_by("updated_at")
        latest_resets = {}
        for r in resets:
            latest_resets[r.user_id] = r

        data = []
        for u in all_users:
            reset = latest_resets.get(u.user_id)
            data.append({
                "password_reset_id": reset.password_reset_id if reset else None,
                "user_id": u.user_id,
                "email": u.email,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "user_type": u.user_type,
                "status": reset.status if reset else "No Request",
                "profile_picture": u.profile_picture.name if u.profile_picture else None,
            })

        def get_sort_key(item):
            status = item["status"]
            if status == "Pending":
                return (0, -item["user_id"])
            elif status == "Completed":
                return (1, -item["user_id"])
            else:
                return (2, -item["user_id"])

        data.sort(key=get_sort_key)
        return Response(data, status=200)

    resets_query = PasswordReset.objects.select_related("user").all()

    # Security: Standard Administrators cannot see password reset requests for Superadmins
    if user.user_type != "Superadmin":
        resets_query = resets_query.exclude(user__user_type="Superadmin")

    resets = resets_query.all()
    data = [
        {
            "password_reset_id": reset.password_reset_id,
            "user_id": reset.user.user_id,
            "email": reset.user.email,
            "first_name": reset.user.first_name,
            "last_name": reset.user.last_name,
            "user_type": reset.user.user_type,
            "status": reset.status,
            "profile_picture": reset.user.profile_picture.name if reset.user.profile_picture else None,
        }
        for reset in resets
    ]
    return Response(data, status=200)
