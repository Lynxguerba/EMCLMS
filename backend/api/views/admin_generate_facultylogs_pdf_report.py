from django.http import HttpResponse
from django.template.loader import get_template
from xhtml2pdf import pisa
from rest_framework.decorators import api_view
from ..models import User, InstructorLog


from ..utils import is_admin_or_superadmin


@api_view(["GET"])
def admin_generate_facultylogs_pdf_report(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return HttpResponse("Unauthorized", status=401)
    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return HttpResponse("User not found", status=404)
    if not is_admin_or_superadmin(user):
        return HttpResponse("Forbidden", status=403)

    faculty_logs = InstructorLog.objects.select_related("instructor").all()

    context = {
        "faculty_logs": [
            {
                "log_id": log.log_id,
                "faculty_id": log.instructor.user_id,
                "faculty_name": f"{log.instructor.first_name} {log.instructor.last_name}",
                "message": log.message,
                "timestamp": log.timestamp,
            }
            for log in faculty_logs
        ]
    }

    template = get_template("facultylogs_admin_report_template.html")
    html = template.render(context)
    response = HttpResponse(content_type="application/pdf")
    pisa_status = pisa.CreatePDF(html, dest=response)
    if pisa_status.err:
        return HttpResponse("We had some errors <pre>" + html + "</pre>")
    return response
