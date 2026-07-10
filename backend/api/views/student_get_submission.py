from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import Content, Grade, User, SubmissionFile
from .file_helpers import serialize_submission_file


@api_view(["GET"])
def student_get_submission(request, content_id):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
        content = Content.objects.get(content_id=content_id)
    except (User.DoesNotExist, Content.DoesNotExist):
        return Response({"detail": "Not found"}, status=404)

    if user.user_type != "Student":
        return Response({"detail": "Forbidden"}, status=403)

    try:
        grade = Grade.objects.get(user=user, content=content)
        submission_files = SubmissionFile.objects.filter(grade=grade)
        files = [
            serialize_submission_file(request, file)
            for file in submission_files
        ]
    except Grade.DoesNotExist:
        return Response({"submitted": False})

    return Response(
        {
            "submitted": True,
            "files": files,
            "score": grade.score,
            "feedback": grade.feedback,
            "status": grade.status,
            "graded_at": grade.graded_at,
            "submitted_at": grade.submitted_at,
        }
    )
