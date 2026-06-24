from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import User
from ..utils import is_admin_or_superadmin

@api_view(['GET'])
def get_user_choices(request):
    """
    Provides the available choices for user types and programs,
    accessible only by administrators.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)

    if not is_admin_or_superadmin(user):
        return Response({"detail": "Forbidden"}, status=403)

    user_types = [choice[0] for choice in User.USER_TYPES]
    programs = [choice[0] for choice in User.PROGRAM_CHOICES]
    
    data = {
        'user_types': user_types,
        'programs': programs
    }
    
    return Response(data)
