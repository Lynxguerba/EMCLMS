from urllib.parse import quote
import urllib.parse

from django.http import HttpResponseRedirect
from rest_framework.decorators import api_view
from rest_framework.response import Response

from ..models import ContentFile, Enrollment, FileDownload, User
from core.google_drive_storage import GoogleDriveStorage


def build_file_url(request, file_field, attachment=False, filename=None):
    if not file_field:
        return None

    try:
        storage_class = file_field.storage.__class__.__name__
        if "Cloudinary" in storage_class:
            from cloudinary.utils import cloudinary_url as cld_url
            import cloudinary as cld_lib

            resource_type = "raw" if "Raw" in storage_class else "image"
            options = {
                "resource_type": resource_type,
                "type": "upload",
                "sign_url": True,
            }
            if attachment and filename:
                options["flags"] = f"attachment:{urllib.parse.quote(filename)}"

            # Only attempt signed URL generation if cloudinary SDK is configured
            if cld_lib.config().cloud_name:
                url, _ = cld_url(file_field.name, **options)
                if url:
                    if url.startswith("//"):
                        return f"https:{url}"
                    if url.startswith(("http://", "https://")):
                        return url

            # Fallback: use the storage backend's own .url property
            # (django-cloudinary-storage generates correct Cloudinary URLs)
            url = file_field.url
            if url:
                if url.startswith("//"):
                    return f"https:{url}"
                if url.startswith(("http://", "https://")):
                    # For attachment downloads, inject the fl_attachment flag
                    if attachment and filename:
                        url = cloudinary_attachment_url(url, filename)
                    return url
                return request.build_absolute_uri(url)
        elif "GoogleDrive" in storage_class:
            from core.google_drive_service import get_view_url, get_download_url
            file_id = GoogleDriveStorage._extract_file_id(file_field.name)
            if attachment:
                return get_download_url(file_id)
            return get_view_url(file_id)
    except Exception:
        pass

    # Final fallback for non-Cloudinary/GoogleDrive or any error
    try:
        url = file_field.url
    except Exception:
        return None

    if url.startswith(("http://", "https://", "//")):
        return f"https:{url}" if url.startswith("//") else url

    return request.build_absolute_uri(url)


def get_file_name(file_field):
    if not file_field:
        return ""

    return file_field.name.split("/")[-1]


def serialize_content_file(request, content_file):
    file_url = build_file_url(request, content_file.file)
    file_name = get_file_name(content_file.file)

    return {
        "id": content_file.id,
        "file": file_url,
        "file_url": file_url,
        "file_name": file_name,
        "uploaded_at": content_file.uploaded_at,
    }


def serialize_submission_file(request, submission_file):
    file_url = build_file_url(request, submission_file.file)
    file_name = get_file_name(submission_file.file)

    return {
        "id": submission_file.id,
        "file_url": file_url,
        "file_name": file_name,
        "uploaded_at": getattr(submission_file, "uploaded_at", None),
    }


def cloudinary_attachment_url(url, file_name):
    if not url or "/upload/" not in url:
        return url

    attachment_flag = "fl_attachment"
    if file_name:
        attachment_flag = f"{attachment_flag}:{quote(file_name)}"

    if f"/upload/{attachment_flag}/" in url or "/upload/fl_attachment/" in url:
        return url

    return url.replace("/upload/", f"/upload/{attachment_flag}/", 1)


def user_can_access_content_file(user, content_file):
    course = content_file.content.section.course

    if user.user_type in ["Administrator", "Superadmin"]:
        return True

    if user.user_type == "Instructor":
        return course.instructor_id == user.user_id

    if user.user_type == "Student":
        return Enrollment.objects.filter(student=user, course=course).exists()

    return False


def get_authorized_content_file(request, file_id):
    user_id = request.session.get("user_id")
    if not user_id:
        return None, Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return None, Response({"detail": "Unauthorized"}, status=401)

    try:
        content_file = ContentFile.objects.select_related(
            "content__section__course__instructor"
        ).get(id=file_id)
    except ContentFile.DoesNotExist:
        return None, Response({"detail": "File not found"}, status=404)

    if not user_can_access_content_file(user, content_file):
        return None, Response({"detail": "Forbidden"}, status=403)

    return (user, content_file), None


@api_view(["GET"])
def open_content_file(request, file_id):
    result, error = get_authorized_content_file(request, file_id)
    if error:
        return error

    _, content_file = result
    file_url = build_file_url(request, content_file.file)
    if not file_url:
        return Response({"detail": "File URL not available"}, status=404)

    return Response({"url": file_url})


@api_view(["GET"])
def download_content_file(request, file_id):
    result, error = get_authorized_content_file(request, file_id)
    if error:
        return error

    user, content_file = result
    if user.user_type == "Student":
        FileDownload.objects.get_or_create(
            content=content_file.content,
            user=user,
        )

    file_name = get_file_name(content_file.file)
    download_url = build_file_url(request, content_file.file, attachment=True, filename=file_name)
    if not download_url:
        return Response({"detail": "File URL not available"}, status=404)

    return Response({"url": download_url})
