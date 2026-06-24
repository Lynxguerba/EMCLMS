from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import BorrowRecord, User
from django.utils import timezone
from datetime import timedelta

@api_view(['GET'])
def librarian_get_weekly_activity(request):
    user_id = request.session.get('user_id')
    if not user_id:
        return Response({'error': 'Unauthorized'}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
        if user.user_type != "Librarian":
            return Response({"error": "Forbidden"}, status=403)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

    today = timezone.now().date()
    # Calculate start of week (Monday)
    start_of_week = today - timedelta(days=today.weekday())
    
    # Initialize dictionary to hold counts for each day (0=Mon, 6=Sun)
    weekly_data = {
        i: {"day": day, "borrowed": 0, "returned": 0}
        for i, day in enumerate(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])
    }

    # Fetch and process borrowed records for this week
    borrowed_records = BorrowRecord.objects.filter(
        borrow_date__date__gte=start_of_week,
        borrow_date__date__lte=start_of_week + timedelta(days=6)
    ).values('borrow_date__date')

    for record in borrowed_records:
        day_index = record['borrow_date__date'].weekday()
        weekly_data[day_index]["borrowed"] += 1

    # Fetch and process returned records for this week
    returned_records = BorrowRecord.objects.filter(
        return_date__date__gte=start_of_week,
        return_date__date__lte=start_of_week + timedelta(days=6),
        status='Returned'
    ).values('return_date__date')

    for record in returned_records:
        day_index = record['return_date__date'].weekday()
        weekly_data[day_index]["returned"] += 1

    # Convert to list sorted by day index
    response_data = [weekly_data[i] for i in range(7)]

    return Response(response_data)