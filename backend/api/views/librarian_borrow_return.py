from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import timedelta

from ..models import BorrowRecord, User, Book, BookRequest

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
def librarian_get_borrow_records(request):
    """
    Fetch all borrow records with user and book details.
    """
    user, err_resp = check_librarian_auth(request)
    if err_resp:
        return err_resp

    records = BorrowRecord.objects.select_related('user', 'book').all().order_by('-borrow_date')
    
    data = []
    for record in records:
        # Calculate fine if overdue (simple logic: 10 per day)
        fine = 0
        if record.status == BorrowRecord.Status.OVERDUE and record.due_date < timezone.now():
             delta = timezone.now() - record.due_date
             fine = delta.days * 10 
        elif record.status == BorrowRecord.Status.RETURNED and record.return_date and record.return_date > record.due_date:
             delta = record.return_date - record.due_date
             fine = delta.days * 10

        data.append({
            "id": record.borrow_id,
            "book_title": record.book.title,
            "book_isbn": record.book.isbn,
            "user_name": f"{record.user.first_name} {record.user.last_name}",
            "user_id": str(record.user.user_id),
            "user_type": record.user.user_type,
            "borrow_date": record.borrow_date.date().isoformat(),
            "due_date": record.due_date.date().isoformat(),
            "return_date": record.return_date.date().isoformat() if record.return_date else None,
            "status": record.status.lower(),
            "fine_amount": fine,
            "librarian_name": "Librarian", 
            "book_condition": record.book_condition,
            "notes": record.notes,
        })
    return Response(data)

@api_view(["POST"])
def librarian_create_borrow_record(request):
    """
    Create a new borrow record manually.
    """
    user, err_resp = check_librarian_auth(request)
    if err_resp:
        return err_resp

    try:
        data = request.data
        user_id_param = data.get('user_id')
        book_isbn = data.get('book_isbn') 
        days = int(data.get('days', 14))

        if not user_id_param or not book_isbn:
             return Response({"error": "User ID and Book ISBN are required."}, status=400)

        try:
            target_user = User.objects.get(user_id=user_id_param)
        except User.DoesNotExist:
             return Response({"error": "User not found."}, status=404)
        except (ValueError, TypeError):
             return Response({"error": "Invalid User ID format."}, status=400)

        book = Book.objects.filter(isbn=book_isbn).first()
        if not book:
             return Response({"error": "Book not found."}, status=404)
        
        if book.copy is not None and book.copy <= 0:
             return Response({"error": "No copies available."}, status=400)

        due_date = timezone.now() + timedelta(days=days)
        
        BorrowRecord.objects.create(
            user=target_user,
            book=book,
            due_date=due_date,
            status=BorrowRecord.Status.BORROWED
        )

        # Decrement available copies
        if book.copy is not None:
            book.copy -= 1
            book.save()

            # If no copies left, automatically reject (delete) other pending requests for this book
            if book.copy == 0:
                BookRequest.objects.filter(
                    book=book,
                    status=BookRequest.Status.PENDING
                ).delete()

        return Response({"message": "Book borrowed successfully."})

    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["PUT"])
def librarian_return_book(request, borrow_id):
    """
    Process a book return.
    """
    user, err_resp = check_librarian_auth(request)
    if err_resp:
        return err_resp

    try:
        try:
            record = BorrowRecord.objects.get(borrow_id=borrow_id)
        except BorrowRecord.DoesNotExist:
             return Response({"error": "Record not found."}, status=404)

        data = request.data
        
        condition = data.get('condition')
        notes = data.get('notes', '')

        record.return_date = timezone.now()
        record.status = BorrowRecord.Status.RETURNED
        record.book_condition = condition
        record.notes = notes
        record.save()

        # Increment available copies
        if record.book.copy is not None:
            record.book.copy += 1
            record.book.save()

        return Response({"message": "Book returned successfully."})

    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
def librarian_check_user(request, user_id):
    """
    Check if a user exists and return basic details.
    """
    user, err_resp = check_librarian_auth(request)
    if err_resp:
        return err_resp

    try:
        target_user = User.objects.get(user_id=user_id)
        # Count currently borrowed books
        borrowed_count = BorrowRecord.objects.filter(
            user=target_user, 
            status__in=[BorrowRecord.Status.BORROWED, BorrowRecord.Status.OVERDUE]
        ).count()
        
        return Response({
            "id": str(target_user.user_id),
            "name": f"{target_user.first_name} {target_user.last_name}",
            "type": target_user.user_type,
            "borrowed_count": borrowed_count
        })
    except (User.DoesNotExist, ValueError):
        return Response({"error": "User not found"}, status=404)

@api_view(["GET"])
def librarian_check_book(request, isbn):
    """
    Check if a book exists by ISBN and return details.
    """
    user, err_resp = check_librarian_auth(request)
    if err_resp:
        return err_resp

    book = Book.objects.filter(isbn=isbn).first()
    if book:
        return Response({
            "no": book.no,
            "title": book.title,
            "author": book.author,
            "isbn": book.isbn,
            "available_copies": book.copy if book.copy is not None else 0
        })
    else:
        return Response({"error": "Book not found"}, status=404)