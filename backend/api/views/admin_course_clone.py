# backend\api\views\admin_course_clone.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import Course, User
from ..utils import is_admin_or_superadmin


@api_view(["POST"])
def clone_course(request, course_id):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "Unauthorized"}, status=401)

    if not is_admin_or_superadmin(user):
        return Response({"detail": "Forbidden"}, status=403)

    # Get optional new instructor ID from request body
    new_instructor_id = request.data.get("new_instructor_id")

    result = Course.clone_course(
        course_id=course_id, new_instructor_id=new_instructor_id
    )
    if result.get("success"):
        return Response(result)
    else:
        return Response(result, status=404)
