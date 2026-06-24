from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from api.models import User

class LoginLogoutViewTest(APITestCase):
    def setUp(self):
        """Set up a test user for API authentication tests."""
        self.user_id = 2025000
        self.password = "strongpassword123"
        self.user = User(
            user_id=self.user_id,
            email="api.test@gmail.com",
            user_type="Student",
            first_name="API",
            last_name="Tester",
        )
        self.user.set_password(self.password)
        self.user.save()

    def test_login_success(self):
        """
        Tests successful user login with valid credentials.
        """
        url = reverse("login")
        data = {"email": "api.test@gmail.com", "password": self.password}
        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check if user_id is in session. Django REST Framework's test client
        # might not automatically propagate session changes if not explicitly used.
        # So, we rely on the response content.
        self.assertEqual(response.data["user_id"], self.user_id)

    def test_login_invalid_password(self):
        """
        Tests login failure with an invalid password.
        """
        url = reverse("login")
        data = {"email": "api.test@gmail.com", "password": "wrongpassword"}
        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("error", response.data)

    def test_login_nonexistent_user(self):
        """
        Tests login failure with a user_id that does not exist.
        """
        url = reverse("login")
        data = {"email": "nonexistent@gmail.com", "password": self.password}
        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("error", response.data)

    def test_login_missing_credentials(self):
        """
        Tests login failure when credentials are not provided.
        """
        url = reverse("login")
        # Missing password
        response = self.client.post(url, {"email": "api.test@gmail.com"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

        # Missing email
        response = self.client.post(url, {"password": self.password}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_session_user_authenticated(self):
        """
        Tests that the session_user view returns user data for an authenticated user.
        """
        # Log in the client
        login_url = reverse("login")
        self.client.post(login_url, {"email": "api.test@gmail.com", "password": self.password}, format="json")

        # Now, access the session user endpoint
        session_url = reverse("session_user")
        response = self.client.get(session_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user_id"], self.user_id)
        self.assertEqual(response.data["first_name"], self.user.first_name)

    def test_session_user_unauthenticated(self):
        """
        Tests that the session_user view returns an error for an unauthenticated user.
        """
        url = reverse("session_user")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("error", response.data)
        self.assertFalse(response.data["authenticated"])

    def test_logout(self):
        """
        Tests that the logout view successfully clears the session.
        """
        # Log in first
        login_url = reverse("login")
        self.client.post(login_url, {"email": "api.test@gmail.com", "password": self.password}, format="json")

        # Now, log out
        logout_url = reverse("logout")
        response = self.client.post(logout_url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)
        # After logout, accessing session user should fail
        session_url = reverse("session_user")
        response_after_logout = self.client.get(session_url)
        self.assertEqual(response_after_logout.status_code, status.HTTP_200_OK)
        self.assertFalse(response_after_logout.data["authenticated"])
