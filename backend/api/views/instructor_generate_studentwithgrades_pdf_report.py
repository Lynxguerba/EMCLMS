from django.http import HttpResponse
from django.template.loader import get_template
from xhtml2pdf import pisa
from rest_framework.decorators import api_view
from ..models import Course, Enrollment, Grade, User, Content
from collections import defaultdict

from ..utils.text_helpers import wrap_long_words_all_columns

# ================================================================
# OPTIMIZED VIEW: Instructor Students with Grades PDF Report
# ================================================================
@api_view(["GET"])
def instructor_generate_studentswithgrades_pdf_report(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return HttpResponse("Unauthorized", status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return HttpResponse("User not found", status=404)

    if user.user_type != "Instructor":
        return HttpResponse(
            "Forbidden: Only instructors can view their students' grades.", status=403
        )

    # Get the instructor's courses
    instructor_courses = Course.objects.filter(instructor=user)

    # Filter by course_ids if provided in the query parameters
    course_ids_str = request.query_params.get("course_ids")
    if course_ids_str:
        try:
            course_ids = [int(cid) for cid in course_ids_str.split(",")]
            instructor_courses = instructor_courses.filter(course_id__in=course_ids)
        except ValueError:
            pass

    # Filter by section_ids if provided in the query parameters
    section_ids_str = request.query_params.get("section_ids")
    section_ids = None
    if section_ids_str:
        try:
            section_ids = [int(sid) for sid in section_ids_str.split(",")]
        except ValueError:
            pass

    # 1. Fetch all relevant contents for these courses
    activity_contents = Content.objects.filter(
        section__course__in=instructor_courses, content_type="Activity"
    ).select_related("section", "section__course").order_by(
        "section__course_id", "section__order_in_course", "order_in_section"
    )

    if section_ids:
        activity_contents = activity_contents.filter(section_id__in=section_ids)

    # 2. Fetch all enrollments for these courses
    enrollments = Enrollment.objects.filter(
        course__in=instructor_courses, student__user_type="Student"
    ).select_related("student", "course")

    # 3. Fetch all grades for these contents
    grades = Grade.objects.filter(
        content__in=activity_contents
    ).select_related("user", "content")

    # --- Pre-organize data for O(1) lookups ---
    
    # Map contents by course_id
    course_to_contents = defaultdict(list)
    for content in activity_contents:
        course_to_contents[content.section.course_id].append(content)

    # Map enrollments by course_id
    course_to_enrollments = defaultdict(list)
    for enrollment in enrollments:
        course_to_enrollments[enrollment.course_id].append(enrollment)

    # Map grades by (content_id, user_id)
    content_user_to_grade = {}
    for grade in grades:
        content_user_to_grade[(grade.content_id, grade.user_id)] = grade

    # --- Build final data structure ---
    courses_data = []
    for course in instructor_courses:
        course_contents = course_to_contents.get(course.course_id, [])
        if not course_contents:
            continue

        contents_with_grades = []
        course_enrollments = course_to_enrollments.get(course.course_id, [])

        for content in course_contents:
            student_performances = []
            for enrollment in course_enrollments:
                student = enrollment.student
                grade = content_user_to_grade.get((content.content_id, student.user_id))
                
                score = "N/A"
                status = "Pending"
                
                if grade:
                    if grade.score is not None:
                        score = grade.score
                    
                    if grade.status == "Graded":
                        status = "Scored"
                        if grade.submitted_at and content.due_date and grade.submitted_at > content.due_date:
                            status = "Late/Scored"
                    else:
                        status = grade.status

                student_performances.append(
                    wrap_long_words_all_columns(
                        {
                            "user_id": student.user_id,
                            "student_name": f"{student.first_name} {student.last_name}",
                            "email": student.email,
                            "score": score,
                            "status": status,
                        },
                        fields_to_wrap={"email": 17},
                    )
                )

            contents_with_grades.append(
                {
                    "content_title": content.content_title,
                    "total_score": (
                        content.total_score
                        if content.total_score is not None
                        else "N/A"
                    ),
                    "student_performances": student_performances,
                }
            )

        courses_data.append(
            {
                "course_id": course.course_id,
                "course_title": course.course_title,
                "course_code": course.course_code,
                "contents": contents_with_grades,
            }
        )

    context = {
        "instructor": {
            "first_name": user.first_name,
            "last_name": user.last_name,
        },
        "courses_data": courses_data,
    }

    template = get_template("studentswithgrades_instructor_report_template.html")
    html = template.render(context)

    response = HttpResponse(content_type="application/pdf")
    pisa_status = pisa.CreatePDF(html, dest=response)
    if pisa_status.err:
        return HttpResponse("We had some errors <pre>" + html + "</pre>", status=500)
    return response
