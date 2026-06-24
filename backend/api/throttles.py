from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle
from django.conf import settings

class BaseRateThrottle(AnonRateThrottle):
    def get_rate(self):
        if getattr(settings, "IS_TESTING", False):
            return settings.REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {}).get(self.scope)
        return super().get_rate()

class BaseSessionRateThrottle(SimpleRateThrottle):
    def get_rate(self):
        if getattr(settings, "IS_TESTING", False):
            return settings.REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {}).get(self.scope)
        return super().get_rate()

    def get_cache_key(self, request, view):
        if request.user.is_authenticated:
            return None  # Only throttle unauthenticated requests.

        # Ensure a session is created for this anonymous user if not already present
        if not request.session or not request.session.session_key:
            request.session.create()

        return self.cache_format % {
            "scope": self.scope,
            "ident": request.session.session_key
        }

class LoginRateThrottle(BaseRateThrottle):
    scope = 'login'

class RegisterRateThrottle(BaseSessionRateThrottle):
    scope = 'register'

class PasswordResetRateThrottle(BaseSessionRateThrottle):
    scope = 'password_reset'

class SemanticSearchRateThrottle(BaseRateThrottle):
    scope = 'anon'

