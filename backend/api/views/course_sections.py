from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import Course, Section, User


@api_view(["GET"])
def course_sections(request, course_id):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        course = Course.objects.get(course_id=course_id)
    except Course.DoesNotExist:
        return Response({"detail": "Course not found"}, status=404)

    if user.user_type == "Instructor" and course.instructor != user:
        return Response({"detail": "Unauthorized"}, status=401)

    sections = Section.objects.filter(course=course).order_by("order_in_course")
    data = [
        {
            "section_id": section.section_id,
            "section_title": section.section_title,
            "description": section.description,
            "order_in_course": section.order_in_course,
            "is_completed": section.is_completed,
        }
        for section in sections
    ]
    return Response(data)
