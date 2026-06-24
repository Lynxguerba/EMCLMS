from django.http import HttpResponse
from django.template.loader import get_template
from xhtml2pdf import pisa
from rest_framework.decorators import api_view
from ..models import Course, Enrollment, User


@api_view(["GET"])
def instructor_generate_courseswithstudent_pdf_report(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return HttpResponse("Unauthorized", status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return HttpResponse("User not found", status=404)

    if user.user_type != "Instructor":
        return HttpResponse(
            "Forbidden: Only instructors can view their courses.", status=403
        )

    # Optimization: Use prefetch_related or just fetch all enrollments at once
    instructor_courses = Course.objects.filter(instructor=user)
    
    # Fetch all enrollments for all instructor's courses in one go
    enrollments = Enrollment.objects.filter(
        course__in=instructor_courses, 
        student__user_type="Student"
    ).select_related("student", "course")

    # Group enrollments by course
    course_to_students = {}
    for enrollment in enrollments:
        course_id = enrollment.course_id
        if course_id not in course_to_students:
            course_to_students[course_id] = []
        
        course_to_students[course_id].append({
            "first_name": enrollment.student.first_name,
            "last_name": enrollment.student.last_name,
            "email": enrollment.student.email,
            "enrollment_date": enrollment.enrollment_date.strftime("%Y-%m-%d"),
        })

    courses_data = []
    for course in instructor_courses:
        courses_data.append(
            {
                "course_code": course.course_code,
                "course_title": course.course_title,
                "description": course.description,
                "students": course_to_students.get(course.course_id, []),
            }
        )

    context = {
        "instructor": {
            "first_name": user.first_name,
            "last_name": user.last_name,
        },
        "courses": courses_data,
    }

    template = get_template("courseswithstudent_instructor_report_template.html")
    html = template.render(context)

    response = HttpResponse(content_type="application/pdf")
    pisa_status = pisa.CreatePDF(html, dest=response)
    if pisa_status.err:
        return HttpResponse("We had some errors <pre>" + html + "</pre>", status=500)
    return response
