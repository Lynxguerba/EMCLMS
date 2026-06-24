from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import User, InstructorLog
from django.utils import timezone
from zoneinfo import ZoneInfo


@api_view(["POST"])
def add_instructor_log(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "Unauthorized"}, status=401)

    if user.user_type != "Instructor":
        return Response({"detail": "Unauthorized"}, status=401)

    message = request.data.get("message")
    if not message:
        return Response({"detail": "Message is required"}, status=400)

    log = InstructorLog.objects.create(instructor=user, message=message)

    manila_tz = ZoneInfo("Asia/Manila")
    local_timestamp = log.timestamp.astimezone(manila_tz).isoformat()

    return Response(
        {
            "id": log.log_id,
            "timestamp": local_timestamp,
            "instructor": f"{user.first_name} {user.last_name}",
            "message": log.message,
        },
        status=201,
    )
