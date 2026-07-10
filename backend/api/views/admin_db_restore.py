import subprocess
import os
import tempfile
from django.http import HttpResponse
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser
from ..models import User
from ..utils import is_superadmin
from ..utils.db_admin import (
    get_database_url,
    is_pg_restore_failure,
    normalize_supabase_direct_url,
    prepare_public_schema_for_restore,
)

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

    db_url = get_database_url()
    if not db_url:
        return HttpResponse("Database configuration not found", status=500)

    db_url = normalize_supabase_direct_url(db_url)

    # Save uploaded file to a temporary location
    with tempfile.NamedTemporaryFile(delete=False, suffix=".dump") as tmp:
        for chunk in backup_file.chunks():
            tmp.write(chunk)
        tmp_path = tmp.name

    # Prevent Django from attempting to save the session at the end of this request.
    # We are about to drop the schema, so the django_session table will be deleted.
    # If the restore fails or has warnings, Django will still try to save the session
    # causing a ProgrammingError. We disable it here to be safe.
    request.session.save = lambda *args, **kwargs: None

    try:
        # Step 1: Drop and recreate the public schema via direct postgres connection.
        # Django's pooler connection can report CURRENT_USER as postgres.<project_ref>,
        # which is not a real role and breaks CREATE SCHEMA.
        prepare_public_schema_for_restore(db_url)

        # Step 2: Restore Schema and Data together
        # We omit --clean and --if-exists because prepare_public_schema_for_restore already drops the schema.
        # We omit --disable-triggers because it requires superuser privileges and fails on Supabase.
        # Running both together ensures pg_restore handles the Pre-data -> Data -> Post-data phases correctly,
        # preventing foreign key violations during data insertion.
        restore_command = [
            "pg_restore",
            "-d", db_url,
            "--role=postgres",
            "-Fc",
            "--no-owner",
            "--no-privileges",
            "--schema=public",
            tmp_path
        ]

        def run_restore_command(cmd):
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            try:
                stdout, stderr = process.communicate(timeout=290)
            except subprocess.TimeoutExpired:
                process.kill()
                raise TimeoutError("Database restoration timed out. The database might be in an inconsistent state.")
                
            if is_pg_restore_failure(process.returncode, stderr):
                raise Exception(f"Fatal error: {stderr or stdout}")
            if process.returncode == 1 and stderr:
                print(f"Warning during pg_restore: {stderr}")

        try:
            run_restore_command(restore_command)
            
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
            return HttpResponse("Database restored successfully", status=200)

        except Warning as w:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
            return HttpResponse(str(w), status=400)
            
        except TimeoutError as te:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
            return HttpResponse(str(te), status=500)

    except Exception as e:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        return HttpResponse(f"Error during restoration: {str(e)}", status=500)
