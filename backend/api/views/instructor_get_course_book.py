from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Exists, OuterRef
from ..models import User, Course, CourseRecommendedBook


@api_view(["GET"])
def instructor_get_course_book(request):
    # 1. Check session
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        current_user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)

    # 2. Ensure only instructors can access
    if current_user.user_type != "Instructor":
        return Response({"detail": "Forbidden"}, status=403)

    # 3. Get query params
    book_id = request.GET.get("book_id")

    # 4. Base queryset: instructor’s courses
    courses = Course.objects.filter(instructor=current_user).select_related('school_year')

    # 5. Annotate with is_book_mapped if book_id provided
    if book_id:
        courses = courses.annotate(
            is_book_mapped=Exists(
                CourseRecommendedBook.objects.filter(
                    course=OuterRef("pk"), book_id=book_id
                )
            )
        )

    # 6. Serialize response
    data = [
        {
            "course_id": c.course_id,
            "course_title": c.course_title,
            "course_code": c.course_code,
            "description": c.description,
            "school_year": c.school_year.school_year,
            "is_book_mapped": getattr(c, "is_book_mapped", False),
        }
        for c in courses
    ]

    return Response(data, status=200)
