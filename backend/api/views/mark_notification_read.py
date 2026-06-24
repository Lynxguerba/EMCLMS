from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import Notification, User


@api_view(["POST"])
def mark_notification_read(request, notification_id):
    """
    Marks a single notification as read.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=401)

    try:
        notification = Notification.objects.get(notification_id=notification_id)
    except Notification.DoesNotExist:
        return Response({"detail": "Notification not found."}, status=404)

    # Ensure the notification belongs to the requesting user
    if notification.user != user:
        return Response(
            {"detail": "You do not have permission to perform this action."}, status=403
        )

    notification.status = Notification.Status.READ
    notification.save()

    return Response({"detail": "Notification marked as read."})
