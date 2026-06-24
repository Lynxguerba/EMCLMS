import subprocess
import os
import tempfile
from django.http import HttpResponse
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser
from ..models import User
from ..utils import is_superadmin
from django.db import connection
from django.conf import settings

@api_view(["POST"])
@parser_classes([MultiPartParser])
def admin_db_restore(request):
    """
    Endpoint to restore a database from a dump file.
    Accessible ONLY by Superadmins.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return HttpResponse("Unauthorized", status=401)
    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return HttpResponse("User not found", status=404)
        
    if not is_superadmin(user):
        return HttpResponse("Forbidden: Only Superadmins can restore the database", status=403)

    backup_file = request.FILES.get("backup_file")
    if not backup_file:
        return HttpResponse("No backup file provided", status=400)

    # Get database connection string from settings or environment
    db_url = os.environ.get("DATABASE_URL")
    
    if not db_url:
        # Fallback to reconstructing from settings
        db_config = settings.DATABASES.get("default")
        if db_config:
            user = db_config.get("USER")
            password = db_config.get("PASSWORD")
            host = db_config.get("HOST")
            port = db_config.get("PORT")
            name = db_config.get("NAME")
            if all([user, password, host, name]):
                db_url = f"postgresql://{user}:{password}@{host}:{port or 5432}/{name}"

    if not db_url:
        return HttpResponse("Database configuration not found", status=500)

    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    # Save uploaded file to a temporary location
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        for chunk in backup_file.chunks():
            tmp.write(chunk)
        tmp_path = tmp.name

    try:
        # Step 1: Drop and recreate the public schema
        # This is a destructive operation required before pg_restore --schema=public
        with connection.cursor() as cursor:
            # Note: CASCADE will drop all objects in the schema
            cursor.execute("DROP SCHEMA IF EXISTS public CASCADE;")
            cursor.execute("CREATE SCHEMA public;")
            cursor.execute("GRANT ALL ON SCHEMA public TO postgres;")
            cursor.execute("GRANT ALL ON SCHEMA public TO public;")

        # Step 2: Run pg_restore
        # --clean: clean (drop) database objects before recreating
        # --if-exists: use IF EXISTS when dropping objects
        # --no-owner: skip restoration of object ownership
        # --no-privileges: skip restoration of access privileges
        # --schema=public: restore only the public schema
        command = [
            "pg_restore",
            "-d", db_url,
            "--clean",
            "--if-exists",
            "--no-owner",
            "--no-privileges",
            "--schema=public",
            tmp_path
        ]
        
        # Use subprocess.Popen to avoid buffering large outputs in memory
        # We'll set a long timeout (matching gunicorn)
        try:
            process = subprocess.Popen(
                command, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Wait for completion with a timeout (290s, slightly less than Gunicorn's 300s)
            stdout, stderr = process.communicate(timeout=290)
            
            # Cleanup temp file
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

            if process.returncode != 0:
                return HttpResponse(f"Restore completed with some issues/errors: {stderr}", status=500)

            # Prevent Django from attempting to save the session at the end of this request.
            # The restoration process replaces the database, which means the current active
            # session might no longer exist in the restored 'django_session' table.
            # Since SESSION_SAVE_EVERY_REQUEST is True, Django will try to save it and crash.
            request.session.save = lambda *args, **kwargs: None

            return HttpResponse("Database restored successfully", status=200)

        except subprocess.TimeoutExpired:
            process.kill()
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
            return HttpResponse("Database restoration timed out. The database might be in an inconsistent state.", status=500)

    except Exception as e:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        return HttpResponse(f"Error during restoration: {str(e)}", status=500)
