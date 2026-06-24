from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import Course, Section, User

@api_view(["POST"])
def add_section(request, course_id):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
        course = Course.objects.get(course_id=course_id)
    except User.DoesNotExist:
        return Response({"detail": "Unauthorized"}, status=401)
    except Course.DoesNotExist:
        return Response({"detail": "Course not found"}, status=404)

    if user.user_type != "Instructor" or course.instructor != user:
        return Response({"detail": "Unauthorized"}, status=401)

    section_title = request.data.get("section_title")
    description = request.data.get("description", "")
    order_in_course = request.data.get("order_in_course")

    if not section_title:
        return Response({"detail": "section_title is required"}, status=400)

    if order_in_course is not None:
        try:
            order_in_course = int(order_in_course)
        except ValueError:
            return Response(
                {"detail": "order_in_course must be an integer"}, status=400
            )

    section = Section.objects.create(
        course=course,
        section_title=section_title,
        description=description,
        order_in_course=order_in_course,
    )

    return Response(
        {
            "section_id": section.section_id,
            "section_title": section.section_title,
            "description": section.description,
            "order_in_course": section.order_in_course,
        },
        status=201,
    )
