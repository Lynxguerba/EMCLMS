import subprocess
import os
import tempfile
from django.http import HttpResponse, FileResponse
from rest_framework.decorators import api_view
from ..models import User
from ..utils import is_admin_or_superadmin
from django.utils import timezone
from django.conf import settings

@api_view(["GET"])
def admin_db_backup(request):
    """
    Endpoint to trigger a database backup.
    Accessible by Administrators and Superadmins.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return HttpResponse("Unauthorized", status=401)
    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return HttpResponse("User not found", status=404)
        
    if not is_admin_or_superadmin(user):
        return HttpResponse("Forbidden", status=403)

    # Get database connection string from settings or environment
    # We prefer the raw DATABASE_URL if available as it's already a valid URI
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

    # Normalize db_url to use 'postgresql://' scheme
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    timestamp = timezone.now().strftime("%Y%m%d_%H%M%S")
    filename = f"backup_{timestamp}.dump"
    
    # Use a temporary file to store the dump
    temp_dir = tempfile.gettempdir()
    temp_file_path = os.path.join(temp_dir, filename)

    try:
        # pg_dump command as requested
        # -Fc: custom-format archive
        # --no-owner: skip restoration of object ownership
        # --no-privileges: skip restoration of access privileges (grant/revoke)
        command = [
            "pg_dump",
            db_url,
            "-Fc",
            "--no-owner",
            "--no-privileges"
        ]
        
        with open(temp_file_path, "wb") as f:
            result = subprocess.run(command, stdout=f, stderr=subprocess.PIPE)
        
        if result.returncode != 0:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
            error_message = result.stderr.decode(errors='replace') if result.stderr else "Unknown error"
            return HttpResponse(f"Backup failed: {error_message}", status=500)

        # Serve the file for download
        # We use a custom FileResponse that deletes the file after it's closed
        class DeletingFileResponse(FileResponse):
            def close(self):
                super().close()
                if os.path.exists(temp_file_path):
                    os.remove(temp_file_path)

        response = DeletingFileResponse(
            open(temp_file_path, "rb"), 
            as_attachment=True, 
            filename=filename,
            content_type="application/octet-stream"
        )
        
        return response

    except Exception as e:
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except:
                pass
        return HttpResponse(f"Internal Server Error: {str(e)}", status=500)
