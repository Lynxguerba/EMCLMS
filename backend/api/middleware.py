from django.utils import timezone
from datetime import timedelta
from django.http import JsonResponse
from .models import User, StudentLog, InstructorLog

class ActiveUserMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # 1. Check if user is logged in via session
        user_id = request.session.get("user_id")
        
        if user_id:
            try:
                # 2. Fetch necessary fields
                user = User.objects.only('last_online', 'user_type').get(user_id=user_id)
                now = timezone.now()
                
                # 3. Check for inactivity > 30 minutes
                if user.last_online and (now - user.last_online) > timedelta(minutes=30):
                    # Log the event
                    msg = "Automatically logged out due to inactivity."
                    try:
                        if user.user_type == "Student":
                            StudentLog.objects.create(student=user, message=msg)
                        elif user.user_type == "Instructor":
                            InstructorLog.objects.create(instructor=user, message=msg)
                        elif user.user_type == "Superadmin":
                            # Note: Superadmin inactivity is handled by session flush below.
                            # Logging can be added once a dedicated log or AuditLog model is available.
                            pass
                    except Exception:
                        # Log failure shouldn't crash logout or request
                        pass
                    
                    # Force logout
                    request.session.flush()
                    return JsonResponse({"error": "Session expired due to inactivity"}, status=401)

                # 4. Update only if it's been more than 5 minutes (or never updated)
                if not user.last_online or (now - user.last_online) > timedelta(minutes=5):
                    user.last_online = now
                    user.save(update_fields=['last_online'])
            except (User.DoesNotExist, Exception):
                # Fail silently for any database or logic errors in middleware
                pass

        # 5. Continue with the rest of the application
        response = self.get_response(request)
        return response
