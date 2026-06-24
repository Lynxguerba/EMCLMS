from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import BorrowRecord, User
from django.utils import timezone
from django.db.models import Q

@api_view(['GET'])
def librarian_get_recent_activity(request):
    user_id = request.session.get('user_id')
    if not user_id:
        return Response({'error': 'Unauthorized'}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
        if user.user_type != "Librarian":
            return Response({"error": "Forbidden"}, status=403)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

    activities = []
    now = timezone.now()

    # 1. Get recent BORROWS
    recent_borrows = BorrowRecord.objects.select_related('user', 'book').order_by('-borrow_date')[:15]
    for record in recent_borrows:
        user_fullname = f"{record.user.first_name} {record.user.last_name}".strip() or "Unknown User"
        activities.append({
            "id": f"borrowed-{record.borrow_id}",
            "user": user_fullname,
            "book": record.book.title,
            "action": "borrowed",
            "date": record.borrow_date.isoformat(),
            "timestamp": record.borrow_date
        })

    # 2. Get recent RETURNS
    recent_returns = BorrowRecord.objects.filter(
        status=BorrowRecord.Status.RETURNED,
        return_date__isnull=False
    ).select_related('user', 'book').order_by('-return_date')[:15]
    
    for record in recent_returns:
        user_fullname = f"{record.user.first_name} {record.user.last_name}".strip() or "Unknown User"
        activities.append({
            "id": f"returned-{record.borrow_id}",
            "user": user_fullname,
            "book": record.book.title,
            "action": "returned",
            "date": record.return_date.isoformat(),
            "timestamp": record.return_date
        })

    # 3. Get currently OVERDUE items
    # These are either explicitly marked as OVERDUE or are BORROWED but past due_date
    overdue_records = BorrowRecord.objects.filter(
        Q(status=BorrowRecord.Status.OVERDUE) | 
        (Q(status=BorrowRecord.Status.BORROWED) & Q(due_date__lt=now))
    ).select_related('user', 'book').order_by('-due_date')[:15]

    for record in overdue_records:
        user_fullname = f"{record.user.first_name} {record.user.last_name}".strip() or "Unknown User"
        activities.append({
            "id": f"overdue-{record.borrow_id}",
            "user": user_fullname,
            "book": record.book.title,
            "action": "overdue",
            "date": record.due_date.isoformat(),
            "timestamp": record.due_date
        })

    # Sort all events by timestamp descending
    activities.sort(key=lambda x: x['timestamp'], reverse=True)

    # De-duplicate: If the same record has multiple events (e.g. borrowed and returned),
    # they are already unique by ID, so sorting by timestamp is enough.
    # However, we only want to return the top N items.
    
    limit = 10
    final_activities = []
    seen_ids = set()
    
    for act in activities:
        if act['id'] not in seen_ids:
            seen_ids.add(act['id'])
            # Remove timestamp before sending to frontend
            temp_act = act.copy()
            del temp_act['timestamp']
            final_activities.append(temp_act)
        
        if len(final_activities) >= limit:
            break

    return Response(final_activities)