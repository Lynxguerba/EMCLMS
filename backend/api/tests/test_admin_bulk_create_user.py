from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from api.models import User, RegistrationRequest

class AdminBulkCreateUserTest(APITestCase):
    def setUp(self):
        """Set up admin and non-admin users for admin_bulk_create_user tests."""
        self.admin_password = "adminpassword123"
        self.admin_user = User(
            user_id=2025101,
            email="admin_bulk@test.com",
            user_type="Administrator",
            first_name="Admin",
            last_name="Bulk",
        )
        self.admin_user.set_password(self.admin_password)
        self.admin_user.save()

        self.student_password = "studentpassword123"
        self.student_user = User(
            user_id=2025102,
            email="student_bulk@test.com",
            user_type="Student",
            first_name="Student",
            last_name="Bulk",
        )
        self.student_user.set_password(self.student_password)
        self.student_user.save()

        self.url = reverse("admin_bulk_create_user")
        self.login_url = reverse("login")

    def _login_user(self, email, password):
        """Helper to log in a user."""
        self.client.post(self.login_url, {"email": email, "password": password})

    def test_bulk_create_user_success(self):
        """Tests successful bulk creation of multiple users."""
        self._login_user(self.admin_user.email, self.admin_password)

        data = {
            "users": [
                {
                    "email": "user1@test.com",
                    "first_name": "User",
                    "last_name": "One",
                    "user_type": "Instructor"
                },
                {
                    "email": "user2@test.com",
                    "first_name": "User",
                    "last_name": "Two",
                    "user_type": "Student",
                    "program": "AB-Theology",
                    "password": "Password123"
                }
            ]
        }
        response = self.client.post(self.url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["created_count"], 2)
        self.assertEqual(response.data["error_count"], 0)
        self.assertTrue(User.objects.filter(email="user1@test.com").exists())
        self.assertTrue(User.objects.filter(email="user2@test.com").exists())

    def test_bulk_create_user_partial_success(self):
        """Tests bulk creation with some invalid entries."""
        self._login_user(self.admin_user.email, self.admin_password)

        # Pre-create a user to cause a duplicate email error
        User.objects.create(email="existing@test.com", user_type="Student")

        data = {
            "users": [
                {
                    "email": "valid@test.com",
                    "first_name": "Valid",
                    "last_name": "User",
                    "user_type": "Librarian"
                },
                {
                    "email": "existing@test.com", # Duplicate
                    "first_name": "Existing",
                    "last_name": "User",
                    "user_type": "Student"
                },
                {
                    "email": "invalid-email", # Invalid format
                    "first_name": "Invalid",
                    "last_name": "Email",
                    "user_type": "Student"
                },
                {
                    "email": "wrongtype@test.com",
                    "user_type": "InvalidType" # Invalid user type
                }
            ]
        }
        response = self.client.post(self.url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["created_count"], 1)
        self.assertEqual(response.data["error_count"], 3)
        self.assertTrue(User.objects.filter(email="valid@test.com").exists())
        
        # Check specific errors
        errors = response.data["errors"]
        self.assertTrue(any("already taken" in e["detail"] for e in errors))
        self.assertTrue(any("Invalid email format" in e["detail"] for e in errors))
        self.assertTrue(any("Invalid user type" in e["detail"] for e in errors))

    def test_bulk_create_user_unauthorized(self):
        """Tests that non-admins cannot use the bulk create endpoint."""
        self._login_user(self.student_user.email, self.student_password)

        data = {"users": [{"email": "hacker@test.com", "user_type": "Administrator"}]}
        response = self.client.post(self.url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(User.objects.filter(email="hacker@test.com").exists())

    def test_bulk_create_user_unauthenticated(self):
        """Tests that unauthenticated users cannot use the bulk create endpoint."""
        data = {"users": [{"email": "unauth@test.com", "user_type": "Student"}]}
        response = self.client.post(self.url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(User.objects.filter(email="unauth@test.com").exists())

    def test_bulk_create_user_registration_request_cleanup(self):
        """Tests that pending registration requests are deleted upon bulk user creation."""
        self._login_user(self.admin_user.email, self.admin_password)

        email = "requested@test.com"
        RegistrationRequest.objects.create(
            email=email,
            first_name="Req",
            last_name="User"
        )

        data = {
            "users": [
                {
                    "email": email,
                    "first_name": "Req",
                    "last_name": "User",
                    "user_type": "Student"
                }
            ]
        }
        response = self.client.post(self.url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(User.objects.filter(email=email).exists())
        # The registration request should be gone
        self.assertFalse(RegistrationRequest.objects.filter(email=email).exists())
