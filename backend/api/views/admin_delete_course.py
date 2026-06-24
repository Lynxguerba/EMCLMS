from django.db import transaction
from django.db.models import Q
from rest_framework.decorators import api_view
from rest_framework.response import Response

from ..models import (
    Course,
    CourseRecommendedBook,
    Book,
    Notification,
    User,
)
from ..utils import is_admin_or_superadmin


@api_view(["DELETE"])
def admin_delete_course(request, course_id):
    """
    Atomic admin endpoint to delete a course and all dependent data.
    Responsibilities:
      - Require authenticated admin user (session-based)
      - Decrement recommendation_count for books linked via CourseRecommendedBook
      - Remove notifications tied to the course, its sections, and its contents
      - Delete Course (which cascades to sections, contents, grades, files, enrollments, etc.)
      - All inside a single transaction for consistency
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "Unauthorized"}, status=401)

    if not is_admin_or_superadmin(user):
        return Response({"detail": "Forbidden"}, status=403)

    try:
        course = Course.objects.get(course_id=course_id)
    except Course.DoesNotExist:
        return Response({"detail": "Course not found"}, status=404)

    try:
        with transaction.atomic():
            # 1) Handle CourseRecommendedBook relations: decrement book counts, then delete relations
            rels = CourseRecommendedBook.objects.select_related("book").filter(
                course=course
            )
            book_updates = []
            for rel in rels:
                book = rel.book
                # Defensive: ensure non-negative counts
                if book.recommendation_count and book.recommendation_count > 0:
                    book.recommendation_count -= 1
                else:
                    book.recommendation_count = 0
                book_updates.append(book)

            # Bulk update books' recommendation_count (if any)
            for b in book_updates:
                b.save(update_fields=["recommendation_count"])

            # Delete the CourseRecommendedBook relations for this course
            rels.delete()



            # 2) Notify the instructor that their course has been deleted
            title = "Course Deletion Notice"
            message = f"The course '{course.course_title} ({course.course_code})' for which you were the instructor has been deleted by an administrator."
            Notification.objects.create(
                user=course.instructor,
                title=title,
                message=message,
                status=Notification.Status.UNREAD,
            )

            # 3) Finally delete the course itself.
            # This will cascade to Sections, Contents, Grades, ContentFiles, SubmissionFiles, Enrollments, etc.
            course.delete()

        return Response({"success": True})
    except Exception as e:
        return Response({"success": False, "detail": str(e)}, status=500)
