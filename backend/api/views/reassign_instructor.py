from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db import transaction
from ..models import Course, User, Notification
from ..utils import is_admin_or_superadmin


@api_view(["POST"])
def admin_reassign_instructor(request, course_id):
    """
    Reassign the instructor for a course.
    Body: { "new_instructor_id": <number> }

    Requirements:
      - Only administrators can perform this action.
      - The new user must have user_type == "Instructor".
      - Update happens inside a transaction and uses select_for_update on the course.
      - Does NOT touch logs or notifications (per spec).
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        caller = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "Unauthorized"}, status=401)

    if not is_admin_or_superadmin(caller):
        return Response({"detail": "Unauthorized"}, status=401)

    new_instructor_id = request.data.get("new_instructor_id")
    if not new_instructor_id:
        return Response({"detail": "new_instructor_id is required"}, status=400)

    try:
        new_instructor = User.objects.get(user_id=new_instructor_id)
    except User.DoesNotExist:
        return Response({"detail": "New instructor not found"}, status=404)

    if new_instructor.user_type != "Instructor":
        return Response({"detail": "User is not an instructor"}, status=400)

    try:
        with transaction.atomic():
            # Lock the course row
            course = Course.objects.select_for_update().get(course_id=course_id)

            # If same instructor, just return success (idempotent)
            if course.instructor.user_id == new_instructor.user_id:
                return Response(
                    {
                        "success": True,
                        "detail": "Instructor unchanged (same instructor).",
                        "instructor_id": new_instructor.user_id,
                    }
                )

            course.instructor = new_instructor
            course.save(update_fields=["instructor", "updated_at"])

            # Notify the new instructor
            title = "New Course Assignment"
            message = f"You have been assigned as the new instructor for the course: {course.course_code} ({course.course_title})."
            Notification.objects.create(
                user=new_instructor,
                title=title,
                message=message,
                status=Notification.Status.UNREAD,
            )

    except Course.DoesNotExist:
        return Response({"detail": "Course not found"}, status=404)

    return Response(
        {
            "success": True,
            "detail": "Instructor reassigned successfully.",
            "instructor_id": new_instructor.user_id,
            "instructor_fullname": f"{new_instructor.first_name} {new_instructor.last_name}",
        }
    )
