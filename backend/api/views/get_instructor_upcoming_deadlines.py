from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Q
from ..models import Content, Course, Grade, Enrollment, Section, User

@api_view(['GET'])
def get_instructor_upcoming_deadlines(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({'error': 'Unauthorized'}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'Unauthorized'}, status=401)

    if user.user_type != 'Instructor':
        return Response({'error': 'Unauthorized'}, status=403)

    now = timezone.now()
    
    # Fetch upcoming content (assignments/activities) for courses taught by this instructor
    # We filter by:
    # 1. Content belonging to sections of courses taught by the user
    # 2. Content having a due_date in the future
    # We annotate with total students and submission counts to avoid N+1 queries.
    school_year = request.query_params.get("school_year")
    content_filter = {
        "section__course__instructor": user,
        "due_date__gt": now
    }
    if school_year and school_year != "All":
        content_filter["section__course__school_year__school_year"] = school_year

    upcoming_contents = Content.objects.filter(
        **content_filter
    ).select_related('section__course').annotate(
        total_students=Count('section__course__enrollment', distinct=True),
        submissions_count=Count('grade', filter=Q(grade__status__in=['Submitted', 'Graded', 'Late']), distinct=True)
    ).order_by('due_date')[:10]  # Limit to 10 upcoming

    data = [
        {
            'content_id': content.content_id,
            'content_title': content.content_title,
            'course_code': content.section.course.course_code,
            'due_date': content.due_date,
            'submissions_count': content.submissions_count,
            'total_students': content.total_students
        }
        for content in upcoming_contents
    ]

    return Response(data)
