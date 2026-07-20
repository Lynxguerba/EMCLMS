import logging
import os
import posixpath

from django.core.files.base import ContentFile
from django.core.files.storage import Storage

from . import google_drive_service as drive

logger = logging.getLogger(__name__)


class GoogleDriveStorage(Storage):
    """
    Django storage backend that stores files on Google Drive via the Drive API.

    The ``name`` stored in FileField is the Google Drive file ID (not a path).
    This keeps the FileField lightweight and avoids path-based assumptions.
    """

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    # ------------------------------------------------------------------
    # Required overrides
    # ------------------------------------------------------------------

    def _save(self, name, content):
        """Upload *content* to Google Drive and return the Drive file ID as the stored name."""
        # Derive a sensible filename from the upload_to path + original name.
        # ``name`` here is the relative path Django computes from ``upload_to``
        # (e.g. ``content_files/report.pdf``).  We strip the directory prefix and
        # keep only the basename so Drive doesn't mirror our upload_to structure.
        filename = os.path.basename(name)

        try:
            file_id = drive.upload_file(content, filename)
        except Exception:
            logger.exception("Failed to upload file '%s' to Google Drive", filename)
            raise

        # We return the Drive file ID.  Django will store this as ``FileField.name``.
        # We prefix with the original relative path so that ``get_file_name()`` in
        # file_helpers.py can still extract a human-readable name via ``name.split("/")[-1]``.
        # However, for Google Drive files the "name" field is the Drive file ID
        # and we lose the original path.  To preserve the original filename for
        # display, we store it as ``<drive_file_id>/<original_filename>``.
        return f"{file_id}/{filename}"

    def _open(self, name, mode="rb"):
        """Download a file from Google Drive by its stored name."""
        file_id = self._extract_file_id(name)
        data = drive.download_file(file_id)
        return ContentFile(data.read())

    def delete(self, name):
        """Delete a file from Google Drive."""
        file_id = self._extract_file_id(name)
        try:
            drive.delete_file(file_id)
        except Exception:
            logger.exception("Failed to delete file '%s' from Google Drive", name)

    def exists(self, name):
        """Check whether a file exists on Google Drive."""
        file_id = self._extract_file_id(name)
        try:
            drive.get_file_metadata(file_id)
            return True
        except Exception:
            return False

    def url(self, name):
        """Return a Google Drive preview URL for the given stored name."""
        file_id = self._extract_file_id(name)
        return drive.get_view_url(file_id)

    # ------------------------------------------------------------------
    # Optional helpers
    # ------------------------------------------------------------------

    def listdir(self, path):
        """List directories and files at *path*.

        Google Drive doesn't have a real folder hierarchy when we store by
        file ID, so we return an empty directory listing.  Django only calls
        this during management commands (e.g. collectstatic) which don't
        apply to this storage.
        """
        return ([], [])

    def size(self, name):
        file_id = self._extract_file_id(name)
        try:
            meta = drive.get_file_metadata(file_id)
            return int(meta.get("size", 0))
        except Exception:
            return 0

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_file_id(name):
        """Extract the Google Drive file ID from the stored name.

        We store names as ``<drive_file_id>/<original_filename>``.
        """
        if not name:
            return name
        return name.split("/")[0]
