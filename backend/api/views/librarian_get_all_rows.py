from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.apps import apps
from ..models import User 


@api_view(["GET"])
def librarian_get_all_rows(request):
    # Auth
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)

    if user.user_type != "Librarian":
        return Response({"detail": "Forbidden"}, status=403)

    # Get table from query param
    table = request.GET.get("table")
    if not table:
        return Response({"detail": "Please provide ?table="}, status=400)
        
    if table not in ["book", "bookshelf"]:
        return Response({"detail": "Forbidden"}, status=403)

    try:
        # Dynamically fetch model by table name
        model = apps.get_model("api", table)
    except LookupError:
        return Response({"detail": f"Invalid table '{table}'"}, status=400)

    if table == "book":
        books = model.objects.select_related("bookshelf").all().order_by('no')
        rows = []
        for book in books:
            file_url = None
            if book.file_path:
                try:
                    file_url = book.file_path.url
                except Exception:
                    file_url = None
            
            rows.append({
                "no": book.no,
                "title": book.title,
                "author": book.author,
                "publisher": book.publisher,
                "copyright": book.copyright,
                "isbn": book.isbn,
                "copy": book.copy,
                "recommendation_count": book.recommendation_count,
                "file_path": file_url,
                "bookshelf__name": book.bookshelf.name if book.bookshelf else None
            })
    elif table == "bookshelf":
        rows = list(model.objects.values("bookshelf_id", "name"))
    else:
        rows = list(model.objects.values())
    return Response(rows, status=200)
