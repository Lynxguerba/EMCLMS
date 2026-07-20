"""
Standalone test script to verify Google Drive API upload works.
Run from the backend directory: python test_drive_upload.py
"""
import json
import os
import sys

from dotenv import load_dotenv
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SCOPES = ["https://www.googleapis.com/auth/drive"]

# ── Configuration ──────────────────────────────────────────────
SERVICE_ACCOUNT_JSON = os.environ.get("GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON", "")
FOLDER_ID = os.environ.get("GOOGLE_DRIVE_FOLDER_ID", "")

# Path to the file you want to upload (adjust as needed)
DEFAULT_FILE = os.path.join(os.path.dirname(__file__), "..", "Application Letter.pdf")
FILE_TO_UPLOAD = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_FILE

def main():
    print("=" * 60)
    print("Google Drive Upload Test")
    print("=" * 60)

    # ── Validate env vars ──────────────────────────────────────
    if not SERVICE_ACCOUNT_JSON:
        print("\n[ERROR] GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON is not set in .env")
        print("Paste the entire service account JSON content into backend/.env")
        sys.exit(1)

    if not FOLDER_ID:
        print("\n[ERROR] GOOGLE_DRIVE_FOLDER_ID is not set in .env")
        sys.exit(1)

    print(f"\nFolder ID : {FOLDER_ID}")
    print(f"File      : {os.path.abspath(FILE_TO_UPLOAD)}")

    if not os.path.isfile(FILE_TO_UPLOAD):
        print(f"\n[ERROR] File not found: {FILE_TO_UPLOAD}")
        sys.exit(1)

    # ── Authenticate ───────────────────────────────────────────
    try:
        info = json.loads(SERVICE_ACCOUNT_JSON)
        creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
        service = build("drive", "v3", credentials=creds, cache_discovery=False)
        print("\n[OK] Authenticated with Google Drive API")
    except json.JSONDecodeError:
        print("\n[ERROR] GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON is not valid JSON")
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] Authentication failed: {e}")
        sys.exit(1)

    # ── Verify folder access ───────────────────────────────────
    try:
        folder = service.files().get(
            fileId=FOLDER_ID, fields="id,name", supportsAllDrives=True
        ).execute()
        print(f"[OK] Folder accessible: '{folder.get('name')}' (id={folder['id']})")
    except Exception as e:
        print(f"\n[ERROR] Cannot access folder {FOLDER_ID}: {e}")
        print("Make sure the folder is shared with the service account email (Editor permission)")
        sys.exit(1)

    # ── Upload file ────────────────────────────────────────────
    filename = os.path.basename(FILE_TO_UPLOAD)
    file_metadata = {
        "name": filename,
        "parents": [FOLDER_ID],
    }
    media = MediaFileUpload(FILE_TO_UPLOAD, mimetype="application/pdf", resumable=True)

    print(f"\nUploading '{filename}'...")
    try:
        created = service.files().create(
            body=file_metadata,
            media_body=media,
            fields="id,name,mimeType,size",
            supportsAllDrives=True,
        ).execute()
    except Exception as e:
        print(f"\n[ERROR] Upload failed: {e}")
        sys.exit(1)

    file_id = created["id"]
    print(f"\n[SUCCESS] File uploaded!")
    print(f"  File ID  : {file_id}")
    print(f"  Name     : {created.get('name')}")
    print(f"  MIME     : {created.get('mimeType')}")
    print(f"  Size     : {created.get('size', 'unknown')} bytes")

    # ── Generate URLs ──────────────────────────────────────────
    view_url = f"https://drive.google.com/file/d/{file_id}/preview"
    download_url = f"https://drive.google.com/uc?id={file_id}&export=download"
    print(f"\n  View URL     : {view_url}")
    print(f"  Download URL : {download_url}")

    # ── Test delete (cleanup) ──────────────────────────────────
    confirm = input("\nDelete the uploaded test file? (y/n): ").strip().lower()
    if confirm == "y":
        service.files().delete(fileId=file_id, supportsAllDrives=True).execute()
        print("[OK] Test file deleted from Google Drive")
    else:
        print(f"[INFO] File kept on Google Drive (id={file_id})")

    print("\n" + "=" * 60)
    print("Test complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
