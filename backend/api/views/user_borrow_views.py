from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from ..models import User, BookRequest, BorrowRecord, Book

@api_view(["POST"])
def submit_borrow_request(request):
    """
    Submit a borrow request for a book.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        user = User.objects.get(user_id=user_id)
        
        book_id = request.data.get("book_id")
        reason = request.data.get("reason", "")

        if not book_id:
            return Response({"error": "Book ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        book = Book.objects.get(no=book_id)

        # Check if the user already has a pending or approved request for this book
        existing_request = BookRequest.objects.filter(
            user=user,
            book=book,
            status__in=[BookRequest.Status.PENDING, BookRequest.Status.APPROVED]
        ).exists()

        if existing_request:
            return Response({"error": "You already have an active request for this book."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if the user already has the book borrowed
        existing_borrow = BorrowRecord.objects.filter(
            user=user,
            book=book,
            status__in=[BorrowRecord.Status.BORROWED, BorrowRecord.Status.OVERDUE]
        ).exists()

        if existing_borrow:
            return Response({"error": "You already have this book borrowed."}, status=status.HTTP_400_BAD_REQUEST)

        # Create the request
        BookRequest.objects.create(
            user=user,
            book=book,
            reason=reason,
            status=BookRequest.Status.PENDING
        )

        return Response({"message": "Borrow request submitted successfully."})

    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
    except Book.DoesNotExist:
        return Response({"error": "Book not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(["DELETE"])
def cancel_book_request(request, request_id):
    """
    Cancel a book request by the user.
    If the request was already approved, return the copy.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        # Ensure the request belongs to the user
        try:
            book_request = BookRequest.objects.get(request_id=request_id, user_id=user_id)
        except BookRequest.DoesNotExist:
            return Response({"error": "Request not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # If it was already approved, we need to return the copy
        if book_request.status == BookRequest.Status.APPROVED:
            book = book_request.book
            book.copy = (book.copy or 0) + 1
            book.save()
            
        book_request.delete()
        return Response({"message": "Request cancelled successfully."})
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(["GET"])
def user_get_book_requests(request):
    """
    Fetch all book requests for the logged-in user.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    requests = BookRequest.objects.filter(user=user).select_related('book').order_by('-request_date')
    
    data = []
    for req in requests:
        data.append({
            "id": f"REQ-{req.request_id}",
            "book_id": req.book.no,
            "title": req.book.title,
            "author": req.book.author,
            "requestDate": req.request_date.strftime("%b %d, %Y"),
            "status": req.status,
        })
    
    return Response(data)

@api_view(["GET"])
def user_get_borrow_records(request):
    """
    Fetch all borrow records for the logged-in user.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    records = BorrowRecord.objects.filter(user=user).select_related('book').order_by('-borrow_date')
    
    data = []
    for record in records:
        # Determine status display (check for overdue)
        status_display = record.status
        if record.status == BorrowRecord.Status.BORROWED and record.due_date < timezone.now():
            status_display = "Overdue"
        
        # We don't have renewal count in the model yet, defaulting to 0
        renewal_count = 0 

        data.append({
            "id": f"BR-{record.borrow_id}",
            "book_id": record.book.no,
            "title": record.book.title,
            "author": record.book.author,
            "dueDate": record.due_date.strftime("%b %d, %Y"),
            "borrowedOn": record.borrow_date.strftime("%b %d, %Y"),
            "renewalCount": renewal_count,
            "status": status_display,
            "returnDate": record.return_date.strftime("%b %d, %Y") if record.return_date else None,
            "condition": record.book_condition
        })
    
    return Response(data)
