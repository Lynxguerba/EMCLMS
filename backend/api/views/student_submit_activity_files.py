from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import Content, Grade, User, SubmissionFile
from django.db import transaction
from django.utils import timezone


@api_view(["POST"])
def student_submit_activity_files(request, content_id):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
        content = Content.objects.get(content_id=content_id)
    except (User.DoesNotExist, Content.DoesNotExist):
        return Response({"detail": "Not found"}, status=404)

    if user.user_type != "Student":
        return Response({"detail": "Forbidden"}, status=403)

    if content.content_type != "Activity":
        return Response({"detail": "Not an activity"}, status=400)

    keep_files = request.data.getlist("keep_files")  # IDs of files to keep
    new_files = request.FILES.getlist("files")
    confirm = request.data.get("confirm") == "true"

    try:
        with transaction.atomic():
            grade, created = Grade.objects.get_or_create(
                user=user, content=content, defaults={"status": "Pending"}
            )

            # Prevent modification if already submitted or graded
            if not created and grade.status in ["Submitted", "Late", "Graded"]:
                return Response(
                    {"detail": "Submission is locked and cannot be modified."},
                    status=403,
                )

            # Delete only files not in keep_files
            if keep_files:
                files_to_delete = grade.submission_files.exclude(id__in=keep_files)
            else:
                files_to_delete = grade.submission_files.all()

            for f in files_to_delete:
                f.file.delete(save=False)
                f.delete()

            # Add new files
            MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB
            for file in new_files:
                if file.size > MAX_FILE_SIZE:
                    raise ValueError(f"File '{file.name}' exceeds the 20MB limit.")
                SubmissionFile.objects.create(grade=grade, file=file)

            # Update status and submission timestamp based on confirmation
            if grade.submission_files.exists():
                if confirm:
                    grade.submitted_at = timezone.now()
                    if content.due_date and timezone.now() > content.due_date:
                        grade.status = "Late"
                    else:
                        grade.status = "Submitted"
                else:
                    grade.status = "Pending"
                    # We don't set submitted_at for drafts
            else:
                grade.status = "Pending"
                grade.submitted_at = None

            grade.save()

    except Exception as e:
        return Response({"detail": str(e)}, status=400)

    # Build response with updated submission files
    files_data = [
        {
            "id": f.id,
            "file_name": f.file.name.split("/")[-1],
            "file_url": request.build_absolute_uri(f.file.url),
        }
        for f in grade.submission_files.all()
    ]

    return Response(
        {
            "message": "Submission updated",
            "status": grade.status,
            "files": files_data,
        }
    )
