# views/instructor_views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import Enrollment, User, Course


@api_view(["GET"])
def instructor_get_all_unenrolled_students(request, course_id):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        instructor = User.objects.only("user_id", "user_type").get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "Unauthorized"}, status=401)

    if instructor.user_type != "Instructor":
        return Response({"detail": "Unauthorized"}, status=401)

    # Ensure instructor owns this course
    try:
        course = Course.objects.get(course_id=course_id, instructor=instructor)
    except Course.DoesNotExist:
        return Response({"detail": "Course not found or unauthorized"}, status=404)

    # Get IDs of students already enrolled in the course
    enrolled_student_ids = set(Enrollment.objects.filter(course=course).values_list(
        "student_id", flat=True
    ))

    # Get all students - Only fetch necessary fields
    students = User.objects.filter(user_type="Student").only(
        "user_id", "first_name", "last_name", "email", "profile_picture"
    )

    data = []
    for student in students:
        is_enrolled = student.user_id in enrolled_student_ids
        data.append({
            "id": student.user_id,
            "user_id": student.user_id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "email": student.email,
            "profile_picture": student.profile_picture.url if student.profile_picture else None,
            "is_enrolled": is_enrolled
        })

    # Sort: Unenrolled first (False < True)
    data.sort(key=lambda x: x["is_enrolled"])

    return Response(data)
