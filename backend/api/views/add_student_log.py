from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import StudentLog, User
from django.utils import timezone
from zoneinfo import ZoneInfo  # Python 3.9+


@api_view(["POST"])
def add_student_log(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "Unauthorized"}, status=401)

    # Only students can create their own logs
    if user.user_type != "Student":
        return Response({"detail": "Unauthorized"}, status=401)

    message = request.data.get("message")
    if not message:
        return Response({"detail": "Message is required"}, status=400)

    # ✅ Store timestamp in UTC
    log = StudentLog.objects.create(
        student=user,
        message=message,
        timestamp=timezone.now(),  # always UTC because USE_TZ=True
    )

    # ✅ Convert to Asia/Manila (+8) when returning
    manila_tz = ZoneInfo("Asia/Manila")
    local_timestamp = log.timestamp.astimezone(manila_tz).isoformat()

    return Response(
        {
            "id": log.log_id,
            "timestamp": local_timestamp,  # converted for API response
            "student": f"{user.first_name} {user.last_name}",
            "message": log.message,
        },
        status=201,
    )
