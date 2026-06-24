# api/views/auth_views.py

import time
from django.contrib.auth.hashers import check_password
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from rest_framework import status
from ..models import User, FailedLoginAttempt
from django.utils import timezone


@api_view(["POST"])
def login(request):
    try:
        email = request.data.get("email")
        password = request.data.get("password")

        if not isinstance(email, str) or not isinstance(password, str) or not email.strip() or not password.strip():
            return Response(
                {"error": "Email and password required and must be valid strings"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email_normalized = email.strip().lower()

        # Get or create the failed login record
        failed_login, _ = FailedLoginAttempt.objects.get_or_create(email=email_normalized)

        # Reset failure count if the last failure was more than 15 minutes ago
        if failed_login.failures > 0 and timezone.now() - failed_login.last_attempt > timezone.timedelta(minutes=15):
            failed_login.failures = 0
            failed_login.save(update_fields=["failures", "last_attempt"])

        # Apply progressive delay if they have failed 3 or more times
        if failed_login.failures >= 3:
            # 3 failures -> 2s, 4 failures -> 4s, 5 failures -> 8s, 6+ failures -> 16s (max)
            delay = min(16, 2 ** (failed_login.failures - 3))
            time.sleep(delay)

        try:
            user = User.objects.get(email__iexact=email_normalized)
        except User.DoesNotExist:
            failed_login.failures += 1
            failed_login.save(update_fields=["failures", "last_attempt"])
            return Response(
                {"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED
            )

        if not check_password(password, user.password_hash):
            failed_login.failures += 1
            failed_login.save(update_fields=["failures", "last_attempt"])
            return Response(
                {"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED
            )


        # Reset failed attempts on success
        if failed_login.failures > 0:
            failed_login.failures = 0
            failed_login.save(update_fields=["failures", "last_attempt"])

        request.session["user_id"] = user.user_id


        user.last_online = timezone.now()
        user.save(update_fields=["last_online"])

        return Response(
            {
                "user_id": user.user_id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "user_type": user.user_type,
                "profile_picture": (
                    user.profile_picture.url if user.profile_picture else None
                ),
            },
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        import traceback

        print("LOGIN ERROR:", str(e))
        traceback.print_exc()
        return Response(
            {"error": "Internal Server Error", "detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
def session_user(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return Response({"error": "Unauthorized", "authenticated": False}, status=200)

    try:
        user = User.objects.get(user_id=user_id)
        return Response(
            {
                "user_id": user.user_id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "user_type": user.user_type,
                "authenticated": True,
                "is_impersonating": "original_user_id" in request.session,
                "profile_picture": (
                    user.profile_picture.url if user.profile_picture else None
                ),
            }
        )
    except User.DoesNotExist:
        return Response({"error": "User not found", "authenticated": False}, status=200)
    except Exception as e:
        # If the database is missing tables or inconsistent, don't crash
        return Response({"error": "Database inconsistency detected", "authenticated": False, "detail": str(e)}, status=200)


@api_view(["POST"])
def logout(request):
    user_id = request.session.get("user_id")

    if user_id:
        try:
            user = User.objects.get(user_id=user_id)
            user.last_online = timezone.now()
            user.save(update_fields=["last_online"])
        except User.DoesNotExist:
            pass

    request.session.flush()
    return Response({"message": "Logged out successfully"})


@api_view(["POST"])
def impersonate_user(request):
    """
    Allows a Superadmin to log in as another user.
    """
    current_user_id = request.session.get("user_id")
    if not current_user_id:
        return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        current_user = User.objects.get(user_id=current_user_id)
        if current_user.user_type != "Superadmin":
            # Check if we are already impersonating and trying to hop to another user
            original_user_id = request.session.get("original_user_id")
            if not original_user_id:
                return Response(
                    {"error": "Permission denied. Only Superadmins can impersonate users."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            
            # If we are already impersonating, verify the original user was a Superadmin
            original_user = User.objects.get(user_id=original_user_id)
            if original_user.user_type != "Superadmin":
                return Response(
                    {"error": "Permission denied."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        target_user_id = request.data.get("user_id")
        if not target_user_id:
            return Response(
                {"error": "Target user_id is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            target_user = User.objects.get(user_id=target_user_id)
        except User.DoesNotExist:
            return Response(
                {"error": "Target user not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Store the original user ID if not already impersonating
        if "original_user_id" not in request.session:
            request.session["original_user_id"] = current_user_id

        # Update the session with the target user's ID
        request.session["user_id"] = target_user.user_id
        
        # Update last_online to now to prevent immediate logout by ActiveUserMiddleware
        target_user.last_online = timezone.now()
        target_user.save(update_fields=["last_online"])

        return Response(
            {
                "message": f"Now impersonating {target_user.first_name} {target_user.last_name}",
                "user": {
                    "user_id": target_user.user_id,
                    "first_name": target_user.first_name,
                    "last_name": target_user.last_name,
                    "email": target_user.email,
                    "user_type": target_user.user_type,
                    "profile_picture": (
                        target_user.profile_picture.url if target_user.profile_picture else None
                    ),
                },
                "is_impersonating": True
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        return Response(
            {"error": "Internal Server Error", "detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
def stop_impersonating(request):
    """
    Allows a user to stop impersonating and return to their original Superadmin account.
    """
    original_user_id = request.session.get("original_user_id")
    if not original_user_id:
        return Response(
            {"error": "Not currently impersonating any user"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        original_user = User.objects.get(user_id=original_user_id)
        
        # Switch back to the original user
        request.session["user_id"] = original_user.user_id
        del request.session["original_user_id"]

        return Response(
            {
                "message": "Stopped impersonation",
                "user": {
                    "user_id": original_user.user_id,
                    "first_name": original_user.first_name,
                    "last_name": original_user.last_name,
                    "email": original_user.email,
                    "user_type": original_user.user_type,
                    "profile_picture": (
                        original_user.profile_picture.url if original_user.profile_picture else None
                    ),
                },
                "is_impersonating": False
            },
            status=status.HTTP_200_OK,
        )
    except User.DoesNotExist:
        # If the original user was deleted, we just flush the session
        request.session.flush()
        return Response(
            {"error": "Original user not found. Logged out."},
            status=status.HTTP_404_NOT_FOUND,
        )
    except Exception as e:
        return Response(
            {"error": "Internal Server Error", "detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

