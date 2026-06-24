from django.db.models import Count
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from ..models import User
from ..utils import is_admin_or_superadmin


@api_view(["GET"])
def admin_get_user_count(request, argument_type):
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

    if argument_type == "student":
        queryset = User.objects.filter(user_type="Student")
        if school_year and school_year != "All":
            queryset = queryset.filter(enrollment__course__school_year__school_year=school_year).distinct()
        student_count = queryset.count()
        return Response({"count": student_count}, status=status.HTTP_200_OK)

    elif argument_type == "program":
        queryset = User.objects.filter(user_type="Student")
        if school_year and school_year != "All":
            queryset = queryset.filter(enrollment__course__school_year__school_year=school_year).distinct()
        program_counts = (
            queryset.values("program")
            .annotate(count=Count("program"))
        )
        return Response({"programs": list(program_counts)}, status=status.HTTP_200_OK)

    elif argument_type == "instructor":
        queryset = User.objects.filter(user_type="Instructor")
        if school_year and school_year != "All":
            queryset = queryset.filter(course__school_year__school_year=school_year).distinct()
        instructor_count = queryset.count()
        return Response({"count": instructor_count}, status=status.HTTP_200_OK)

    else:
        return Response(
            {
                "detail": "Invalid argument. Please use 'student', 'program', or 'instructor'."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
