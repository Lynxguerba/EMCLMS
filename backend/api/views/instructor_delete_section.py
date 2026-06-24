import os
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from api.models import Section, Content, ContentFile, Grade, SubmissionFile
from django.db import transaction


@api_view(["DELETE"])
def instructor_delete_section(request, section_id):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        section = Section.objects.select_related("course__instructor").get(
            section_id=section_id
        )

        # Check if the user is the instructor of the course
        if section.course.instructor.user_id != user_id:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        with transaction.atomic():
            # Delete instructor-uploaded ContentFiles from storage
            contents_in_section = Content.objects.filter(section=section)
            for content in contents_in_section:
                content_files_to_delete = ContentFile.objects.filter(content=content)
                for f in content_files_to_delete:
                    # Check if the file exists before attempting to delete
                    if f.file and os.path.exists(f.file.path):
                        f.file.delete(save=False)

                # Delete student-submitted SubmissionFiles from storage
                grades_for_content = Grade.objects.filter(content=content)
                for grade in grades_for_content:
                    submission_files_to_delete = SubmissionFile.objects.filter(
                        grade=grade
                    )
                    for sf in submission_files_to_delete:
                        # Check if the file exists before attempting to delete
                        if sf.file and os.path.exists(sf.file.path):
                            sf.file.delete(save=False)

            section.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except Section.DoesNotExist:
        return Response(
            {"error": "Section not found"}, status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
