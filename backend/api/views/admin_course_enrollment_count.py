from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Count, Q
from ..models import Course, User
from ..utils import is_admin_or_superadmin

@api_view(["GET"])
def admin_course_enrollment_count(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)

    if not is_admin_or_superadmin(user):
        return Response({"detail": "Forbidden"}, status=403)

    school_year = request.query_params.get("school_year")
    course_filter = {}
    if school_year and school_year != "All":
        course_filter["school_year__school_year"] = school_year

    courses = (
        Course.objects.filter(**course_filter)
        .annotate(count=Count("enrollment"))
        .values("course_code", "count")
        .order_by("course_code")
    )

    return Response(list(courses), status=200)
