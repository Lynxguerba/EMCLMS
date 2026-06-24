from django.http import HttpResponse
from django.template.loader import get_template
from xhtml2pdf import pisa
from rest_framework.decorators import api_view
from ..models import PasswordReset, User


from ..utils import is_admin_or_superadmin


@api_view(["GET"])
def admin_generate_passwordresetrequests_pdf_report(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return HttpResponse("Unauthorized", status=401)
    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return HttpResponse("User not found", status=404)
    if not is_admin_or_superadmin(user):
        return HttpResponse("Forbidden", status=403)

    password_resets_query = PasswordReset.objects.select_related("user").all()

    # Security: Standard Administrators cannot see password reset requests for Superadmins
    if user.user_type != "Superadmin":
        password_resets_query = password_resets_query.exclude(user__user_type="Superadmin")

    password_resets = password_resets_query.all()
    context = {
        "password_resets": [
            {
                "password_reset_id": r.password_reset_id,
                "user_id": r.user.user_id,
                "email": r.user.email,
                "status": r.status,
            }
            for r in password_resets
        ],
    }
    template = get_template("passwordresetrequests_admin_report_template.html")
    html = template.render(context)
    response = HttpResponse(content_type="application/pdf")
    pisa_status = pisa.CreatePDF(html, dest=response)
    if pisa_status.err:
        return HttpResponse("We had some errors <pre>" + html + "</pre>")
    return response
