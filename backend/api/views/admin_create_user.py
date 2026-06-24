# backend/api/views/admin_create_user.py

import re
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from ..models import User, RegistrationRequest
from ..utils import is_admin_or_superadmin
from ..utils.email_utils import send_registration_confirmation_email
from django.db import transaction
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
import random


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
def admin_create_user(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"detail": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        admin_user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    if not is_admin_or_superadmin(admin_user):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    data = request.data.copy() # Make a mutable copy

    # Check required fields (exclude user_id)
    required_fields = ["email", "user_type"]
    for field in required_fields:
        if field not in data or data[field] == "":
            return Response(
                {"detail": f"Missing or empty required field: {field}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    # Validate email format
    try:
        validate_email(data["email"])
    except ValidationError:
        return Response(
            {"detail": "Invalid email format."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Check if email is already taken
    if User.objects.filter(email__iexact=data["email"]).exists():
        return Response(
            {"detail": "Email is already taken."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    # Process names for user and default password generation
    first_name = data.get("first_name", "").strip().capitalize()
    last_name = data.get("last_name", "").strip().capitalize()

    # Sanitize names for password (remove spaces)
    pw_first = first_name.replace(" ", "")
    pw_last = last_name.replace(" ", "")

    if not pw_first: pw_first = "User"
    if not pw_last: pw_last = "Name"

    # Use provided password or fallback to generation if not provided (though frontend should provide it now)
    provided_password = data.get("password")

    if provided_password:
        generated_password = provided_password
    else:
        # Generate Password: FirstnameLastnameCode (e.g., JohnDoe1234)
        random_code = f"{random.randint(1000, 9999)}"
        generated_password = f"{pw_first}{pw_last}{random_code}"

    # Password strength validation
    if not is_strong_password(generated_password):
        if provided_password:
             return Response(
                {"detail": "Password does not meet security requirements (8+ chars, uppercase, lowercase, number)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        else:
            # Fallback for generated password if it somehow fails
            generated_password = f"EmcLmsUser{random.randint(1000, 9999)}" 

    data["password_hash"] = generated_password
    # Validate user_type and program values
    valid_user_types = [choice[0] for choice in User.USER_TYPES]

    if data["user_type"] not in valid_user_types:
        return Response(
            {"detail": "Invalid user_type value."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Security check: Only Superadmins can create other Superadmins or Administrators
    if data["user_type"] in ["Superadmin", "Administrator"] and admin_user.user_type != "Superadmin":
        return Response(
            {"detail": f"Only Superadmins can create {data['user_type']} accounts."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if data["user_type"] == "Student":
        program = data.get("program", "AB-Theology")  # default program if not provided
    else:
        program = ""  # blank for non-students


    try:
        # Create user inside an atomic transaction to avoid ID conflicts
        with transaction.atomic():
            new_user = User.objects.create(
                email=data["email"],
                first_name=first_name, # Use sanitized/capitalized version
                last_name=last_name,   # Use sanitized/capitalized version
                user_type=data["user_type"],
                program=program,
            )
            new_user.set_password(data["password_hash"])
            new_user.save()

            # Approve the registration request if it exists (delete it)
            RegistrationRequest.objects.filter(
                email__iexact=data["email"], status=RegistrationRequest.Status.PENDING
            ).delete()
        
        # Send Email (Outside transaction so email failure doesn't rollback user creation)
        # Or keeping it separate is fine. 
        send_registration_confirmation_email(
            user_email=new_user.email,
            user_first_name=new_user.first_name,
            password=data["password_hash"]
        )

    except ValueError as ve:
        return Response({"detail": str(ve)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        print(f"Error creating user: {e}")
        return Response(
            {"detail": "Error creating user."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    response_data = {
        "user_id": new_user.user_id,
        "email": new_user.email,
        "first_name": new_user.first_name,
        "last_name": new_user.last_name,
        "user_type": new_user.user_type,
        "program": new_user.program,
    }

    return Response(response_data, status=status.HTTP_201_CREATED)
