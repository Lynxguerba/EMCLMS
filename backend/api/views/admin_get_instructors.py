from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import User
from ..utils import is_admin_or_superadmin


@api_view(["GET"])
def admin_get_instructors(request):
    """
    Return list of users that are instructors.
    Session-protected — only authenticated admins may call this.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        caller = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "Unauthorized"}, status=401)

    if not is_admin_or_superadmin(caller):
        return Response({"detail": "Unauthorized"}, status=401)

    instructors = User.objects.filter(user_type="Instructor").only(
        "user_id", "first_name", "last_name", "email", "profile_picture"
    ).order_by("last_name", "first_name")
    data = [
        {
            "user_id": u.user_id,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "email": u.email,
            "profile_picture_url": u.profile_picture.url if u.profile_picture else "",
        }
        for u in instructors
    ]
    return Response(data)
