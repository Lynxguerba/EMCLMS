from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from ..models import Content, User

@api_view(["GET"])
def instructor_get_content_title(request, content_id):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response(
            {"detail": "Authentication credentials were not provided."},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    if user.user_type != "Instructor":
        return Response(
            {"detail": "You do not have permission to perform this action."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        content = Content.objects.get(content_id=content_id)
        return Response(
            {"content_title": content.content_title}, status=status.HTTP_200_OK
        )
    except Content.DoesNotExist:
        return Response(
            {"detail": "Content not found."}, status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        print(f"Error fetching content title: {e}")
        return Response(
            {"detail": "Could not fetch content title."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
