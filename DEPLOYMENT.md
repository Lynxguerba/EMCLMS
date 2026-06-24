# EMC-LMS Deployment Guide

This guide provides step-by-step instructions for deploying the **EMC-LMS** application to production using **Render** (for Django Backend and PostgreSQL Database), **Vercel** (for React Frontend), **Cloudinary** (for persistent media storage), and **Brevo** (for transactional emails).

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Database: Set Up PostgreSQL on Render](#1-database-set-up-postgresql-on-render)
3. [Cloudinary: Media Storage Setup](#2-cloudinary-media-storage-setup)
4. [Brevo: Transactional Email Setup](#3-brevo-transactional-email-setup)
5. [Backend: Deploy Django to Render](#4-backend-deploy-django-to-render)
6. [Frontend: Deploy React to Vercel](#5-frontend-deploy-react-to-vercel)
7. [Post-Deployment Tasks (Database Seeding)](#6-post-deployment-tasks)

---

## Prerequisites

Before starting, make sure you have created free accounts on:
*   [Render](https://render.com/)
*   [Vercel](https://vercel.com/)
*   [Cloudinary](https://cloudinary.com/)
*   [Brevo](https://www.brevo.com/) (formerly Sendinblue)
*   [GitHub](https://github.com/) (your project repository must be pushed to GitHub)

---

## 1. Database: Set Up PostgreSQL on Render

Render provides managed PostgreSQL databases out of the box with `pgvector` support.

### Step-by-Step Setup:
1. Log in to the [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** in the top right corner and select **PostgreSQL**.
3. Fill in the database details:
   *   **Name:** `emc-lms-db`
   *   **Database Name:** `emclms`
   *   **User:** `emclms_user`
   *   **Region:** Select the region closest to you (or matches your backend region, e.g., Oregon).
   *   **PostgreSQL Version:** 15 or 16
4. Scroll down and choose the **Free** tier (or appropriate paid tier).
5. Click **Create Database**.
6. Once created, copy the **Internal Database URL** (used by services running on Render) and **External Database URL** (used for local connections or database restore tools).

> [!NOTE]  
> If you need to restore your SQL backup file (e.g., `backup_2026-06-24.dump`) to the production database, you can do so using your local command line with the External Database URL:
> ```bash
> pg_restore --no-owner --clean --no-privileges -h <HOST_ADDRESS> -U emclms_user -d emclms -p 5432 <path_to_backup_file>
> ```

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

## 4. Backend: Deploy Django to Render

### Step-by-Step Setup:
1. Go to the [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository containing the EMC-LMS project.
4. Configure the Web Service settings:
   *   **Name:** `emc-lms-backend`
   *   **Language:** `Python`
   *   **Branch:** `main` (or whichever branch holds your deployment-ready code)
   *   **Region:** Choose the same region as your database.
   *   **Build Command:** `./build.sh`
   *   **Start Command:** `gunicorn core.wsgi:application --chdir backend`
5. Select the Free instance type.
6. Click **Advanced** and scroll down to the **Environment Variables** section. Add the following keys and values:

| Environment Variable | Value / Description |
| :--- | :--- |
| `SECRET_KEY` | *A random long secure string* (e.g., generate one using a password manager) |
| `DATABASE_URL` | *Paste your Render **Internal Database URL** here* |
| `BACKEND_URL` | `https://emc-lms-backend.onrender.com` *(Replace with your actual Render URL once provisioned)* |
| `FRONTEND_URL` | `https://emc-lms-frontend.vercel.app` *(Replace with your Vercel URL once provisioned)* |
| `CLOUDINARY_CLOUD_NAME` | *Your Cloudinary Cloud Name* |
| `CLOUDINARY_API_KEY` | *Your Cloudinary API Key* |
| `CLOUDINARY_API_SECRET` | *Your Cloudinary API Secret* |
| `BREVO_API_KEY` | *Your Brevo API Key* |
| `BREVO_SENDER_EMAIL` | *Your verified Brevo sender email address* |

7. Click **Create Web Service**.

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

## 6. Post-Deployment Tasks

### Seeding the Production Database
If you are starting with a blank database instead of restoring a dump, you will want to generate the default superadmin account and starter data:

1. Go to your **Render Dashboard** and select your **Django Web Service**.
2. Click on the **Shell** tab on the left sidebar.
3. Run the following command:
   ```bash
   python backend/api/seeds.py
   ```
4. This command will initialize the default superadmin credentials:
   *   **Email:** `superadmin@gmail.com`
   *   **Password:** `asd123ASD`
5. Remember to log in and change this password immediately in production.
