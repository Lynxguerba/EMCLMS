from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db import transaction
from ..models import Course, User, CourseSchedule
from ..utils import is_admin_or_superadmin
import logging

logger = logging.getLogger(__name__)

@api_view(['PATCH', 'PUT'])
def update_course(request, course_id):
    """
    Updates the title and description of a course.
    
    Allowed for:
    - Administrators only
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        course = Course.objects.get(course_id=course_id)
    except Course.DoesNotExist:
        return Response({"detail": "Course not found"}, status=404)

    # Permission check
    if not is_admin_or_superadmin(user):
        return Response({"detail": "Permission denied"}, status=403)

    course_code = request.data.get("course_code")
    course_title = request.data.get("course_title")
    description = request.data.get("course_description")

    schedules = request.data.get("schedules", [])

    if not course_code:
        return Response({"detail": "Course code is required"}, status=400)
    if not course_title:
        return Response({"detail": "Course title is required"}, status=400)

    try:
        with transaction.atomic():
            course.course_code = course_code
            course.course_title = course_title
            course.description = description
            course.save(update_fields=["course_code", "course_title", "description", "updated_at"])
            
            # Update schedules: simple delete and insert
            if schedules is not None:
                course.schedules.all().delete()
                for sch in schedules:
                    CourseSchedule.objects.create(
                        course=course,
                        day_of_week=sch.get("day_of_week"),
                        start_time=sch.get("start_time"),
                        end_time=sch.get("end_time")
                    )

            db_schedules = list(course.schedules.values("day_of_week", "start_time", "end_time"))
            return Response({
                "success": True,
                "detail": "Course updated successfully.",
                "course": {
                    "course_id": course.course_id,
                    "course_code": course.course_code,
                    "course_title": course.course_title,
                    "course_description": course.description,
                    "schedules": db_schedules
                }
            })
    except Exception as e:
        logger.error(f"Error updating course {course_id}: {str(e)}")
        return Response({"detail": "An error occurred while updating the course."}, status=500)
