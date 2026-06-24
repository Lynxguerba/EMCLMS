from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from ..models import Course, Enrollment, User

@api_view(["GET"])
def student_get_all_courses(request):
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
        school_year = request.query_params.get("school_year")
        enrollment_filter = {"student": user}
        if school_year and school_year != "All":
            enrollment_filter["course__school_year__school_year"] = school_year

        enrollments = Enrollment.objects.filter(**enrollment_filter).select_related(
            "course", "course__instructor", "course__school_year"
        ).prefetch_related("course__schedules")
        data = []
        for enrollment in enrollments:
            course = enrollment.course
            data.append(
                {
                    "course_id": course.course_id,
                    "course_code": course.course_code,
                    "course_title": course.course_title,
                    "description": course.description,
                    "instructor": course.instructor.user_id,
                    "instructor_fullname": f"{course.instructor.first_name} {course.instructor.last_name}",
                    "school_year": course.school_year.school_year,
                    "schedules": list(course.schedules.values("day_of_week", "start_time", "end_time"))
                }
            )
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"Error fetching courses: {e}")
        return Response(
            {"detail": "Could not fetch courses."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
