# backend/api/views/admin_bulk_create_user.py

import re
import random
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from ..models import User, RegistrationRequest
from ..utils.email_utils import send_registration_confirmation_email
from ..utils import is_admin_or_superadmin

def is_strong_password(password: str) -> bool:
    """
    Check if the password meets recommended security rules:
    - At least 8 characters
    - Contains uppercase, lowercase, and number
    """
    if len(password) < 8:
        return False
    if not re.search(r"[A-Z]", password):
        return False
    if not re.search(r"[a-z]", password):
        return False
    if not re.search(r"\d", password):
        return False
    return True

@api_view(["POST"])
def admin_bulk_create_user(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        admin_user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    if not is_admin_or_superadmin(admin_user):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    users_data = request.data.get("users", [])
    if not isinstance(users_data, list) or not users_data:
        return Response({"detail": "Invalid or empty users list."}, status=status.HTTP_400_BAD_REQUEST)

    created_users = []
    errors = []

    valid_user_types = [choice[0] for choice in User.USER_TYPES]

    for index, data in enumerate(users_data):
        email = data.get("email", "").strip()
        first_name = data.get("first_name", "").strip().capitalize()
        last_name = data.get("last_name", "").strip().capitalize()
        user_type = data.get("user_type", "").strip()
        program = data.get("program", "").strip()
        provided_password = data.get("password")

        # Validation
        if not email or not user_type:
            errors.append({"index": index, "email": email, "detail": "Email and User Type are required."})
            continue

        try:
            validate_email(email)
        except ValidationError:
            errors.append({"index": index, "email": email, "detail": "Invalid email format."})
            continue

        if User.objects.filter(email__iexact=email).exists():
            errors.append({"index": index, "email": email, "detail": "Email is already taken."})
            continue

        if user_type not in valid_user_types:
            errors.append({"index": index, "email": email, "detail": f"Invalid user type: {user_type}."})
            continue

        # Security check: Only Superadmins can create other Superadmins or Administrators
        if user_type in ["Superadmin", "Administrator"] and admin_user.user_type != "Superadmin":
            errors.append({"index": index, "email": email, "detail": f"Only Superadmins can create {user_type} accounts."})
            continue

        # Password Generation/Validation
        if provided_password:
            if not is_strong_password(provided_password):
                 errors.append({"index": index, "email": email, "detail": "Password does not meet security requirements."})
                 continue
            password_to_set = provided_password
        else:
            # Generate password if not provided
            pw_first = first_name.replace(" ", "") if first_name else "User"
            pw_last = last_name.replace(" ", "") if last_name else "Name"
            random_code = f"{random.randint(1000, 9999)}"
            password_to_set = f"{pw_first}{pw_last}{random_code}"
            
            # Ensure generated password is strong
            if not is_strong_password(password_to_set):
                password_to_set = f"EmcLmsUser{random.randint(1000, 9999)}"

        if user_type == "Student":
            if not program:
                program = "AB-Theology" # Default
        else:
            program = ""

        try:
            with transaction.atomic():
                new_user = User.objects.create(
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    user_type=user_type,
                    program=program,
                )
                new_user.set_password(password_to_set)
                new_user.save()

                RegistrationRequest.objects.filter(
                    email__iexact=email, status=RegistrationRequest.Status.PENDING
                ).delete()

            # Send Email
            try:
                send_registration_confirmation_email(
                    user_email=new_user.email,
                    user_first_name=new_user.first_name,
                    password=password_to_set
                )
            except Exception as e:
                print(f"Email error for {email}: {e}")

            created_users.append({
                "email": email,
                "user_id": new_user.user_id,
                "status": "Created"
            })

        except Exception as e:
            errors.append({"index": index, "email": email, "detail": f"Database error: {str(e)}"})

    return Response({
        "created_count": len(created_users),
        "error_count": len(errors),
        "created_users": created_users,
        "errors": errors
    }, status=status.HTTP_200_OK)
