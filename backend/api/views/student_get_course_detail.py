from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from ..models import Course, Enrollment, User

@api_view(["GET"])
def student_get_course_detail(request, course_id):
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

    if user.user_type != "Student":
        return Response(
            {"detail": "You do not have permission to perform this action."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        course = Course.objects.get(course_id=course_id)
        # Check enrollment
        if not Enrollment.objects.filter(student=user, course=course).exists():
            return Response(
                {"detail": "You are not enrolled in this course."},
                status=status.HTTP_403_FORBIDDEN,
            )
        data = {
            "course_id": course.course_id,
            "course_code": course.course_code,
            "course_title": course.course_title,
            "description": course.description,
            "instructor": course.instructor.user_id,
            "instructor_fullname": f"{course.instructor.first_name} {course.instructor.last_name}",
            "schedules": list(course.schedules.values("day_of_week", "start_time", "end_time"))
        }
        return Response(data, status=status.HTTP_200_OK)
    except Course.DoesNotExist:
        return Response({"detail": "Course not found."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Error fetching course: {e}")
        return Response(
            {"detail": "Could not fetch course."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
