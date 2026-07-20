# Google Drive API Setup Guide for EMC-LMS

This guide covers setting up Google Drive API as a document storage provider alongside Cloudinary (which remains for images/videos).

---

## Overview

| Storage Provider | Purpose | File Types |
|---|---|---|
| Cloudinary (existing) | Images & Videos | Profile pictures, image content |
| Google Drive (new) | Documents | PDFs, Word docs, ebooks, submissions |

---

## Part 1: Google Cloud Console Setup

### Step 1 — Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the **project dropdown** at the top navigation bar
3. Click **New Project**
4. Enter a project name (e.g., `emc-lms-documents`)
5. Click **Create**
6. Wait for the project to be created, then **select it** from the dropdown

### Step 2 — Enable the Google Drive API

1. In the left sidebar, go to **APIs & Services** → **Library**
2. In the search bar, type **Google Drive API**
3. Click on **Google Drive API** from the results
4. Click the **Enable** button
5. Wait for the API to be enabled

### Step 3 — Create a Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → select **Service Account**
3. Fill in the form:
   - **Service account name:** `emc-lms-drive`
   - **Service account ID:** (auto-generated, leave as-is)
   - **Description:** `EMC LMS document storage`
4. Click **Create and Continue**
5. Skip the "Grant this service account access to project" step → click **Done**

### Step 4 — Generate the JSON Key

1. On the **Credentials** page, find the service account you just created (name: `emc-lms-drive`)
2. Click on the service account row
3. Go to the **Keys** tab
4. Click **Add Key** → **Create new key**
5. Select **JSON** format → click **Create**
6. A JSON file will be downloaded to your computer — **keep this file safe**
7. Open the downloaded JSON file in a text editor — you will need its contents for the env variable

> **Note the `client_email` value** from the JSON file. You will need it in Step 5.

### Step 5 — Create a Shared Drive and Folder

> **Important:** While a **Shared Drive** is ideal, it is **only available with paid Google Workspace accounts**. If you are on a **free personal Google account**, you can simply create a normal folder in your "My Drive" and share it with the service account as an **Editor**. Note that files uploaded will be owned by the service account and count against its 15GB free quota.

1. Go to [Google Drive](https://drive.google.com/)
2. In the left sidebar, click **My Drive** (or **Shared drives** if you have Workspace)
3. Click **+ New** at the top → **New folder** → name it (e.g., `emc-lms-documents`)
4. Click **Create**
5. Open the new folder
6. Copy the **folder ID** from the browser URL bar:
   ```
   https://drive.google.com/drive/folders/THIS_IS_THE_FOLDER_ID
   ```
7. **Add the service account** to the folder:
   - Click the **down arrow** next to the folder name at the top → **Share**
   - In the "Add people and groups" box
   - Paste the `client_email` value from Step 4
   - Set permission to **Editor**
   - Click **Send**

### Step 6 — You Now Have Two Values

| Value | Where to Find | Used As |
|---|---|---|
| Service Account JSON (entire file content) | Downloaded JSON file in Step 4 | `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` env var |
| Folder ID | Browser URL in Step 5 (folder inside the Shared Drive) | `GOOGLE_DRIVE_FOLDER_ID` env var |

---

## Part 2: Environment Variables

### Backend `.env` file

Add these two lines to your `backend/.env` file:

```env
GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON={"type": "service_account", "project_id": "your-project-id", "private_key_id": "...", "private_key": "...", "client_email": "...", "client_id": "...", "auth_uri": "...", "token_uri": "...", "auth_provider_x509_cert_url": "...", "client_x509_cert_url": "..."}
GOOGLE_DRIVE_FOLDER_ID=your_folder_id_from_url
```

> **Important:** Paste the entire JSON content on a single line. The value must be valid JSON.

### Render Production Environment

Add the same two variables in your Render dashboard under **Environment Variables**:

| Variable | Value |
|---|---|
| `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` | *Paste the entire JSON content* |
| `GOOGLE_DRIVE_FOLDER_ID` | *Paste the folder ID* |

### Existing Cloudinary Variables (Keep These)

Do **NOT** remove your Cloudinary environment variables. They are still used for images and videos:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## Part 3: What Changed in the Code

### New Files Created

| File | Purpose |
|---|---|
| `backend/core/google_drive_service.py` | Google Drive API service (upload, delete, URL generation) |
| `backend/core/google_drive_storage.py` | Custom Django Storage backend for Google Drive |

### Modified Files

| File | Change |
|---|---|
| `backend/requirements.txt` | Added `google-api-python-client`, `google-auth`, `google-auth-httplib2` |
| `backend/core/settings.py` | Added env vars, changed `STORAGES["raw"]` to use `GoogleDriveStorage` |
| `backend/api/views/file_helpers.py` | Added Google Drive URL generation in `build_file_url()` |
| `backend/.env` | Added 2 Google Drive env vars |
| `backend/example.env` | Added 2 Google Drive env vars |
| `frontend/src/utils/fileUtils.ts` | Replaced Cloudinary download logic with Google Drive |
| `frontend/src/utils/imageUtils.ts` | Simplified URL detection |
| `DEPLOYMENT.md` | Added Google Drive env vars to deployment table |

### Storage Backend Split

| Django Setting | Backend | Used By |
|---|---|---|
| `STORAGES["default"]` | `MediaCloudinaryStorage` (Cloudinary) | `User.profile_picture` — **unchanged** |
| `STORAGES["raw"]` | `GoogleDriveStorage` (new) | `ContentFile.file`, `SubmissionFile.file`, `Book.file_path` |

### No Model Changes

The `FileField` and `ImageField` on your models store file names/identifiers. The storage backend handles the actual upload/download. No database migrations are needed — new files will automatically be stored on Google Drive, and existing Cloudinary-stored files remain accessible via their existing URLs.

---

## Part 4: How It Works

### File Upload Flow

```
Frontend (multipart/form-data)
  → Django Backend (receives request.FILES)
    → FileField.save()
      → GoogleDriveStorage._save()
        → google_drive_service.upload_file()
          → Google Drive API (stores file in shared folder)
            → Returns Google Drive file ID
              → Stored as FileField.name in database
```

### File Access Flow

```
Frontend requests file URL
  → Django build_file_url()
    → Detects GoogleDriveStorage
      → Generates: https://drive.google.com/file/d/{FILE_ID}/preview
        → Returns URL in API response
```

### File Download Flow

```
Frontend calls download endpoint
  → Django build_file_url(attachment=True)
    → Detects GoogleDriveStorage
      → Generates: https://drive.google.com/uc?id={FILE_ID}&export=download
        → Returns URL in API response
          → Frontend triggers browser download
```

---

## Part 5: Troubleshooting

### Files not uploading
- Check that `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` is valid JSON (no line breaks in env var)
- Verify the service account has **Editor** permission on the shared folder
- Check server logs for Google API errors

### Files not accessible / 404
- Ensure the folder is shared with the service account email
- Verify `GOOGLE_DRIVE_FOLDER_ID` matches the folder URL

### Profile pictures still working
- Profile pictures use Cloudinary (`STORAGES["default"]`), which is unaffected by this change

---

## References

- [Google Drive API Documentation](https://developers.google.com/drive/api/guides/about-sdk)
- [Django Custom Storage Documentation](https://docs.djangoproject.com/en/5.2/howto/custom-file-storage/)
- [Service Account Authentication](https://cloud.google.com/docs/authentication/production)
