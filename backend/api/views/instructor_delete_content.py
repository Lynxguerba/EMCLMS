from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import User, Content, ContentFile, Grade, SubmissionFile
from django.db import transaction

@api_view(["DELETE"])
def instructor_delete_content(request, content_id):
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

    try:
        with transaction.atomic():
            # Delete instructor-uploaded ContentFiles from storage
            content_files_to_delete = ContentFile.objects.filter(content=content)
            for f in content_files_to_delete:
                f.file.delete(save=False)

            # Delete student-submitted SubmissionFiles from storage
            # Find all grades related to this content
            grades_for_content = Grade.objects.filter(content=content)
            for grade in grades_for_content:
                submission_files_to_delete = SubmissionFile.objects.filter(grade=grade)
                for sf in submission_files_to_delete:
                    sf.file.delete(save=False)

            # Delete the content object, which will cascade and delete
            # ContentFile records, Grade records, and SubmissionFile records from the database.
            content.delete()

        return Response({"detail": "Content and all associated files deleted successfully"}, status=200)
    except Exception as e:
        return Response({"detail": f"An error occurred: {str(e)}"}, status=500)
