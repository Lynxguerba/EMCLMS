# backend/api/views/instructor_add_course_book.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import User, Course, Book, CourseRecommendedBook
from django.db import transaction


@api_view(["POST"])
def instructor_add_course_book(request):
    # 1. Check session
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        current_user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)

    # 2. Ensure only instructors can add
    if current_user.user_type != "Instructor":
        return Response({"detail": "Forbidden"}, status=403)

    # 3. Get POST data
    course_id = request.data.get("course_id")
    book_id = request.data.get("book_id")

    if not course_id or not book_id:
        return Response({"detail": "Missing course_id or book_id"}, status=400)

    try:
        course = Course.objects.get(course_id=course_id, instructor=current_user)
    except Course.DoesNotExist:
        return Response(
            {"detail": "Course not found or not owned by instructor"}, status=404
        )

    try:
        book = Book.objects.get(no=book_id)
    except Book.DoesNotExist:
        return Response({"detail": "Book not found"}, status=404)

    # 4. Toggle recommendation
    existing = CourseRecommendedBook.objects.filter(course=course, book=book).first()
    if existing:
        with transaction.atomic():
            existing.delete()
            # decrement recommendation_count safely
            book.recommendation_count = max(0, book.recommendation_count - 1)
            book.save(update_fields=["recommendation_count"])
        return Response(
            {"message": "Book removed from course successfully"}, status=200
        )

    else:
        with transaction.atomic():
            CourseRecommendedBook.objects.create(course=course, book=book)
            # increment recommendation_count
            book.recommendation_count = book.recommendation_count + 1
            book.save(update_fields=["recommendation_count"])
        return Response({"message": "Book added to course successfully"}, status=201)
