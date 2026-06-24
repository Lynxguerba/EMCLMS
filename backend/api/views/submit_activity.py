from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.core.files.storage import default_storage
from ..models import Content, Grade, User

@api_view(["POST"])
def submit_activity(request, content_id):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
        content = Content.objects.get(content_id=content_id)
    except (User.DoesNotExist, Content.DoesNotExist):
        return Response({"detail": "Not found"}, status=404)

    if content.content_type != "Activity":
        return Response({"detail": "Not an activity"}, status=400)

    file = request.FILES.get("file")
    if not file:
        return Response({"detail": "No file uploaded"}, status=400)

    file_path = default_storage.save(
        f"submissions/user_{user.user_id}/{file.name}", file
    )

    grade, _ = Grade.objects.get_or_create(user=user, content=content)
    grade.file_path = file_path
    grade.status = "Submitted"
    grade.save()

    return Response({"message": "Submission successful", "file_path": file_path})
