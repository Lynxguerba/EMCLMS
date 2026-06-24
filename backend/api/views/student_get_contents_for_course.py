from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from ..models import Content, ContentFile, Course, Enrollment, User, Grade


@api_view(["GET"])
def student_get_contents_for_course(request, course_id):
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
        contents = (
            Content.objects.filter(section__course=course)
            .select_related("section")
            .prefetch_related("files")
            .order_by("order_in_section")
        )

        # Optimize: Fetch all grades for this user and these contents at once
        grades = Grade.objects.filter(user=user, content__in=contents)
        grade_map = {g.content_id: g.status for g in grades}

        data = []

        for content in contents:
            files = [  
                request.build_absolute_uri(f.file.url)  
                for f in content.files.all()  
                if f.file  
            ]  

            # Get grade status from pre-fetched map
            grade_status = grade_map.get(content.content_id)

            data.append(  
                {  
                    "content_id": content.content_id,  
                    "section": content.section.section_id,  
                    "content_title": content.content_title,  
                    "content_type": content.content_type,  
                    "due_date": (  
                        content.due_date.isoformat() if content.due_date else None  
                    ),  
                    "order_in_section": content.order_in_section,  
                    "created_at": content.created_at.isoformat(),  
                    "updated_at": content.updated_at.isoformat(),  
                    "files": files,  
                    "is_active": content.is_active,  
                    "content_description": content.content_description,  
                    "grade_status": grade_status,
                }  
            )  
        return Response(data, status=status.HTTP_200_OK)
    except Course.DoesNotExist:
        return Response(
            {"detail": "Course not found."}, status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        print(f"Error fetching contents: {e}")
        return Response(
            {"detail": "Could not fetch contents for the course."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
