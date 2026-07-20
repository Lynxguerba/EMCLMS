import io
import json
import logging
import mimetypes
import os

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload, MediaIoBaseDownload

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/drive"]

_service = None


def _get_credentials():
    """Parse service account credentials from the GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON env var."""
    json_str = os.environ.get("GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON", "")
    if not json_str:
        raise RuntimeError("GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON environment variable is not set")
    try:
        info = json.loads(json_str)
    except json.JSONDecodeError:
        raise RuntimeError("GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON is not valid JSON")
    return service_account.Credentials.from_service_account_info(info, scopes=SCOPES)


def _get_service():
    """Return a cached Google Drive API service instance."""
    global _service
    if _service is None:
        creds = _get_credentials()
        _service = build("drive", "v3", credentials=creds, cache_discovery=False)
    return _service


def get_folder_id():
    """Return the configured Google Drive folder ID."""
    folder_id = os.environ.get("GOOGLE_DRIVE_FOLDER_ID", "")
    if not folder_id:
        raise RuntimeError("GOOGLE_DRIVE_FOLDER_ID environment variable is not set")
    return folder_id


def upload_file(file_obj, filename, mime_type=None):
    """
    Upload a file to Google Drive inside the configured folder.

    Args:
        file_obj: A file-like object (e.g., InMemoryUploadedFile, TemporaryUploadedFile).
        filename: The name to give the file on Drive.
        mime_type: Optional MIME type. Auto-detected if not provided.

    Returns:
        The Google Drive file ID string.
    """
    service = _get_service()
    folder_id = get_folder_id()

    if not mime_type:
        mime_type, _ = mimetypes.guess_type(filename)
        if not mime_type:
            mime_type = "application/octet-stream"

    file_metadata = {
        "name": filename,
        "parents": [folder_id],
    }

    # Ensure we read from the beginning
    if hasattr(file_obj, "seek"):
        file_obj.seek(0)

    media = MediaIoBaseUpload(file_obj, mimetype=mime_type, resumable=True)
    created = service.files().create(
        body=file_metadata,
        media_body=media,
        fields="id",
        supportsAllDrives=True,
    ).execute()

    file_id = created.get("id")
    logger.info("Uploaded file '%s' to Google Drive (id=%s)", filename, file_id)
    return file_id


def delete_file(file_id):
    """
    Delete a file from Google Drive by its file ID.

    Args:
        file_id: The Google Drive file ID string.
    """
    service = _get_service()
    service.files().delete(fileId=file_id, supportsAllDrives=True).execute()
    logger.info("Deleted file from Google Drive (id=%s)", file_id)


def get_file_metadata(file_id):
    """
    Retrieve metadata for a file on Google Drive.

    Args:
        file_id: The Google Drive file ID string.

    Returns:
        A dict with file metadata (name, mimeType, etc.).
    """
    service = _get_service()
    return service.files().get(
        fileId=file_id,
        fields="id,name,mimeType,size",
        supportsAllDrives=True,
    ).execute()


def download_file(file_id):
    """
    Download a file from Google Drive.

    Args:
        file_id: The Google Drive file ID string.

    Returns:
        An io.BytesIO object containing the file content.
    """
    service = _get_service()
    request = service.files().get_media(fileId=file_id, supportsAllDrives=True)
    buf = io.BytesIO()
    downloader = MediaIoBaseDownload(buf, request)
    done = False
    while not done:
        _, done = downloader.next_chunk()
    buf.seek(0)
    return buf


def get_view_url(file_id):
    """
    Return a Google Drive URL suitable for viewing/previewing the file in an iframe.
    """
    return f"https://drive.google.com/file/d/{file_id}/preview"


def get_download_url(file_id):
    """
    Return a Google Drive direct download URL.
    """
    return f"https://drive.google.com/uc?id={file_id}&export=download"
