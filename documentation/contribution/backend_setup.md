# Backend Setup Guide

Follow these steps to set up the Django development environment for EMCLMS.

## Prerequisites
- **Python 3.10+**
- **PostgreSQL** with the `pgvector` extension installed.
- **Tesseract OCR** (required for the OCR feature).
  - *Ubuntu:* `sudo apt install tesseract-ocr`
  - *Windows:* Install via binary from [UB-Mannheim](https://github.com/UB-Mannheim/tesseract/wiki).

## Local Development Setup

1.  **Environment Preparation:**
    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate  # Windows: venv\Scripts\activate
    ```

2.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
    *Note: The first time you run the app, it will download the ~120MB `all-MiniLM-L12-v2` model for embeddings.*

3.  **Database Configuration:**
    Ensure PostgreSQL is running and create a database named `emclms`.
    Enable the vector extension:
    ```sql
    CREATE EXTENSION IF NOT EXISTS vector;
    ```
    Update your `.env` file (or `core/settings.py`) with your database credentials.

4.  **Migrations & Seeding:**
    ```bash
    python manage.py migrate
    ```
    For instructions on how to populate your database with development or production data, see the [Seeding Guide](./seeding_guide.md).
    For remote **Supabase** migrate/seed issues (pooler ports, Docker), see [Supabase Migrate & Seed](./supabase_migrate_seed.md).

5.  **Running the Server:**
    ```bash
    python manage.py runserver
    ```

## External Services
- **Cloudinary:** To enable media uploads (images, videos), configure `CLOUDINARY_STORAGE` in your settings with your Cloud Name, API Key, and Secret.
- **Google Drive API:** To enable document storage (PDFs, Word docs, ebooks, submissions), configure `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` and `GOOGLE_DRIVE_FOLDER_ID` in your `.env` file. See [GOOGLE_DRIVE_SETUP.md](../../GOOGLE_DRIVE_SETUP.md) for detailed setup instructions.
- **WhiteNoise:** Used in development and production to serve static files efficiently without a separate Nginx setup for simple deployments.

## Troubleshooting
- **Embedding Failures:** Ensure you have enough RAM (at least 2GB free) for the SentenceTransformer model to load.
- **OCR Errors:** Verify that `tesseract` is in your system PATH.
