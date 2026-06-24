# backend/api/views/librarian_manage_bookshelves.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db import transaction # Import transaction
from ..models import User, Bookshelf, Book

@api_view(["GET", "POST"])
def librarian_manage_bookshelves(request):
    """
    GET → list all bookshelves
    POST → create a new Bookshelf (Librarian only)
    """
    # Authenticate
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)
    try:
        current_user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)
    if current_user.user_type != "Librarian":
        return Response({"detail": "Forbidden"}, status=403)

    if request.method == "GET":
        items = Bookshelf.objects.all().order_by("name")
        data = [
            {"bookshelf_id": i.bookshelf_id, "name": i.name}
            for i in items
        ]
        return Response(data)

    # POST
    name = (request.data.get("name") or "").strip()
    if not name:
        return Response({"detail": "name cannot be empty"}, status=400)

    if Bookshelf.objects.filter(name=name).exists():
        return Response({"detail": "Bookshelf with that name already exists"}, status=400)

    with transaction.atomic():
        # Manually determine the next bookshelf_id to prevent IntegrityError
        # Use select_for_update to prevent race conditions
        last_bookshelf = Bookshelf.objects.select_for_update().order_by("-bookshelf_id").first()
        if last_bookshelf:
            next_id = last_bookshelf.bookshelf_id + 1
        else:
            next_id = 1
        
        obj = Bookshelf.objects.create(bookshelf_id=next_id, name=name)

    return Response(
        {"message": "Created", "bookshelf_id": obj.bookshelf_id}, status=201
    )


@api_view(["DELETE"])
def librarian_delete_bookshelf(request, bookshelf_id):
    """
    DELETE a Bookshelf by id (Librarian only).
    Prevent deletion if any Book references it.
    """
    # Authenticate
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)
    try:
        current_user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)
    if current_user.user_type != "Librarian":
        return Response({"detail": "Forbidden"}, status=403)

    try:
        bookshelf = Bookshelf.objects.get(bookshelf_id=bookshelf_id)
    except Bookshelf.DoesNotExist:
        return Response({"detail": "Not found"}, status=404)

    if Book.objects.filter(bookshelf=bookshelf).exists():
        return Response(
            {"detail": "Cannot delete: books reference this bookshelf."}, status=400
        )

    bookshelf.delete()
    return Response({"message": "Deleted"}, status=200)


@api_view(["PUT", "PATCH"])
def librarian_update_bookshelf(request, bookshelf_id):
    """
    PUT/PATCH → update an existing Bookshelf name (Librarian only)
    - Validates name uniqueness.
    - Prevents renaming the "Default" bookshelf (ID 1).
    """
    # Authenticate
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)
    try:
        current_user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)
    if current_user.user_type != "Librarian":
        return Response({"detail": "Forbidden"}, status=403)

    try:
        bookshelf = Bookshelf.objects.get(bookshelf_id=bookshelf_id)
    except Bookshelf.DoesNotExist:
        return Response({"detail": "Not found"}, status=404)

    name = (request.data.get("name") or "").strip()
    if not name:
        return Response({"detail": "name cannot be empty"}, status=400)

    if Bookshelf.objects.filter(name=name).exclude(bookshelf_id=bookshelf_id).exists():
        return Response({"detail": "Bookshelf with that name already exists"}, status=400)

    bookshelf.name = name
    bookshelf.save()

    return Response(
        {"message": "Updated", "bookshelf_id": bookshelf.bookshelf_id, "name": bookshelf.name}, 
        status=200
    )
