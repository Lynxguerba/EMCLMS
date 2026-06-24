from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import Content, User, FileDownload


@api_view(["POST"])
def record_download(request, content_id):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        content = Content.objects.get(content_id=content_id)
    except Content.DoesNotExist:
        return Response({"detail": "Content not found"}, status=404)

    # Only students can record downloads (or instructors too? usually students)
    if user.user_type != "Student":
        return Response({"detail": "Only students can record downloads"}, status=403)

    # Record the download (get_or_create to avoid duplicates)
    FileDownload.objects.get_or_create(content=content, user=user)

    return Response({"detail": "Download recorded successfully"}, status=201)
