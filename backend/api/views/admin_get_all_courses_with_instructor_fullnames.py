from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import Course, User


from ..utils import is_admin_or_superadmin


@api_view(["GET"])
def admin_get_all_courses_with_instructor_fullnames(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)

    if not is_admin_or_superadmin(user):
        return Response({"detail": "Forbidden"}, status=403)

    courses = Course.objects.select_related("instructor", "school_year").prefetch_related("schedules").all()
    data = [
        {
            "course_id": course.course_id,
            "course_code": course.course_code,
            "course_title": course.course_title,
            "description": course.description,
            "instructor_name": f"{course.instructor.first_name} {course.instructor.last_name}",
            "school_year": (
                course.school_year.school_year if course.school_year else None
            ),
            "school_year_id": (
                course.school_year.school_year_id if course.school_year else None
            ),
            "schedules": list(course.schedules.values("day_of_week", "start_time", "end_time"))
        }
        for course in courses
    ]

    return Response(data, status=200)
