from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.core.files.base import ContentFile
from ..models import User
from django.core.files.storage import default_storage


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def user_update_profile(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "Unauthorized"}, status=401)

    new_password = request.data.get("new_password")
    profile_picture = request.FILES.get("profile_picture")

    # --- Password Update ---
    if new_password:
        if len(new_password) < 8:
            return Response(
                {"detail": "Password must be at least 8 characters"}, status=400
            )
        user.set_password(new_password)

    # --- Picture Upload ---
    if profile_picture:
        # --- Delete old profile picture if it exists ---
        if user.profile_picture and user.profile_picture.name:
            old_file = user.profile_picture.name
            if default_storage.exists(old_file):
                default_storage.delete(old_file)

        # --- Save new picture ---
        filename = f"{user.user_id}_{profile_picture.name}"
        user.profile_picture.save(filename, profile_picture, save=False)

    user.save()

    return Response(
        {
            "success": True,
            "user": {
                "user_id": user.user_id,
                "profile_picture": (
                    user.profile_picture.url if user.profile_picture else None
                ),
            },
        }
    )
