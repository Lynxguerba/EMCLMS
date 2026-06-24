from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import Notification, User


@api_view(["GET"])
def get_user_notifications(request):
    """
    Fetches all notifications for the currently logged-in user.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=401)

    notifications = Notification.objects.filter(user=user).order_by("-created_at")

    data = [
        {
            "id": notification.notification_id,
            "title": notification.title,
            "message": notification.message,
            "read": notification.status == Notification.Status.READ,
            "createdAt": notification.created_at,
        }
        for notification in notifications
    ]

    return Response(data)
