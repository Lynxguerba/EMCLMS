from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from ..models import Course, Enrollment, Section, User

@api_view(["GET"])
def student_get_sections_for_course(request, course_id):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response(
            {"detail": "Authentication credentials were not provided."},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    if user.user_type != "Student":
        return Response(
            {"detail": "You do not have permission to perform this action."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        course = Course.objects.get(course_id=course_id)
        # Check enrollment
        if not Enrollment.objects.filter(student=user, course=course).exists():
            return Response(
                {"detail": "You are not enrolled in this course."},
                status=status.HTTP_403_FORBIDDEN,
            )
        sections = Section.objects.filter(course=course).order_by("order_in_course")
        data = []
        for section in sections:
            data.append({
                "section_id": section.section_id,
                "course": section.course.course_id,
                "section_title": section.section_title,
                "description": section.description,
                "order_in_course": section.order_in_course,
                "created_at": section.created_at.isoformat(),
                "updated_at": section.updated_at.isoformat(),
            })
        return Response(data, status=status.HTTP_200_OK)
    except Course.DoesNotExist:
        return Response({"detail": "Course not found."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Error fetching sections: {e}")
        return Response(
            {"detail": "Could not fetch sections for the course."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
