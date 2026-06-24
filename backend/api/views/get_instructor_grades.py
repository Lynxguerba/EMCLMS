from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import Grade, Content, User, SubmissionFile


@api_view(["GET"])
def get_instructor_grades(request, content_id):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        instructor = User.objects.get(user_id=user_id, user_type="Instructor")
    except User.DoesNotExist:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        content = Content.objects.select_related("section__course").get(
            content_id=content_id
        )
    except Content.DoesNotExist:
        return Response({"detail": "Content not found"}, status=404)

    # Ensure instructor owns this course
    if content.section.course.instructor != instructor:
        return Response({"detail": "Unauthorized"}, status=401)

    grades = (
        Grade.objects.select_related("user")
        .prefetch_related("submission_files")
        .filter(content=content)
    )

    grade_data = []
    for g in grades:
        submission_files = [
            {
                "id": f.id,
                "file_url": f.file.url,
                "uploaded_at": f.uploaded_at,
            }
            for f in g.submission_files.all()
        ]

        grade_data.append(
            {
                "id": g.grade_id,
                "student_id": g.user.user_id,
                "first_name": g.user.first_name,
                "last_name": g.user.last_name,
                "score": g.score,
                "feedback": g.feedback,
                "status": g.status,
                "submission_files": submission_files,
                "submitted_at": g.submitted_at,
            }
        )

    return Response(
        {
            "content_title": content.content_title,
            "grades": grade_data,
            "total_score": content.total_score,
            "due_date": content.due_date,
        }
    )
