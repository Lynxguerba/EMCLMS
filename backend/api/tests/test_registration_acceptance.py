from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from api.models import User, RegistrationRequest

class AdminAcceptRegistrationTest(APITestCase):
    def setUp(self):
        """Set up admin user and a pending registration request."""
        self.admin_password = "adminpassword123"
        self.admin_user = User.objects.create(
            user_id=2025999,
            email="admin_reg_tester@test.com",
            user_type="Administrator",
            first_name="Admin",
            last_name="Tester",
        )
        self.admin_user.set_password(self.admin_password)
        self.admin_user.save()

        self.login_url = reverse("login")
        self.create_user_url = reverse("admin_create_user")

        # Create a pending registration request
        self.request_email = "pending_user@gmail.com"
        self.registration_request = RegistrationRequest.objects.create(
            email=self.request_email,
            first_name="Pending",
            last_name="User",
            status=RegistrationRequest.Status.PENDING
        )

    def _login_user(self, email, password):
        """Helper to log in a user."""
        self.client.post(self.login_url, {"email": email, "password": password})

    def test_admin_accept_registration_deletes_request(self):
        """
        Tests that when an admin creates a user (accepts registration), 
        the corresponding RegistrationRequest is deleted.
        """
        self._login_user(self.admin_user.email, self.admin_password)

        # Verify request exists before
        self.assertTrue(RegistrationRequest.objects.filter(email=self.request_email).exists())

        new_user_data = {
            "email": self.request_email,
            "password_hash": "StrongPass123",
            "user_type": "Student",
            "first_name": "Pending",
            "last_name": "User",
        }
        
        response = self.client.post(self.create_user_url, new_user_data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify user created
        self.assertTrue(User.objects.filter(email=self.request_email).exists())
        
        # Verify RegistrationRequest is DELETED (not just approved)
        self.assertFalse(RegistrationRequest.objects.filter(email=self.request_email).exists())

    def test_admin_create_user_without_request_works(self):
        """
        Tests that creating a user who doesn't have a registration request still works
        and doesn't cause an error.
        """
        self._login_user(self.admin_user.email, self.admin_password)
        
        email_no_request = "norequest@gmail.com"
        self.assertFalse(RegistrationRequest.objects.filter(email=email_no_request).exists())

        new_user_data = {
            "email": email_no_request,
            "password_hash": "StrongPass123",
            "user_type": "Student",
            "first_name": "No",
            "last_name": "Request",
        }
        
        response = self.client.post(self.create_user_url, new_user_data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email=email_no_request).exists())
