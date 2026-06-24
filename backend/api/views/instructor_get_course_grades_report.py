from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import Course, Enrollment, Grade, User, Content, Section
from django.db.models import Prefetch


@api_view(["GET"])
def instructor_get_course_grades_report(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

    if user.user_type != "Instructor":
        return Response({"error": "Forbidden"}, status=403)

    course_id = request.query_params.get("course_id")
    if not course_id:
        return Response({"error": "course_id is required"}, status=400)

    try:
        course = Course.objects.get(course_id=course_id, instructor=user)
    except Course.DoesNotExist:
        return Response(
            {"error": "Course not found or you are not the instructor"}, status=404
        )

    # Get sections and activities using prefetch_related
    sections = (
        Section.objects.filter(course=course)
        .prefetch_related(
            Prefetch(
                "content_set",
                queryset=Content.objects.filter(content_type="Activity").order_by(
                    "order_in_section"
                ),
                to_attr="activities",
            )
        )
        .order_by("order_in_course")
    )

    columns = []
    all_activity_ids = []

    for section in sections:
        section_data = {
            "section_id": section.section_id,
            "section_title": section.section_title,
            "activities": [],
        }

        for activity in section.activities:
            section_data["activities"].append(
                {
                    "content_id": activity.content_id,
                    "content_title": activity.content_title,
                    "total_score": activity.total_score,
                }
            )
            all_activity_ids.append(activity.content_id)

        if section_data["activities"]:
            columns.append(section_data)

    # Get enrolled students
    enrollments = (
        Enrollment.objects.filter(course=course, student__user_type="Student")
        .select_related("student")
        .order_by("student__last_name", "student__first_name")
    )

    # Bulk fetch all grades for these students and these activities in one query
    student_ids = [e.student_id for e in enrollments]
    all_grades = Grade.objects.filter(
        user_id__in=student_ids, content_id__in=all_activity_ids
    )

    # Organize grades into a map for fast lookup: (student_id, content_id) -> grade
    grades_cache = {}
    for g in all_grades:
        grades_cache[(g.user_id, g.content_id)] = g

    students_data = []
    for enrollment in enrollments:
        student = enrollment.student

        student_grades = {}
        for activity_id in all_activity_ids:
            grade = grades_cache.get((student.user_id, activity_id))
            if grade:
                student_grades[activity_id] = {
                    "score": grade.score,
                    "percentage": grade.normalized_score,
                }
            else:
                student_grades[activity_id] = {"score": None, "percentage": None}

        students_data.append(
            {
                "user_id": student.user_id,
                "first_name": student.first_name,
                "last_name": student.last_name,
                "profile_picture": (
                    student.profile_picture.url if student.profile_picture else None
                ),
                "grades": student_grades,
            }
        )

    return Response(
        {
            "course": {
                "id": course.course_id,
                "title": course.course_title,
                "code": course.course_code,
            },
            "columns": columns,
            "students": students_data,
        }
    )
