from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from ..models import User, Course, SubmissionFile, Grade
from ..utils import is_admin_or_superadmin
from django.conf import settings
import os


@api_view(["POST"])
def admin_delete_user(request, user_id):
    """
    Deletes a user with specific logic based on user type:
    - Instructors: Can reassign courses before deletion.
    - Students: Deletes physical submission files.
    - All: Preserves logs (handled by models.SET_NULL).
    """
    # 1. Auth Check (Manual Session)
    session_user_id = request.session.get("user_id")
    if not session_user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        requester = User.objects.get(user_id=session_user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)

    if not is_admin_or_superadmin(requester):
        return Response({"detail": "Forbidden"}, status=403)

    target_user = get_object_or_404(User, user_id=user_id)

    # Security check: Only Superadmins can delete other Superadmins or Administrators
    if target_user.user_type in ["Superadmin", "Administrator"] and requester.user_type != "Superadmin":
        return Response(
            {"detail": "Only Superadmins can delete other Superadmins or Administrators."},
            status=403,
        )

    try:
        # 2. Handle Instructor Reassignment
        if target_user.user_type == "Instructor":
            reassign_id = request.data.get("reassign_instructor_id")
            if reassign_id:
                new_instructor = get_object_or_404(
                    User, user_id=reassign_id, user_type="Instructor"
                )
                # Update all courses to the new instructor
                Course.objects.filter(instructor=target_user).update(
                    instructor=new_instructor
                )

        # 3. Handle Student File Deletion
        elif target_user.user_type == "Student":
            # Find all submission files linked to this student's grades
            # Grade -> SubmissionFile
            student_grades = Grade.objects.filter(user=target_user)
            submission_files = SubmissionFile.objects.filter(grade__in=student_grades)

            for sub_file in submission_files:
                if sub_file.file:
                    file_path = os.path.join(settings.MEDIA_ROOT, sub_file.file.name)
                    if os.path.exists(file_path):
                        try:
                            os.remove(file_path)
                        except Exception as e:
                            print(f"Error deleting file {file_path}: {e}")

        # 4. Delete the User
        # Django's CASCADE will handle:
        # - Courses (if not reassigned)
        # - Enrollments
        # - Grades (and SubmissionFile rows)
        # - Notifications
        # SET_NULL will handle:
        # - StudentLogs
        # - InstructorLogs
        target_user.delete()

        return Response({"success": True, "message": "User deleted successfully."})

    except Exception as e:
        return Response({"success": False, "detail": str(e)}, status=500)
