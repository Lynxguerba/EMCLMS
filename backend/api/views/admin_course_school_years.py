# backend/api/views/admin_course_school_years.py


from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import User, CourseSchoolYear, Course
from ..utils import is_admin_or_superadmin
import re


@api_view(["GET", "POST"])
def admin_course_school_years(request):
    """
    GET → list all course school years
    POST → create a new CourseSchoolYear (Admin only)
    """
    if request.method == "GET":
        items = CourseSchoolYear.objects.all().order_by("-school_year_id")
        data = [
            {"school_year_id": i.school_year_id, "school_year": i.school_year}
            for i in items
        ]
        return Response(data)

    # POST
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        current_user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)

    if not is_admin_or_superadmin(current_user):
        return Response({"detail": "Forbidden"}, status=403)

    school_year = (request.data.get("school_year") or "").strip()
    if not school_year:
        return Response({"detail": "school_year cannot be empty"}, status=400)

    # enforce format: YYYY-YYYY [1st|2nd] semester
    pattern = r"^\d{4}-\d{4} (1st|2nd) semester$"
    if not re.match(pattern, school_year):
        return Response(
            {
                "detail": (
                    "Invalid format. Use 'YYYY-YYYY 1st semester' or "
                    "'YYYY-YYYY 2nd semester'. Example: 2024-2025 1st semester."
                )
            },
            status=400,
        )

    # Optional: ensure the years make sense
    start_year, end_year = map(int, school_year.split(" ")[0].split("-"))
    if end_year != start_year + 1:
        return Response({"detail": "End year must be start year + 1."}, status=400)

    if CourseSchoolYear.objects.filter(school_year=school_year).exists():
        return Response({"detail": "school_year already exists"}, status=400)

    obj = CourseSchoolYear.objects.create(school_year=school_year)
    return Response(
        {"message": "Created", "school_year_id": obj.school_year_id}, status=201
    )


@api_view(["DELETE"])
def admin_delete_course_school_year(request, school_year_id):
    """
    DELETE a CourseSchoolYear by id (Admin only).
    Prevent deletion if any Course references it.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        current_user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)

    if not is_admin_or_superadmin(current_user):
        return Response({"detail": "Forbidden"}, status=403)

    try:
        sy = CourseSchoolYear.objects.get(school_year_id=school_year_id)
    except CourseSchoolYear.DoesNotExist:
        return Response({"detail": "Not found"}, status=404)

    if Course.objects.filter(school_year=sy).exists():
        return Response(
            {"detail": "Cannot delete: courses reference this school year."}, status=400
        )

    sy.delete()
    return Response({"message": "Deleted"}, status=200)
