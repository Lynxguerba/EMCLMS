from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import User, Book, Bookshelf
import subprocess
import sys


@api_view(["POST"])
def librarian_add_new_book(request):
    #  1. Check if there's a logged-in user
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    #  2. Verify the logged-in user exists
    try:
        current_user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)

    #  3. Ensure only librarians can add books
    if current_user.user_type != "Librarian":
        return Response({"detail": "Forbidden"}, status=403)

    #  4. Get POST data
    title = request.data.get("title")
    author = request.data.get("author")
    publisher = request.data.get("publisher")
    copyright_year = request.data.get("copyright")
    isbn = request.data.get("isbn")

    # Normalize ISBN: treat empty string as None
    if isbn == "" or isbn is None:
        isbn = None

    copy = request.data.get("copy")
    bookshelf = request.data.get("bookshelf")
    uploaded_file = request.FILES.get("file_path")

    #  5. Validate required fields
    if not title or title.strip() == "":
        return Response({"detail": "Title cannot be empty"}, status=400)
    if not author or author.strip() == "":
        return Response({"detail": "Author cannot be empty"}, status=400)

    if copyright_year == "":
        copyright_year = None
    if copy == "":
        copy = None

    if copyright_year is not None:
        if not str(copyright_year).isdigit():
            return Response({"detail": "Copyright must be a number"}, status=400)
        copyright_year = int(copyright_year)

    if copy is not None:
        if not str(copy).isdigit():
            return Response({"detail": "Copy must be a number"}, status=400)
        copy = int(copy)

    #  6. Prevent duplicate ISBN
    if isbn is not None and Book.objects.filter(isbn=isbn).exists():
        return Response({"detail": "ISBN already exists"}, status=400)

    bookshelf_obj = None
    if bookshelf:
        try:
            bookshelf_obj = Bookshelf.objects.get(name=bookshelf)
        except Bookshelf.DoesNotExist:
            return Response({"detail": "Invalid bookshelf name"}, status=400)
    else:
        bookshelf_obj = Bookshelf.objects.get(bookshelf_id=1) # Default to bookshelf_id=1 if not provided

    #  7. Create the book
    book = Book.objects.create(
        title=title,
        author=author,
        publisher=publisher,
        copyright=copyright_year,
        isbn=isbn,
        copy=copy,
        bookshelf=bookshelf_obj,
        recommendation_count=0,
        file_path=uploaded_file if uploaded_file else None,
    )

    #  8. Generate book embedding (efficient single update)
    from ..embedding_utils import update_book_embedding
    try:
        update_book_embedding(book)
    except Exception as e:
        print(f"Error generating embedding for book {book.no}: {e}")
        # We don't fail the request if embedding fails, it can be generated later

    #  9. Return success response
    return Response(
        {
            "message": "Book added successfully",
            "book_id": book.no,
        },
        status=201,
    )
