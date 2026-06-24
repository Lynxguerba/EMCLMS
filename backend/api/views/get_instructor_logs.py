from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import User, InstructorLog
from ..utils import is_admin_or_superadmin
from django.utils import timezone
from zoneinfo import ZoneInfo


@api_view(["GET"])
def get_instructor_logs(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "Unauthorized"}, status=401)

    # ✅ Only admins/superadmins can view instructor logs
    if not is_admin_or_superadmin(user):
        return Response({"detail": "Unauthorized"}, status=401)

    logs = InstructorLog.objects.select_related("instructor").order_by("-timestamp")
    manila_tz = ZoneInfo("Asia/Manila")

    data = [
        {
            "id": log.log_id,
            "timestamp": log.timestamp.astimezone(manila_tz).isoformat(),
            "instructor": f"{log.instructor.first_name} {log.instructor.last_name}" if log.instructor else "Deleted Instructor",
            "instructor_id": log.instructor.user_id if log.instructor else None,
            "message": log.message,
        }
        for log in logs
    ]

    return Response(data)
