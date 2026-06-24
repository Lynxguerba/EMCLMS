from django.http import HttpResponse
from django.template.loader import get_template
from xhtml2pdf import pisa
from rest_framework.decorators import api_view
from ..models import Course, User
from ..utils import is_admin_or_superadmin


@api_view(["GET"])
def admin_generate_allcourses_pdf_report(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return HttpResponse("Unauthorized", status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return HttpResponse("User not found", status=404)

    if not is_admin_or_superadmin(user):
        return HttpResponse("Forbidden", status=403)

    courses = Course.objects.select_related("instructor").all()

    context = {
        "courses": [
            {
                "course_id": c.course_id,
                "course_code": c.course_code,
                "course_title": c.course_title,
                "description": c.description,
                "instructor_name": (
                    f"{c.instructor.first_name} {c.instructor.last_name}"
                    if c.instructor
                    else ""
                ),
            }
            for c in courses
        ]
    }

    template = get_template("allcourses_admin_report_template.html")
    html = template.render(context)

    response = HttpResponse(content_type="application/pdf")
    pisa_status = pisa.CreatePDF(html, dest=response)

    if pisa_status.err:
        return HttpResponse("We had some errors <pre>" + html + "</pre>")

    return response
