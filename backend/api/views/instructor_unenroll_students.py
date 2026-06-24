from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from api.models import Course, User, Enrollment, Notification
from django.db import transaction

@api_view(["POST"])
def instructor_unenroll_students(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    course_id = request.data.get("course_id")
    student_ids = request.data.get("student_ids")

    if not course_id or not student_ids:
        return Response(
            {"detail": "Course ID and student IDs are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    course = get_object_or_404(Course, course_id=course_id)

    if user.user_type == "Instructor" and course.instructor != user:
        return Response(
            {"detail": "You are not the instructor of this course."},
            status=status.HTTP_403_FORBIDDEN,
        )

    unenrollments_success = []
    unenrollments_failed = []

    with transaction.atomic():
        for student_id in student_ids:
            try:
                student = get_object_or_404(User, user_id=student_id, user_type="Student")
                enrollment = Enrollment.objects.filter(student=student, course=course).first()
                
                if enrollment:
                    enrollment.delete()
                    unenrollments_success.append(student_id)
                    
                    # Notify the student
                    title = "Course Unenrollment"
                    message = f"You have been unenrolled from the course: {course.course_code} ({course.course_title})."
                    Notification.objects.create(
                        user=student,
                        title=title,
                        message=message,
                        status=Notification.Status.UNREAD,
                    )
                else:
                    unenrollments_failed.append(
                        {"student_id": student_id, "status": "not enrolled"}
                    )
            except Exception as e:
                unenrollments_failed.append(
                    {"student_id": student_id, "status": str(e)}
                )

    return Response(
        {
            "message": "Unenrollment process completed.",
            "unassigned": unenrollments_success,
            "failed": unenrollments_failed,
        },
        status=status.HTTP_200_OK,
    )
