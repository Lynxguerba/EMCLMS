from django.http import HttpResponse
from django.template.loader import get_template
from xhtml2pdf import pisa
from rest_framework.decorators import api_view
from ..models import Course, Enrollment, PasswordReset, User

from ..utils import is_admin_or_superadmin


@api_view(["GET"])
def admin_generate_pdf_report(request):
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
    password_resets_query = PasswordReset.objects.select_related("user").all()

    # Security: Standard Administrators cannot see Superadmin accounts or their reset requests
    if user.user_type != "Superadmin":
        users_query = users_query.exclude(user_type="Superadmin")
        password_resets_query = password_resets_query.exclude(user__user_type="Superadmin")

    users = users_query.values("user_id", "first_name", "last_name", "email", "user_type")
    courses = Course.objects.select_related("instructor").all()
    students = User.objects.filter(user_type="Student").values("user_id", "first_name", "last_name", "email")
    enrollments = Enrollment.objects.select_related("student", "course").all()
    password_resets = password_resets_query.all()

    context = {
        "users": list(users),
        "courses": [
            {
                "course_id": c.course_id,
                "course_code": c.course_code,
                "course_title": c.course_title,
                "description": c.description,
                "instructor_name": f"{c.instructor.first_name} {c.instructor.last_name}" if c.instructor else "",
            } for c in courses
        ],
        "students": list(students),
        "enrollments": [
            {
                "enrollment_id": e.enrollment_id,
                "user_id": e.student.user_id,
                "user_name": f"{e.student.first_name} {e.student.last_name}",
                "course_id": e.course.course_id,
                "course_title": e.course.course_title,
                "status": e.status,
                "enrollment_date": e.enrollment_date,
            } for e in enrollments
        ],
        "password_resets": [
            {
                "password_reset_id": r.password_reset_id,
                "user_id": r.user.user_id,
                "email": r.user.email,
                "status": r.status,
            } for r in password_resets
        ],
        "student_logs": [...],  # You can paste your full list here
        "faculty_logs": [...],
        "books_data": [...],
    }

    template = get_template("admin_report_template.html")
    html = template.render(context)
    response = HttpResponse(content_type="application/pdf")
    pisa_status = pisa.CreatePDF(html, dest=response)
    if pisa_status.err:
        return HttpResponse("We had some errors <pre>" + html + "</pre>")
    return response
