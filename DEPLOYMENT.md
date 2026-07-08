# EMC-LMS Deployment Guide

This guide provides step-by-step instructions for deploying the **EMC-LMS** application to production using **Render** (for Django Backend), **Supabase** (for PostgreSQL Database), **Vercel** (for React Frontend), **Cloudinary** (for persistent media storage), and **Brevo** (for transactional emails).

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Database: Set Up PostgreSQL on Supabase](#1-database-set-up-postgresql-on-supabase)
3. [Cloudinary: Media Storage Setup](#2-cloudinary-media-storage-setup)
4. [Brevo: Transactional Email Setup](#3-brevo-transactional-email-setup)
5. [Backend: Deploy Django to Render (via Docker)](#4-backend-deploy-django-to-render-via-docker)
6. [Frontend: Deploy React to Vercel](#5-frontend-deploy-react-to-vercel)
7. [Post-Deployment Tasks (Database Seeding)](#6-post-deployment-tasks)

---

## Prerequisites

Before starting, make sure you have created free accounts on:
*   [Render](https://render.com/)
*   [Supabase](https://supabase.com/)
*   [Vercel](https://vercel.com/)
*   [Cloudinary](https://cloudinary.com/)
*   [Brevo](https://www.brevo.com/) (formerly Sendinblue)
*   [GitHub](https://github.com/) (your project repository must be pushed to GitHub)

---

## 1. Database: Set Up PostgreSQL on Supabase

Supabase provides a modern, high-performance managed PostgreSQL database with pre-installed extensions like `pgvector` (essential for the LMS semantic search features). It offers a highly reliable free tier that does not expire after 90 days.

### Step-by-Step Setup:
1. Log in to the [Supabase Dashboard](https://supabase.com/).
2. Click **New project** and select or create an organization.z
3. Fill in the project details:
   *   **Name:** `emc-lms-db`
   *   **Database Password:** Click **Generate a password** (or enter a strong password). **Save this password immediately**, as you will need it for the connection strings and database restore commands.
   *   **Region:** Select a region close to your backend hosting region (e.g., if deploying backend to Render in Oregon `us-west-2`, choose `West US (Oregon)` to minimize latency).
   *   **Plan:** Select the **Free** tier.
4. Click **Create new project**. It will take a couple of minutes for Supabase to provision your database.
5. Once the project is ready, navigate to **Project Settings** (gear icon on the bottom left sidebar) -> **Database**.
6. Scroll down to the **Connection string** section.
7. You can use either the **Connection Pooler** or the **Direct Connection**:
   *   **Connection Pooler (Recommended for production backend):**
       - Toggle to **URI** mode and check **Use connection pooler**.
       - Set the **Mode** dropdown to **Session**. (Do *not* use Transaction mode, as Django manages transaction states and connection life cycle in a way that requires Session mode to prevent migration errors).
       - The pooler URL will look like: `postgresql://postgres.[PROJECT_REF]:[YOUR_PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
   *   **Direct Connection:**
       - If you prefer not to use the pooler, you can get the direct URL: `postgresql://postgres:[YOUR_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres`
8. Copy the connection string of your choice and replace `[YOUR_PASSWORD]` with your actual database password.

> [!WARNING]  
> If your database password contains special characters (e.g., `@`, `#`, `!`, `^`, `*`), you **must** URL-encode them in the database URL (e.g., `#` becomes `%23`, `@` becomes `%40`). If you encounter connection errors like "invalid password" or "port parsing failed," check your URL-encoding or recreate the project with an alphanumeric password.

> [!TIP]  
> The `pgvector` extension is already installed on Supabase by default. Django's initial migrations will automatically enable it when you deploy. You do not need to manually enable it.

> [!NOTE]  
> If you need to restore your SQL backup file (e.g., `backup_2026-06-24.dump`) to the production Supabase database, run the following command in your local command line (replace `[PROJECT_REF]` with your actual Supabase project reference ID):
> ```bash
> pg_restore --no-owner --clean --no-privileges -h db.[PROJECT_REF].supabase.co -U postgres -d postgres -p 5432 <path_to_backup_file>
> ```
> *Note: If asked for a password, enter your Supabase database password.*

---

## 2. Cloudinary: Media Storage Setup

Since Render containers have ephemeral filesystems (uploaded files disappear when the container restarts/re-deploys), Cloudinary is used to host images, PDFs, and other uploaded files persistently.

### Step-by-Step API Key Retrieval:
1. Log in to your [Cloudinary Console](https://console.cloudinary.com/).
2. On your **Dashboard**, locate the section labeled **Product Environment Credentials**.
3. You will see three credentials:
   *   **Cloud Name** (e.g., `dxyz12345`)
   *   **API Key** (e.g., `123456789012345`)
   *   **API Secret** (Click "View API Secret" or copy the hidden text)
4. Copy these values down. You will add them as environment variables during the backend deployment.

---

## 3. Brevo: Transactional Email Setup

Brevo is used to send automated emails (e.g., account activation, notifications, passwords, and password resets).

### Step-by-Step API Key Retrieval:
1. Log in to your [Brevo Dashboard](https://dashboard.brevo.com/).
2. Click on your profile name in the top-right corner and select **SMTP & API** from the menu.
3. Select the **API Keys** tab.
4. Click **Generate a new API key**.
5. Give the key a descriptive name (e.g., `EMC-LMS Production Key`) and click **Generate**.
6. **Copy the generated key immediately** and store it safely (it will only be shown once).
7. Note down your **Sender Email** (this is the email registered and verified on your Brevo account under "Senders, Domains & Dedicated IPs").

---

## 4. Backend: Deploy Django to Render (via Docker)

Since the LMS includes features like OCR (which requires the system-level binary `tesseract-ocr`) and semantic search (which loads a ~120MB Sentence-Transformers model), a standard Python build on Render will run out of memory or fail to find the necessary binaries. 

To solve this, the project contains an optimized Dockerfile under the `backend` directory. Deploying the backend as a **Docker container** on Render ensures all OCR libraries are pre-installed and the AI model is cached during the build stage.

### Step-by-Step Setup:
1. Go to the [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** in the top-right corner and select **Web Service**.
3. Select **Build and deploy from a Git repository** and connect your GitHub repository.
4. Configure the Web Service settings:
   *   **Name:** `emc-lms-backend`
   *   **Language:** `Docker`
   *   **Root Directory:** `backend` (This is critical: setting this ensures Render runs the build in the `backend` directory where the `Dockerfile` and `requirements.txt` are located).
   *   **Branch:** `main` (or whichever branch holds your deployment-ready code)
   *   **Region:** Choose a region close to your database.
5. Select the **Free** instance type (or a paid instance if you expect high traffic).
6. Click **Advanced** and scroll down to the **Environment Variables** section. Add the following keys and values:

| Environment Variable | Value / Description |
| :--- | :--- |
| `SECRET_KEY` | *A secure random secret key (generate using: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`)* |
| `DATABASE_URL` | *Paste your Supabase connection string (pooler/direct URL with password and URL-encoded special characters) here* |
| `BACKEND_URL` | `https://emc-lms-backend.onrender.com` *(Replace with your actual Render URL once provisioned)* |
| `FRONTEND_URL` | `https://emc-lms-frontend.vercel.app` *(Replace with your Vercel URL once provisioned)* |
| `CLOUDINARY_CLOUD_NAME` | *Your Cloudinary Cloud Name* |
| `CLOUDINARY_API_KEY` | *Your Cloudinary API Key* |
| `CLOUDINARY_API_SECRET` | *Your Cloudinary API Secret* |
| `BREVO_API_KEY` | *Your Brevo API Key* |
| `BREVO_SENDER_EMAIL` | *Your verified Brevo sender email address* |

7. Click **Create Web Service**. Render will start pulling the codebase, building the Docker image (which installs system tools, python libraries, and pre-downloads the AI model), and then boot the container running database migrations and starting the Gunicorn server.

---

## 5. Frontend: Deploy React to Vercel

Vercel is optimized for building and hosting frontend single-page React apps built with Vite.

### Step-by-Step Setup:
1. Log in to the [Vercel Dashboard](https://vercel.com/).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository.
4. Configure the project settings:
   *   **Framework Preset:** `Vite` (Vercel automatically detects this)
   *   **Root Directory:** `frontend` (Click **Edit** next to Root Directory, select the `frontend` folder, and click **Continue**)
   *   **Build & Development Settings:** (Leave at defaults: Build Command: `npm run build`, Output Directory: `dist`)
5. Open the **Environment Variables** accordion and add the following variable:

| Key | Value |
| :--- | :--- |
| `VITE_API_BASE_URL` | `https://emc-lms-backend.onrender.com` *(Your deployed Render Backend URL)* |

6. Click **Deploy**.
7. Once deployment succeeds, Vercel will provide a live URL (e.g., `https://emc-lms-frontend.vercel.app`).
8. **Crucial Next Step:** Copy this URL, go back to your **Render Backend Web Service settings**, edit the `FRONTEND_URL` environment variable, paste the Vercel URL, and save the settings. Render will automatically redeploy the backend with the correct CORS and CSRF configurations.

---

### Seeding the Production Database
If you are starting with a blank database instead of restoring a dump, you will want to generate the default superadmin account and starter data. 

Since the project is deployed using Docker with `/app` as the root directory, the `backend` prefix is omitted in the Render shell.

#### Option A: Seed with Demo/Mock Data (Recommended for testing)
To populate the database with fake students, courses, books, and multiple default user roles (admin, superadmin, librarian, accounting):
1. Go to your **Render Dashboard** and select your **Django Web Service**.
2. Click on the **Shell** tab on the left sidebar.
3. Run the following command:
   ```bash
   python api/seeds.py
   ```
4. This command will initialize multiple accounts including:
   *   **Superadmin Email:** `superadmin@gmail.com`
   *   **Admin Email:** `admin@gmail.com`
   *   **Librarian Email:** `librarian@gmail.com`
   *   **Accounting Email:** `accounting@gmail.com`
   *   **Default Password for all:** `asd123ASD`

#### Option B: Seed with Clean/Minimal Data (Recommended for production)
To create a clean system with only the admin and superadmin credentials (no fake courses, students, or books):
1. Go to your **Render Dashboard** and select your **Django Web Service**.
2. Click on the **Shell** tab on the left sidebar.
3. Run the following command:
   ```bash
   python api/emptyseeds.py
   ```
4. This command will initialize:
   *   **Superadmin Email:** `superadmin@gmail.com`
   *   **Admin Email:** `admin@gmail.com`
   *   **Default Password:** `asd123ASD`

Remember to log in and change these passwords immediately in production.
