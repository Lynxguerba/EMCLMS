from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import Course, Enrollment, User

@api_view(["GET"])
def instructor_student_count(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "Unauthorized"}, status=401)

    if user.user_type != "Instructor":
        return Response({"detail": "Unauthorized"}, status=401)

    school_year = request.query_params.get("school_year")
    course_filter = {"instructor": user}
    if school_year and school_year != "All":
        course_filter["school_year__school_year"] = school_year

    courses = Course.objects.filter(**course_filter).values_list("course_id", flat=True)
    count = (
        Enrollment.objects.filter(course_id__in=courses)
        .values("student")
        .distinct()
        .count()
    )

    return Response({"count": count})
