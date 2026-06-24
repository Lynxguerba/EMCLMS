from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import Notification, User


@api_view(["POST"])
def mark_all_notifications_read(request):
    """
    Marks all unread notifications for the current user as read.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=401)

    # Find all unread notifications for the user and update them in a single query
    Notification.objects.filter(user=user, status=Notification.Status.UNREAD).update(
        status=Notification.Status.READ
    )

    return Response({"detail": "All notifications marked as read."})
