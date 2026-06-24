from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from ..models import Content, Enrollment, Section, User, Grade


@api_view(["GET"])
def student_get_all_contents(request):
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

        enrolled_courses = Enrollment.objects.filter(
            **enrollment_filter
        ).values_list("course", flat=True)

        sections = Section.objects.filter(course__in=enrolled_courses).values_list(
            "section_id", flat=True
        )

        # Optimize: select_related for section and prefetch_related for files
        contents = (
            Content.objects.filter(section__in=sections)
            .select_related("section")
            .prefetch_related("files")
        )

        # Optimize: Fetch all grades for this user and these contents at once
        grades = Grade.objects.filter(user=user, content__in=contents)
        grade_map = {g.content_id: g.status for g in grades}

        data = []
        for c in contents:
            # Get grade status from the pre-fetched map
            grade_status = grade_map.get(c.content_id)

            # Get first file from pre-fetched files
            all_files = list(c.files.all())
            file_url = all_files[0].file.url if all_files else None
            files = [
                request.build_absolute_uri(f.file.url)
                for f in all_files
                if f.file
            ]

            data.append(
                {
                    "content_id": c.content_id,
                    "section": c.section.section_id,
                    "content_title": c.content_title,
                    "content_type": c.content_type,
                    "due_date": c.due_date,
                    "order_in_section": c.order_in_section,
                    "file_path": file_url,
                    "files": files,
                    "is_active": c.is_active,
                    "content_description": c.content_description,
                    "grade_status": grade_status,
                }
            )

        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"Error fetching contents: {e}")
        return Response(
            {"detail": "Could not fetch contents."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
