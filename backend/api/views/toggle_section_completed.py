from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import Section, User


@api_view(["PUT"])
def toggle_section_completed(request, section_id):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        section = Section.objects.get(section_id=section_id)
    except Section.DoesNotExist:
        return Response({"detail": "Section not found"}, status=404)

    # Only instructor of the course can toggle
    if user.user_type != "Instructor" or section.course.instructor != user:
        return Response({"detail": "Unauthorized"}, status=401)

    # Flip the current value
    section.is_completed = not section.is_completed
    section.save(update_fields=["is_completed", "updated_at"])

    return Response(
        {
            "section_id": section.section_id,
            "is_completed": section.is_completed,
        }
    )
