from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import StudentLog, User
from ..utils import is_admin_or_superadmin
from zoneinfo import ZoneInfo


@api_view(["GET"])
def get_student_logs(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "Unauthorized"}, status=401)

    if not is_admin_or_superadmin(user):
        return Response({"detail": "Unauthorized"}, status=401)

    logs = StudentLog.objects.select_related("student").order_by("-timestamp")

    manila_tz = ZoneInfo("Asia/Manila")
    data = [
        {
            "id": log.log_id,
            "timestamp": log.timestamp.astimezone(manila_tz).isoformat(),
            "student": f"{log.student.first_name} {log.student.last_name}" if log.student else "Deleted Student",
            "student_id": log.student.user_id if log.student else None,
            "message": log.message,
        }
        for log in logs
    ]

    return Response(data)
