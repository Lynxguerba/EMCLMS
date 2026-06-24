from django.db.models import Count, Q
from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import Section, Content, User, FileDownload, Grade


@api_view(["GET"])
def section_content(request, section_id):
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

    is_instructor = user.user_type == "Instructor"
    if is_instructor and section.course.instructor != user:
        return Response({"detail": "Unauthorized"}, status=401)

    total_enrolled = 0
    if is_instructor:
        total_enrolled = section.course.enrollment_set.count()

    contents = (
        Content.objects.filter(section=section)
        .prefetch_related("files")
        .order_by("order_in_section")
    )

    data = []
    for content in contents:
        files = [
            {
                "id": f.id,
                "file": request.build_absolute_uri(f.file.url),
                "uploaded_at": f.uploaded_at,
            }
            for f in content.files.all()
            if f.file
        ]

        item = {
            "content_id": content.content_id,
            "content_title": content.content_title,
            "content_type": content.content_type,
            "due_date": content.due_date.isoformat() if content.due_date else None,
            "order_in_section": content.order_in_section,
            "files": files,
            "is_active": content.is_active,
            "content_description": content.content_description,
            "total_score": content.total_score,
        }

        if is_instructor:
            item["total_enrolled"] = total_enrolled
            # Get download count
            item["download_count"] = FileDownload.objects.filter(content=content).count()
            
            # Get submission count (for Activities)
            if content.content_type == "Activity":
                item["submission_count"] = Grade.objects.filter(
                    content=content, 
                    status__in=["Submitted", "Graded", "Late"]
                ).count()
            else:
                item["submission_count"] = 0

        data.append(item)

    return Response(data)
