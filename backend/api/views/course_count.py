from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from ..models import Course, User
from ..utils import is_admin_or_superadmin

@api_view(["GET"])
def course_count(request):
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

    school_year = request.query_params.get("school_year")
    course_filter = {}
    if school_year and school_year != "All":
        course_filter["school_year__school_year"] = school_year

    count = Course.objects.filter(**course_filter).count()
    return Response({"count": count}, status=status.HTTP_200_OK)
