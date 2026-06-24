# librarian_get_book_count.py
from django.db.models import Sum, Count
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from ..models import Book, User


@api_view(["GET"])
def librarian_get_book_count(request, argument_type):
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

    if user.user_type != "Librarian":
        return Response(
            {"detail": "You do not have permission to perform this action."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if argument_type == "total-book":
        total_books = Book.objects.count()
        return Response({"count": total_books}, status=status.HTTP_200_OK)

    elif argument_type == "total-search":
        total_recommendation_count = Book.objects.aggregate(
            total_searches=Sum("recommendation_count")
        )["total_searches"]

        return Response(
            {
                "count": (
                    total_recommendation_count
                    if total_recommendation_count is not None
                    else 0
                )
            },
            status=status.HTTP_200_OK,
        )

    elif argument_type == "most-searched":
        # Get the top 5 most searched books
        most_searched_books = Book.objects.order_by("-recommendation_count")[:4]
        book_list = [
            {"title": book.title, "recommendation_count": book.recommendation_count}
            for book in most_searched_books
        ]
        return Response({"books": book_list}, status=status.HTTP_200_OK)

    elif argument_type == "borrowed-today":
        from ..models import BorrowRecord
        from django.utils import timezone
        today = timezone.now().date()
        count = BorrowRecord.objects.filter(borrow_date__date=today).count()
        return Response({"count": count}, status=status.HTTP_200_OK)

    elif argument_type == "overdue-count":
        from ..models import BorrowRecord
        from django.utils import timezone
        from django.db.models import Q
        now = timezone.now()
        count = BorrowRecord.objects.filter(
            Q(status=BorrowRecord.Status.OVERDUE) |
            (Q(status=BorrowRecord.Status.BORROWED) & Q(due_date__lt=now))
        ).count()
        return Response({"count": count}, status=status.HTTP_200_OK)

    else:
        return Response(
            {
                "detail": "Invalid argument. Please use 'total-book', 'total-search', 'most-searched', 'borrowed-today', or 'overdue-count'."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
