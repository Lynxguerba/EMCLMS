from django.http import HttpResponse
from django.template.loader import get_template
from xhtml2pdf import pisa
from rest_framework.decorators import api_view
from ..models import Enrollment, User


from ..utils import is_admin_or_superadmin


@api_view(["GET"])
def admin_generate_allenrollments_pdf_report(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return HttpResponse("Unauthorized", status=401)
    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return HttpResponse("User not found", status=404)
    if not is_admin_or_superadmin(user):
        return HttpResponse("Forbidden", status=403)
    enrollments = Enrollment.objects.select_related("student", "course").all()
    context = {
        "enrollments": [
            {
                "enrollment_id": e.enrollment_id,
                "user_id": e.student.user_id,
                "user_name": f"{e.student.first_name} {e.student.last_name}",
                "course_id": e.course.course_id,
                "course_title": e.course.course_title,
                "enrollment_date": e.enrollment_date,
            }
            for e in enrollments
        ],
    }
    template = get_template("allenrollments_admin_report_template.html")
    html = template.render(context)
    response = HttpResponse(content_type="application/pdf")
    pisa_status = pisa.CreatePDF(html, dest=response)
    if pisa_status.err:
        return HttpResponse("We had some errors <pre>" + html + "</pre>")
    return response
