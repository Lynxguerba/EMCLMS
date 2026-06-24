from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import Course, User

@api_view(["GET"])
def accounting_get_all_courses(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)
    
    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)
    
    if user.user_type != "Accounting":
        return Response({"detail": "Forbidden"}, status=403)

    courses = Course.objects.all().select_related("instructor", "school_year")
    data = [
        {
            "id": c.course_id,
            "course_code": c.course_code,
            "course_title": c.course_title,
            "instructor_name": f"{c.instructor.first_name} {c.instructor.last_name}",
            "school_year": c.school_year.school_year if c.school_year else None
        }
        for c in courses
    ]
    return Response(data)
