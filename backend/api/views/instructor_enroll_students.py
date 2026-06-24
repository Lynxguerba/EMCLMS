from rest_framework.decorators import api_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from api.models import Course, User, Enrollment, Notification
from django.db import transaction

@api_view(["POST"])
def instructor_enroll_students(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        user = User.objects.get(user_id=user_id)
        print(f"User retrieved: {user.user_id}, Type: {user.user_type}")
    except User.DoesNotExist:
        return Response({"detail": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)


    course_id = request.data.get("course_id")
    student_ids = request.data.get("student_ids")
    print(f"Received course_id: {course_id}, student_ids: {student_ids}")

    if not course_id or not student_ids:
        return Response(
            {"detail": "Course ID and student IDs are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    print(f"Attempting to get Course with course_id: {course_id}")
    try:
        course = get_object_or_404(Course, course_id=course_id)
        print(f"Course retrieved: {course.course_id}, Instructor: {course.instructor.user_id if course.instructor else 'None'}")
    except:
        return Response(
            {"detail": "Course not found."}, status=status.HTTP_404_NOT_FOUND
        )

    print(f"Checking instructor permission: User type={user.user_type}, Course instructor={course.instructor.user_id if course.instructor else 'None'}, Current user={user.user_id}")
    if user.user_type == "Instructor" and course.instructor != user:
        return Response(
            {"detail": "You are not the instructor of this course."},
            status=status.HTTP_403_FORBIDDEN,
        )

    enrollments_created = []
    enrollments_failed = []

    with transaction.atomic():
        for student_id in student_ids:
            print(f"Processing student_id: {student_id}")
            try:
                student = get_object_or_404(User, user_id=student_id, user_type="Student")
                print(f"Student retrieved: {student.user_id}")
                if not Enrollment.objects.filter(student=student, course=course).exists():
                    print(f"Enrolling student {student.user_id} in course {course.course_id}")
                    enrollment = Enrollment.objects.create(student=student, course=course)
                    enrollments_created.append(
                        {"student_id": student.user_id, "status": "enrolled"}
                    )
                    
                    # Notify the student
                    title = "New Course Enrollment"
                    message = f"You have been enrolled in the course: {course.course_code} ({course.course_title})."
                    Notification.objects.create(
                        user=student,
                        title=title,
                        message=message,
                        status=Notification.Status.UNREAD,
                    )
                else:
                    print(f"Student {student.user_id} already enrolled in course {course.course_id}")
                    enrollments_failed.append(
                        {"student_id": student_id, "status": "already enrolled"}
                    )
            except Exception as e:
                print(f"Error processing student {student_id}: {e}")
                enrollments_failed.append(
                    {"student_id": student_id, "status": "student not found or not a student"}
                )

    if enrollments_created:
        return Response(
            {
                "message": "Enrollment process completed.",
                "created": enrollments_created,
                "failed": enrollments_failed,
            },
            status=status.HTTP_200_OK,
        )
    else:
        return Response(
            {"detail": "No students were enrolled.", "failed": enrollments_failed},
            status=status.HTTP_400_BAD_REQUEST,
        )
