# Seeding Guide

Seeding is the process of populating the database with initial data. In EMCLMS, we use seeders for both local development (dummy data) and production-ready library catalogs.

## 🚀 Quick Start

To run a seeder, you must be in the `backend/` directory with your virtual environment activated.

```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
```

### 1. General Development Seeding
This script populates the database with a full set of sample data including instructors, students, courses, sections, and content. **Warning: This script deletes existing data for most models before seeding.**

```bash
python api/seeds.py
```

---

## 🛠️ Detailed Seeder Descriptions

### `api/seeds.py` (Development)
- **Purpose:** Creates a "ready-to-use" environment for developers.
- **Data Included:** 
    - 5 Instructors, 18 Students, 1 Admin, 1 Accounting Staff.
    - ~17 Courses across 3 school years.
    - Sections and educational content for major courses.
    - Randomly generated grades, logs, and notifications.
- **Best For:** First-time setup or resetting your local environment.

---



---

## ❓ Troubleshooting

### "Permission Denied" or "Command Not Found"
- **Wrong:** `./seeders/production/books.py` (Files are not usually executable)
- **Right:** `python seeders/production/books.py`
- **Right (Without Activation):** `./venv/bin/python seeders/production/books.py`

### "No such file or directory"
Ensure you are in the `backend/` folder. If you are in the project root (`EMCLMS/`), run:
```bash
python backend/seeders/production/books.py
```

### "ModuleNotFoundError"
This happens if you haven't activated your virtual environment. The environment contains all the necessary libraries like `django`, `sentence-transformers`, and `faker`.

---

## ⚠️ Hard Reset: Wipe Tables and Start Over

If your database schema becomes inconsistent and you want to **remove all tables** and start with a clean slate without dropping the entire database, follow these steps. **Warning: This will delete ALL data.**

### 1. Wipe All Tables (PostgreSQL)
The fastest way to remove all tables and reset the schema in PostgreSQL is to drop the `public` schema and recreate it. Run this from your terminal:

```bash
# Replace 'emclms' with your actual database name if different
psql -d EMCLMS -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public; CREATE EXTENSION IF NOT EXISTS vector;"
```
*Note: We recreate the `vector` extension because dropping the public schema removes it.*

### 2. Re-initialize the Database
Once the tables are gone, run the migrations and seeds in order:

```bash
cd backend
python manage.py migrate
python api/seeds.py
```

### Alternative: Django "Zero" Migration
If you prefer to use Django commands, you can revert the `api` app to its initial state (though this may not remove all third-party tables):

```bash
python manage.py migrate api zero
python manage.py migrate
```
