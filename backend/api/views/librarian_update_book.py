from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import User, Book, Bookshelf


@api_view(["PUT"])
def librarian_update_book(request, book_id):
    # 1. Check session
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    # 2. Verify user
    try:
        current_user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)

    # 3. Ensure admin
    if current_user.user_type != "Librarian":
        return Response({"detail": "Forbidden"}, status=403)

    # 4. Get book
    try:
        book = Book.objects.get(no=book_id)
    except Book.DoesNotExist:
        return Response({"detail": "Book not found"}, status=404)

    # 5. Get data
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
    delete_file = request.data.get("delete_file") == "true"

    # 6. Validate
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

    if isbn and Book.objects.exclude(no=book_id).filter(isbn=isbn).exists():
        return Response({"detail": "ISBN already exists"}, status=400)

    if bookshelf:
        try:
            bookshelf_obj = Bookshelf.objects.get(name=bookshelf)
        except Bookshelf.DoesNotExist:
            return Response({"detail": "Invalid bookshelf name"}, status=400)
    else:
        bookshelf_obj = Bookshelf.objects.get(bookshelf_id=1) # Default to bookshelf_id=1 if not provided

    # 7. Update
    book.title = title
    book.author = author
    book.publisher = publisher
    book.copyright = copyright_year
    book.isbn = isbn
    book.copy = copy
    book.bookshelf = bookshelf_obj

    if delete_file:
        if book.file_path:
            book.file_path.delete(save=False)
        book.file_path = None

    if uploaded_file:
        if book.file_path:
            book.file_path.delete(save=False)
        book.file_path = uploaded_file

    book.save()

    return Response({"message": "Book updated successfully"}, status=200)
