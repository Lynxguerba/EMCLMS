from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import Course, User, Enrollment, Section, Content

@api_view(["GET"])
def course_detail(request, course_id):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        course = Course.objects.select_related("instructor", "school_year").get(course_id=course_id)
    except Course.DoesNotExist:
        return Response({"detail": "Course not found"}, status=404)

    if user.user_type == "Instructor" and course.instructor != user:
        return Response({"detail": "Unauthorized"}, status=401)

    # Dynamic stats
    enrolled_student_count = Enrollment.objects.filter(course=course).count()
    section_count = Section.objects.filter(course=course).count()
    activity_count = Content.objects.filter(
        section__course=course, content_type="Activity"
    ).count()

    data = {
        "course_id": course.course_id,
        "course_title": course.course_title,
        "course_code": course.course_code,
        "description": course.description,
        "instructor_id": course.instructor.user_id,
        "instructor_fullname": f"{course.instructor.first_name} {course.instructor.last_name}",
        "school_year": course.school_year.school_year if course.school_year else None,
        "enrolled_student_count": enrolled_student_count,
        "section_count": section_count,
        "activity_count": activity_count,
        "schedules": [
            {
                "day_of_week": s.day_of_week,
                "start_time": s.start_time.strftime("%H:%M:%S"),
                "end_time": s.end_time.strftime("%H:%M:%S"),
            }
            for s in course.schedules.all()
        ],
    }
    return Response(data)
