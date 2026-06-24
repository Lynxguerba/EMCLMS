# views/instructor_views.py (or wherever you place instructor-specific views)

from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import Course, Enrollment, User
from django.conf import settings  # Import settings
from django.db.models import Prefetch


@api_view(["GET"])
def instructor_get_courses_with_students(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)

    if user.user_type != "Instructor":
        return Response({"detail": "Forbidden"}, status=403)

    # Get courses belonging to this instructor with their student enrollments prefetched
    school_year = request.query_params.get("school_year")
    course_filter = {"instructor": user}
    if school_year and school_year != "All":
        course_filter["school_year__school_year"] = school_year

    courses = Course.objects.filter(**course_filter).prefetch_related(
        Prefetch(
            "enrollment_set",
            queryset=Enrollment.objects.select_related("student"),
            to_attr="active_enrollments",
        )
    )

    data = []
    for course in courses:
        # Use prefetched enrollments
        active_enrollments = course.active_enrollments

        users = []
        for e in active_enrollments:
            profile_pic_url = None
            if e.student.profile_picture:
                # Construct the absolute URL for the profile picture
                profile_pic_url = request.build_absolute_uri(
                    settings.MEDIA_URL + str(e.student.profile_picture)
                )

            users.append(
                {
                    "user_id": e.student.user_id,
                    "email": e.student.email,
                    "first_name": e.student.first_name,
                    "last_name": e.student.last_name,
                    "profile_picture_url": profile_pic_url,
                }
            )

        data.append(
            {
                "course_id": course.course_id,
                "course_code": course.course_code,
                "course_title": course.course_title,
                "description": course.description,
                "users": users,
            }
        )

    return Response(data, status=200)
