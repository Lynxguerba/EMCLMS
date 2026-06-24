from django.http import HttpResponse
from django.template.loader import get_template
from xhtml2pdf import pisa
from rest_framework.decorators import api_view
from ..utils.text_helpers import wrap_long_words_all_columns
from ..models import User


from ..utils import is_admin_or_superadmin


@api_view(["GET"])
def admin_generate_allusers_pdf_report(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return HttpResponse("Unauthorized", status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return HttpResponse("User not found", status=404)

    if not is_admin_or_superadmin(user):
        return HttpResponse("Forbidden", status=403)

    users_query = User.objects.all()
    # Security: Standard Administrators cannot see Superadmin accounts
    if user.user_type != "Superadmin":
        users_query = users_query.exclude(user_type="Superadmin")

    users = users_query.values(
        "user_id", "first_name", "last_name", "email", "user_type"
    )

    # Define which fields to wrap and their chunk sizes
    fields_to_wrap = {
        "email": 18,
    }

    wrapped_users = []
    for record in users:
        wrapped_record = wrap_long_words_all_columns(record, fields_to_wrap)
        wrapped_users.append(wrapped_record)

    context = {"users": wrapped_users}

    template = get_template("allusers_admin_report_template.html")
    html = template.render(context)

    response = HttpResponse(content_type="application/pdf")
    pisa_status = pisa.CreatePDF(html, dest=response)

    if pisa_status.err:
        return HttpResponse("We had some errors <pre>" + html + "</pre>")

    return response
