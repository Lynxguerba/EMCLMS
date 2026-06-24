from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from ..models import User, PasswordReset
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.db import transaction
from ..throttles import PasswordResetRateThrottle


@api_view(["POST"])
@throttle_classes([PasswordResetRateThrottle])
def password_reset_request(request):
    email = request.data.get("email")

    if not email:
        return Response({"detail": "Email is required."}, status=400)

    # Validate email format
    try:
        validate_email(email)
    except ValidationError:
        return Response({"detail": "Invalid email format."}, status=400)

    # Step 1: Try to find the user; if not found, return neutral
    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return Response(
            {"detail": "If the email exists, a password reset has been initiated."},
            status=200,
        )

    # Step 2: Handle PasswordReset logic
    with transaction.atomic():
        existing_reset = (
            PasswordReset.objects.filter(user=user).order_by("-updated_at").first()
        )

        if existing_reset:
            if existing_reset.status == PasswordReset.Status.PENDING:
                # Already pending → do nothing
                return Response(
                    {
                        "detail": "If the email exists, a password reset has been initiated."
                    },
                    status=200,
                )
            elif existing_reset.status == PasswordReset.Status.COMPLETED:
                # Completed → refresh it to pending
                existing_reset.status = PasswordReset.Status.PENDING
                existing_reset.save(update_fields=["status", "updated_at"])
                return Response(
                    {
                        "detail": "If the email exists, a password reset has been initiated."
                    },
                    status=200,
                )

        # No existing reset → create a new record
        PasswordReset.objects.create(user=user, status=PasswordReset.Status.PENDING)

    return Response(
        {"detail": "If the email exists, a password reset has been initiated."},
        status=200,
    )
