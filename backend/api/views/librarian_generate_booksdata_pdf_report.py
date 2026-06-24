from django.http import HttpResponse
from django.template.loader import get_template
from xhtml2pdf import pisa
from rest_framework.decorators import api_view
from ..models import Book, User
from ..utils.text_helpers import wrap_long_words_all_columns


@api_view(["GET"])
def librarian_generate_booksdata_pdf_report(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return HttpResponse("Unauthorized", status=401)
    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return HttpResponse("User not found", status=404)
    if user.user_type != "Librarian":
        return HttpResponse("Forbidden", status=403)
    books = Book.objects.select_related("bookshelf").all()

    context = {
        "books_data": [
            wrap_long_words_all_columns(
                {
                    "id": b.no,
                    "title": b.title,
                    "author": b.author,
                    "publisher": b.publisher or "",
                    "copyright": b.copyright or "",
                    "isbn": b.isbn or "",
                    "copy": b.copy or 0,
                    "recommendation_count": b.recommendation_count,
                    "category": b.bookshelf.name if b.bookshelf else "",
                },
                fields_to_wrap={
                    "publisher": 13,
                    "isbn": 11,
                },
            )
            for b in books
        ]
    }

    template = get_template("booksdata_librarian_report_template.html")
    html = template.render(context)
    response = HttpResponse(content_type="application/pdf")
    pisa_status = pisa.CreatePDF(html, dest=response)
    if pisa_status.err:
        return HttpResponse("We had some errors <pre>" + html + "</pre>")
    return response
