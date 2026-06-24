from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import Course, User

@api_view(["GET"])
def get_instructor_courses(request):
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

    courses = Course.objects.filter(**course_filter).select_related("school_year")
    data = [
        {
            "course_id": c.course_id,
            "course_title": c.course_title,
            "course_code": c.course_code,
            "description": c.description,
            "school_year": c.school_year.school_year,
            "schedules": [
                {
                    "day_of_week": s.day_of_week,
                    "start_time": s.start_time.strftime("%H:%M:%S"),
                    "end_time": s.end_time.strftime("%H:%M:%S"),
                }
                for s in c.schedules.all()
            ],
        }
        for c in courses
    ]
    return Response(data)
