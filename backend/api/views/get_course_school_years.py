from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from ..models import User, CourseSchoolYear

@api_view(["GET"])
def get_course_school_years(request):
    """
    Returns all CourseSchoolYear rows.
    Authenticated: only Instructor or Student can access.
    """
    # --- Auth: get user_id from session ---
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    # --- Permissions ---
    if user.user_type not in ["Instructor", "Student", "Administrator", "Superadmin", "Librarian", "Accounting"]:
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    # --- Fetch all CourseSchoolYear rows ---
    rows = list(CourseSchoolYear.objects.values("school_year_id", "school_year").order_by("school_year_id"))

    return Response(rows, status=status.HTTP_200_OK)
