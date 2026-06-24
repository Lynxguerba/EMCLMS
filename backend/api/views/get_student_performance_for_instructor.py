from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import Grade, Enrollment, Course, Content, User


@api_view(["GET"])
def get_student_performance_for_instructor(request, student_id):
    instructor_id = request.session.get("user_id")
    if not instructor_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        instructor = User.objects.get(user_id=instructor_id, user_type="Instructor")
    except User.DoesNotExist:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        student = User.objects.get(user_id=student_id, user_type="Student")
    except User.DoesNotExist:
        return Response({"detail": "Student not found"}, status=404)

    # Check if the instructor handles this student
    # A student is handled by an instructor if they are enrolled in at least one of the instructor's courses
    is_handled = Enrollment.objects.filter(
        student=student,
        course__instructor=instructor
    ).exists()

    if not is_handled:
        return Response({"detail": "Forbidden: You do not handle this student"}, status=403)

    # Now use the same logic as get_student_performance but for the target student
    enrollments = Enrollment.objects.filter(student=student).select_related("course")
    course_ids = [e.course_id for e in enrollments]

    # Fetch all activities for these courses in one query
    activities = (
        Content.objects.filter(section__course__in=course_ids, content_type="Activity")
        .select_related("section")
        .order_by("section__course_id", "section__order_in_course", "order_in_section")
    )

    # Fetch all grades for this student for these activities in one query
    grades = Grade.objects.filter(user=student, content__in=activities)
    grade_map = {g.content_id: g.normalized_score for g in grades}

    # Group activities by course
    course_activities = {}
    for activity in activities:
        c_id = activity.section.course_id
        if c_id not in course_activities:
            course_activities[c_id] = []
        
        normalized = float(grade_map.get(activity.content_id) or 0.0)
        course_activities[c_id].append({
            "content_id": activity.content_id,
            "content_title": activity.content_title,
            "normalized_score": normalized,
        })

    course_averages = []
    for c_id, activities_list in course_activities.items():
        if activities_list:
            # Calculate average for this course
            scores = [a["normalized_score"] for a in activities_list]
            course_averages.append(sum(scores) / len(scores))
    
    overall_average = sum(course_averages) / len(course_averages) if course_averages else 0.0

    data = []
    for enrollment in enrollments:
        course = enrollment.course
        data.append(
            {
                "course_id": course.course_id,
                "course_code": course.course_code,
                "course_title": course.course_title,
                "activities": course_activities.get(course.course_id, []),
            }
        )

    return Response({
        "student_name": f"{student.first_name} {student.last_name}",
        "courses": data,
        "overall_average": round(overall_average, 1)
    })
