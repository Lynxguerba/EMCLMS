from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.apps import apps
from ..models import User, Section


@api_view(["PUT"])
def instructor_update_section(request, section_id):
    # Auth
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)

    # Only instructors can edit sections
    if user.user_type != "Instructor":
        return Response({"detail": "Forbidden"}, status=403)

    # Validate Section existence
    try:
        section = Section.objects.get(section_id=section_id)
    except Section.DoesNotExist:
        return Response({"detail": "Section not found"}, status=404)

    data = request.data
    section_title = data.get("section_title")
    description = data.get("description")

    if not section_title:
        return Response({"detail": "Section title is required"}, status=400)

    # Update fields
    section.section_title = section_title
    section.description = description or ""
    section.save()

    return Response(
        {
            "detail": "Section updated successfully",
            "section": {
                "section_id": section.section_id,
                "section_title": section.section_title,
                "description": section.description,
                "updated_at": section.updated_at,
            },
        },
        status=200,
    )
