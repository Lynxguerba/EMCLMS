from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import Content, Grade, User

@api_view(["GET"])
def get_submission(request, content_id):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
        content = Content.objects.get(content_id=content_id)
    except (User.DoesNotExist, Content.DoesNotExist):
        return Response({"detail": "Not found"}, status=404)

    try:
        grade = Grade.objects.get(user=user, content=content)
    except Grade.DoesNotExist:
        return Response({"submitted": False})

    return Response(
        {
            "submitted": True,
            "file_path": grade.file_path,
            "score": grade.score,
            "feedback": grade.feedback,
            "status": grade.status,
            "graded_at": grade.graded_at,
        }
    )
