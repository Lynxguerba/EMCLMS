from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Count
from ..models import Book, BookAccess, User

@api_view(["GET"])
def get_most_accessed_books(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
        if user.user_type != "Librarian" and user.user_type != "Superadmin":
            return Response({"detail": "Forbidden"}, status=403)
    except User.DoesNotExist:
        return Response({"detail": "Unauthorized"}, status=401)

    # Aggregate accesses per book
    # Since we already have a 24-hour cooldown in the recording view,
    # the count here is already "cleaner".
    most_accessed = Book.objects.annotate(
        access_count=Count('accesses')
    ).filter(access_count__gt=0).order_by('-access_count')[:10]

    data = [
        {
            "book_id": book.no,
            "title": book.title,
            "author": book.author,
            "access_count": book.access_count,
        }
        for book in most_accessed
    ]

    return Response(data)
