from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
from ..models import User, Grade, Content, Notification


@api_view(["PATCH"])
def instructor_update_grade(request, grade_id):
    # 1. Check session
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    # 2. Validate user
    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "Unauthorized"}, status=401)

    # 3. Ensure user is Instructor
    if user.user_type != "Instructor":
        return Response({"detail": "Unauthorized"}, status=401)

    # 4. Fetch grade
    try:
        grade = Grade.objects.select_related("user", "content").get(grade_id=grade_id)
    except Grade.DoesNotExist:
        return Response({"detail": "Grade not found"}, status=404)

    # 5. Ensure instructor owns the course of this content
    if grade.content.section.course.instructor != user:
        return Response({"detail": "Unauthorized"}, status=401)

    # 6. Update fields
    score = request.data.get("score")
    feedback = request.data.get("feedback")

    if score is not None:
        # Get total score from the content
        total_score = grade.content.total_score or 0

        # Prevent grades higher than total_score
        try:
            numeric_score = float(score)
        except (TypeError, ValueError):
            return Response({"detail": "Invalid score format."}, status=400)

        if total_score and numeric_score > float(total_score):
            return Response(
                {"detail": f"Score cannot exceed total score ({total_score})."},
                status=400,
            )

        grade.score = numeric_score
        # Normalize to 100 if total_score is defined and > 0
        if total_score and total_score > 0:
            grade.normalized_score = round(
                (numeric_score / float(total_score)) * 100, 2
            )
        else:
            grade.normalized_score = None

        grade.status = "Graded"
        grade.graded_at = timezone.now()

    if feedback is not None:
        grade.feedback = feedback

    grade.save()

    # Create a notification for the student
    student = grade.user
    content_title = grade.content.content_title
    title = "Submission Graded"
    message = f"Your submission for '{content_title}' has been graded."
    Notification.objects.create(
        user=student,
        title=title,
        message=message,
        status=Notification.Status.UNREAD,
    )

    # 7. Response payload
    data = {
        "grade_id": grade.grade_id,
        "user_id": grade.user.user_id,
        "content_id": grade.content.content_id,
        "score": grade.score,
        "normalized_score": grade.normalized_score,
        "feedback": grade.feedback,
        "status": grade.status,
        "graded_at": grade.graded_at,
    }
    return Response(data)
