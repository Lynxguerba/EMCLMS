# views.py

from django.db.models import Count, F, Q
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from ..models import User, Course, Section
from ..utils import is_admin_or_superadmin


@api_view(["GET"])
def admin_get_course_completion(request):
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

    if not is_admin_or_superadmin(user):
        return Response(
            {"detail": "You do not have permission to perform this action."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # 1. Annotate each course with the total number of sections and the number of completed sections.
    # We use a subquery to count completed sections per course.
    school_year = request.query_params.get("school_year")
    course_filter = {}
    if school_year and school_year != "All":
        course_filter["school_year__school_year"] = school_year

    courses_with_completion = (
        Course.objects.filter(**course_filter)
        .annotate(
            total_sections=Count("section"),
            completed_sections=Count("section", filter=Q(section__is_completed=True)),
        )
        .exclude(total_sections=0)
        .annotate(
            completion_percentage=F("completed_sections") * 100 / F("total_sections")
        )
        .exclude(completion_percentage__gte=100)
        .order_by("-completion_percentage")
    )

    top_courses = courses_with_completion[:4]

    data = [
        {
            "course_title": course.course_title,
            "completion_percentage": round(course.completion_percentage, 2),
        }
        for course in top_courses
    ]

    return Response(data, status=status.HTTP_200_OK)
