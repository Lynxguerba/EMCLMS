from django.http import HttpResponse
from django.template.loader import get_template
from xhtml2pdf import pisa
from rest_framework.decorators import api_view
from rest_framework import status
from ..models import Grade, User

@api_view(["GET"])
def student_generate_pdf_report(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return HttpResponse("Authentication credentials were not provided.", status=status.HTTP_401_UNAUTHORIZED)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return HttpResponse("User not found.", status=status.HTTP_404_NOT_FOUND)

    if user.user_type != "Student":
        return HttpResponse("You do not have permission to perform this action.", status=status.HTTP_403_FORBIDDEN)

    grades = Grade.objects.filter(user=user).select_related(
        'content', 'content__section', 'content__section__course'
    ).order_by(
        'content__section__course__course_title',
        'content__section__section_title',
        'content__content_title'
    )

    context = {
        'user': user,
        'grades': grades,
    }

    template = get_template('student_report_template.html')
    html = template.render(context)

    response = HttpResponse(content_type="application/pdf")
    pisa_status = pisa.CreatePDF(html, dest=response)
    if pisa_status.err:
        return HttpResponse("We had some errors generating the PDF.", status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return response
