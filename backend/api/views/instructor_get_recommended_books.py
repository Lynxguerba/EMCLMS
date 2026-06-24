from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import Course, Book, User

@api_view(["GET"])
def instructor_get_recommended_books(request, course_id: int):
    # Auth check
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)

    if user.user_type != "Instructor":
        return Response({"detail": "Forbidden"}, status=403)

    # Fetch course and its recommended books
    try:
        course = Course.objects.get(course_id=course_id)
    except Course.DoesNotExist:
        return Response({"detail": "Course not found"}, status=404)
    
    # Check if instructor owns the course
    if course.instructor != user:
        return Response({"detail": "Unauthorized"}, status=401)

    recommended_books = Book.objects.filter(recommended_in_courses=course).values(
        "no", "title", "author", "publisher", "copyright", "isbn", "copy", "bookshelf__name", "file_path"
    )

    return Response(list(recommended_books), status=200)
