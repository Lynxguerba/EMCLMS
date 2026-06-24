from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import Content, User
from django.utils import timezone
from datetime import timedelta

@api_view(["GET"])
def get_instructor_weekly_engagement(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "Unauthorized"}, status=401)

    if user.user_type != "Instructor":
        return Response({"detail": "Unauthorized"}, status=401)

    # Get last 7 days
    today = timezone.now().date()
    start_date = today - timedelta(days=6)

    # Query content created by instructor in the last 7 days
    school_year = request.query_params.get("school_year")
    content_filter = {
        "section__course__instructor": user,
        "created_at__date__gte": start_date
    }
    if school_year and school_year != "All":
        content_filter["section__course__school_year__school_year"] = school_year

    activities = Content.objects.filter(**content_filter)

    # Count per day
    daily_counts = {}
    for activity in activities:
        # Convert to local date if possible, here using server date
        date = activity.created_at.date()
        daily_counts[date] = daily_counts.get(date, 0) + 1

    # Prepare result with all 7 days (fill missing with 0)
    result = []
    for i in range(7):
        date = start_date + timedelta(days=i)
        count = daily_counts.get(date, 0)
        day_name = date.strftime("%a") # "Mon", "Tue", etc.
        result.append({"day": day_name, "activities": count})

    return Response(result)
