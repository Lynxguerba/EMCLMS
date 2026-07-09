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
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
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

        # Step 2: Run pg_restore
        command = [
            "pg_restore",
            "-d", db_url,
            "--role=postgres",
            "--clean",
            "--if-exists",
            "--no-owner",
            "--no-privileges",
            "--schema=public",
            tmp_path
        ]
        
        try:
            process = subprocess.Popen(
                command, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Wait for completion with a timeout (290s, slightly less than Gunicorn's 300s)
            stdout, stderr = process.communicate(timeout=290)
            
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

            if is_pg_restore_failure(process.returncode, stderr):
                return HttpResponse(
                    f"Database restoration failed: {stderr or stdout}",
                    status=500,
                )

            if process.returncode == 1 and stderr:
                return HttpResponse(
                    f"Database restored, but with some warnings (usually safe to ignore): {stderr}",
                    status=200,
                )

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
