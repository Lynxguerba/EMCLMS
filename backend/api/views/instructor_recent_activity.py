from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import User, Enrollment, Grade
from django.utils import timezone
from zoneinfo import ZoneInfo

@api_view(["GET"])
def get_instructor_recent_activity(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        instructor = User.objects.get(user_id=user_id, user_type="Instructor")
    except User.DoesNotExist:
        return Response({"detail": "Unauthorized"}, status=401)

    manila_tz = ZoneInfo("Asia/Manila")
    activities = []
    
    school_year = request.query_params.get("school_year")
    enrollment_filter = {"course__instructor": instructor}
    grade_filter = {"content__section__course__instructor": instructor, "submitted_at__isnull": False}
    if school_year and school_year != "All":
        enrollment_filter["course__school_year__school_year"] = school_year
        grade_filter["content__section__course__school_year__school_year"] = school_year

    # 1. Get Recent Enrollments
    enrollments = Enrollment.objects.filter(
        **enrollment_filter
    ).select_related('student', 'course').order_by('-enrollment_date')[:10]

    for e in enrollments:
        activities.append({
            "id": f"enroll_{e.enrollment_id}",
            "student_name": f"{e.student.first_name} {e.student.last_name}",
            "action": "Enrolled in course",
            "course_code": e.course.course_code,
            "timestamp": e.enrollment_date.astimezone(manila_tz).isoformat(),
            "type": "enrollment"
        })

    # 2. Get Recent Submissions
    submissions = Grade.objects.filter(
        **grade_filter
    ).select_related('user', 'content__section__course').order_by('-submitted_at')[:10]

    for s in submissions:
        activities.append({
            "id": f"sub_{s.grade_id}",
            "student_name": f"{s.user.first_name} {s.user.last_name}",
            "action": f"Submitted {s.content.content_title}",
            "course_code": s.content.section.course.course_code,
            "timestamp": s.submitted_at.astimezone(manila_tz).isoformat(),
            "type": "submission"
        })

    # Sort combined activities by timestamp
    activities.sort(key=lambda x: x['timestamp'], reverse=True)

    return Response(activities[:15])
