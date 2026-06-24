from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from ..models import User, Enrollment

@api_view(["GET"])
def get_student_enrollments(request, student_id):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=student_id, user_type="Student")
    except User.DoesNotExist:
        return Response(
            {"detail": "Student not found."}, status=status.HTTP_404_NOT_FOUND
        )

    enrollments = Enrollment.objects.filter(user=user).select_related("course")
    data = [
        {
            "enrollment_id": e.enrollment_id,
            "course_title": e.course.course_title,
            "course_code": e.course.course_code,
            "enrollment_date": e.enrollment_date,
        }
        for e in enrollments
    ]
    return Response(data, status=status.HTTP_200_OK)
