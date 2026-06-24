from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from ..models import Enrollment, Section, User

@api_view(["GET"])
def student_get_all_sections(request):
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
        school_year = request.query_params.get("school_year")
        enrollment_filter = {"student": user}
        if school_year and school_year != "All":
            enrollment_filter["course__school_year__school_year"] = school_year

        enrolled_courses = Enrollment.objects.filter(**enrollment_filter).values_list("course", flat=True)  
        sections = Section.objects.filter(course__in=enrolled_courses)  

        data = []
        for section in sections:
            data.append({
                "section_id": section.section_id,
                "course": section.course_id,
                "section_title": section.section_title,
                "description": section.description,
                "order_in_course": section.order_in_course,
            })
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"Error fetching sections: {e}")
        return Response(
            {"detail": "Could not fetch sections."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
