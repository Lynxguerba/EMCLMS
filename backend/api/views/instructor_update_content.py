from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import User, Content, ContentFile
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from datetime import datetime


@api_view(["PUT"])
def instructor_update_content(request, content_id):
    # --- Auth ---
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)

    if user.user_type != "Instructor":
        return Response({"detail": "Forbidden"}, status=403)

    # --- Get content ---
    try:
        content = Content.objects.get(content_id=content_id)
    except Content.DoesNotExist:
        return Response({"detail": "Content not found"}, status=404)

    data = request.data

    # --- Update content fields ---
    content.content_title = data.get("content_title", content.content_title)
    content.content_description = data.get(
        "content_description", content.content_description
    )
    content.content_type = data.get("content_type", content.content_type)
    # Parse due_date (ISO string -> aware datetime), allow empty/null to clear
    due_date_val = data.get("due_date", None)
    if due_date_val in [None, "", "null"]:
        content.due_date = None
    else:
        try:
            # Accept full ISO with timezone or naive ISO; make aware in current timezone if naive
            parsed = datetime.fromisoformat(due_date_val)
            if parsed.tzinfo is None:
                content.due_date = timezone.make_aware(
                    parsed, timezone.get_current_timezone()
                )
            else:
                content.due_date = parsed
        except Exception:
            # If parsing fails, leave the previous value unchanged
            pass
    content.order_in_section = data.get("order_in_section", content.order_in_section)

    # Handle total_score if provided
    total_score_val = data.get("total_score")
    if total_score_val not in [None, ""]:
        try:
            content.total_score = Decimal(total_score_val)
        except Exception:
            pass

    content.save()

    # --- Handle file uploads ---
    if request.FILES:
        with transaction.atomic():
            for f in request.FILES.getlist("files"):
                ContentFile.objects.create(content=content, file=f)
    # --- Handle deleted files ---
    deleted_file_ids = data.get("deleted_file_ids", [])
    # If it's a JSON string, parse it
    if isinstance(deleted_file_ids, str):
        try:
            import json

            deleted_file_ids = json.loads(deleted_file_ids)
        except Exception:
            deleted_file_ids = []

    if isinstance(deleted_file_ids, list) and deleted_file_ids:
        files_to_delete = ContentFile.objects.filter(
            content=content, id__in=deleted_file_ids
        )
        for f in files_to_delete:
            f.file.delete(save=False)
            f.delete()

    # --- Prepare response with related files ---
    files_data = [
        {
            "id": f.id,
            "file": f.file.url,
            "uploaded_at": f.uploaded_at,
        }
        for f in content.files.all()
    ]

    return Response(
        {
            "content_id": content.content_id,
            "section_id": content.section.section_id,
            "content_title": content.content_title,
            "content_description": content.content_description,
            "content_type": content.content_type,
            "due_date": content.due_date,
            "order_in_section": content.order_in_section,
            "is_active": content.is_active,  # computed on the server
            "total_score": getattr(content, "total_score", None),
            "created_at": content.created_at,
            "updated_at": content.updated_at,
            "files": files_data,
        },
        status=200,
    )
