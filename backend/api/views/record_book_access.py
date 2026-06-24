from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from ..models import Book, User, BookAccess

@api_view(["POST"])
def record_book_access(request, book_id):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        book = Book.objects.get(no=book_id)
    except Book.DoesNotExist:
        return Response({"detail": "Book not found"}, status=404)

    # Abuse Prevention: Check if this user has already accessed this book in the last 24 hours
    cooldown_period = timezone.now() - timedelta(hours=24)
    recent_access = BookAccess.objects.filter(
        book=book, 
        user=user, 
        accessed_at__gte=cooldown_period
    ).exists()

    if recent_access:
        # We don't record it again to prevent bias, but we return success to the frontend
        # so it doesn't show an error.
        return Response({"detail": "Access already recorded recently"}, status=200)

    # Record the access
    BookAccess.objects.create(book=book, user=user)

    return Response({"detail": "Access recorded successfully"}, status=201)
