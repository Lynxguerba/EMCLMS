from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import User, Course, Notification, CourseSchoolYear, CourseSchedule
from ..utils import is_admin_or_superadmin


@api_view(["POST"])
def admin_create_course(request):
    # 1. Check if there's a logged-in user
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    # 2. Verify the logged-in user exists
    try:
        current_user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)

    # 3. Ensure only admins can create courses
    if not is_admin_or_superadmin(current_user):
        return Response({"detail": "Forbidden"}, status=403)

    # 4. Get POST data
    course_code = request.data.get("course_code")
    course_title = request.data.get("course_title")
    description = request.data.get("description", "")
    if description == "":
        description = " "  # Add a single whitespace if blank
    instructor_id = request.data.get("instructor_id")

    if not course_code or course_code.strip() == "":
        return Response({"detail": "Course code cannot be empty"}, status=400)

    if course_title is None or course_title.strip() == "":
        return Response({"detail": "Course title cannot be empty"}, status=400)

    # 5. Validate instructor
    try:
        instructor = User.objects.get(user_id=instructor_id)
        if instructor.user_type != "Instructor":
            return Response({"detail": "User is not an instructor."}, status=400)
    except User.DoesNotExist:
        return Response({"detail": "Instructor not found"}, status=400)

    # 6. Get the latest school year
    latest_school_year = CourseSchoolYear.objects.order_by("-school_year_id").first()
    if not latest_school_year:
        return Response({"detail": "No school year found."}, status=400)

    # 7. Prevent duplicate course code for the SAME instructor in the SAME school year
    if Course.objects.filter(
        course_code=course_code, 
        instructor=instructor, 
        school_year=latest_school_year
    ).exists():
        return Response({"detail": "Course code already exists for this instructor in the current school year"}, status=400)

    # 8. Create the course
    course = Course.objects.create(
        course_code=course_code,
        course_title=course_title,
        description=description,
        instructor=instructor,
        school_year=latest_school_year,
    )

    schedules = request.data.get("schedules", [])
    if schedules:
        for sch in schedules:
            CourseSchedule.objects.create(
                course=course,
                day_of_week=sch.get("day_of_week"),
                start_time=sch.get("start_time"),
                end_time=sch.get("end_time")
            )

    # 8a. Create a notification for the instructor
    title = "New Course Assignment"
    message = f"You have been assigned as the instructor for the new course: {course.course_code} ({course.course_title})."
    Notification.objects.create(
        user=instructor, title=title, message=message, status=Notification.Status.UNREAD
    )

    # 9. Return success response
    return Response(
        {
            "message": "Course created successfully",
            "course_id": course.course_id,
        },
        status=201,
    )
