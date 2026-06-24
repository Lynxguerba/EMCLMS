from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta
from django.http import Http404

from ..models import BookRequest, BorrowRecord, User

def check_librarian_auth(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return None, Response({"detail": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return None, Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        
    if user.user_type not in ["Librarian", "Superadmin"]:
        return None, Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        
    return user, None

@api_view(["GET"])
def list_book_requests(request):
    """
    Fetch all book requests with user and book details.
    """
    user, err_resp = check_librarian_auth(request)
    if err_resp:
        return err_resp

    requests = BookRequest.objects.select_related('user', 'book').all().order_by('-request_date')
    data = []
    for req in requests:
        data.append({
            "request_id": req.request_id,
            "user_id": req.user.user_id,
            "user_name": f"{req.user.first_name} {req.user.last_name}",
            "user_email": req.user.email,
            "user_type": req.user.user_type,
            "book_title": req.book.title,
            "book_author": req.book.author,
            "book_isbn": req.book.isbn,
            "reason": req.reason,
            "status": req.status,
            "request_date": req.request_date.isoformat(),
        })
    return Response(data)

@api_view(["POST"])
def update_request_status(request, request_id):
    """
    Update the status of a book request (e.g., to 'Approved').
    """
    user, err_resp = check_librarian_auth(request)
    if err_resp:
        return err_resp

    try:
        book_request = get_object_or_404(BookRequest, request_id=request_id)
        
        # Get status from body if available, default to Approved
        new_status = BookRequest.Status.APPROVED
        if request.data:
            new_status = request.data.get('status', BookRequest.Status.APPROVED)

        # If approving, check availability and deduct copy
        if new_status == BookRequest.Status.APPROVED and book_request.status != BookRequest.Status.APPROVED:
            book = book_request.book
            
            if book.copy is not None and book.copy <= 0:
                return Response({"error": "No copies available to approve this request."}, status=400)
            
            # Deduct copy
            if book.copy is not None:
                book.copy -= 1
                book.save()

            # If no copies left, automatically reject (delete) other pending requests for this book
            if book.copy == 0:
                BookRequest.objects.filter(
                    book=book,
                    status=BookRequest.Status.PENDING
                ).exclude(request_id=request_id).delete()

        # If reverting from Approved, increment copy back
        elif new_status != BookRequest.Status.APPROVED and book_request.status == BookRequest.Status.APPROVED:
            book = book_request.book
            book.copy = (book.copy or 0) + 1
            book.save()

        book_request.status = new_status
        book_request.save()
        
        return Response({"message": f"Request status updated to {new_status}."})
    except Http404:
        raise
    except Exception as e:
         return Response({"error": str(e)}, status=500)

@api_view(["POST"])
def confirm_book_pickup(request, request_id):
    """
    Confirm that the student has picked up the book.
    1. Create a BorrowRecord.
    2. Delete the BookRequest.
    """
    user, err_resp = check_librarian_auth(request)
    if err_resp:
        return err_resp

    try:
        book_request = get_object_or_404(BookRequest, request_id=request_id)
        
        # Get days from body if available
        days = 7
        if request.data:
            try:
                days = int(request.data.get('days', 7))
            except (ValueError, TypeError):
                pass

        # Calculate due date
        due_date = timezone.now() + timedelta(days=days)
        
        BorrowRecord.objects.create(
            user=book_request.user,
            book=book_request.book,
            due_date=due_date,
            status=BorrowRecord.Status.BORROWED
        )
        
        book_request.delete()
        
        return Response({"message": "Book picked up and borrow record created successfully."})
    except Http404:
        raise
    except Exception as e:
         return Response({"error": str(e)}, status=500)

@api_view(["DELETE"])
def reject_book_request(request, request_id):
    """
    Reject a book request:
    1. If it was approved, increment the book copy count.
    2. Delete the BookRequest.
    """
    user, err_resp = check_librarian_auth(request)
    if err_resp:
        return err_resp

    try:
        book_request = get_object_or_404(BookRequest, request_id=request_id)
        
        # If it was already approved, we need to return the copy
        if book_request.status == BookRequest.Status.APPROVED:
            book = book_request.book
            book.copy = (book.copy or 0) + 1
            book.save()
            
        book_request.delete()
        return Response({"message": "Request rejected successfully."})
    except Http404:
        raise
    except Exception as e:
        return Response({"error": str(e)}, status=500)