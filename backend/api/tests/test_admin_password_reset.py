from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from api.models import User, PasswordReset


class AdminPasswordResetTest(APITestCase):
    def setUp(self):
        # Create a Superadmin
        self.superadmin_password = "superpassword123"
        self.superadmin = User.objects.create(
            user_id=2026001,
            email="superadmin@test.com",
            user_type="Superadmin",
            first_name="Super",
            last_name="Admin",
        )
        self.superadmin.set_password(self.superadmin_password)
        self.superadmin.save()

        # Create a standard Administrator
        self.admin_password = "adminpassword123"
        self.admin_user = User.objects.create(
            user_id=2026002,
            email="admin@test.com",
            user_type="Administrator",
            first_name="Standard",
            last_name="Admin",
        )
        self.admin_user.set_password(self.admin_password)
        self.admin_user.save()

        # Create regular users
        self.student_a = User.objects.create(
            user_id=2026003,
            email="studenta@test.com",
            user_type="Student",
            first_name="Student",
            last_name="A",
        )
        self.student_a.set_password("studentpassword")
        self.student_a.save()

        self.student_b = User.objects.create(
            user_id=2026004,
            email="studentb@test.com",
            user_type="Student",
            first_name="Student",
            last_name="B",
        )
        self.student_b.set_password("studentpassword")
        self.student_b.save()

        # Create a password reset request for student_a
        self.reset_a = PasswordReset.objects.create(
            user=self.student_a,
            status=PasswordReset.Status.PENDING
        )

        self.get_resets_url = "/api/admin/get-all-password-reset-of-users/"
        self.reset_password_url = "/api/admin/post/reset-user-password/"
        self.login_url = reverse("login")

    def _login_user(self, email, password):
        self.client.post(self.login_url, {"email": email, "password": password})

    def test_get_resets_as_admin(self):
        """
        Standard Administrator only retrieves users who have made password requests.
        """
        self._login_user(self.admin_user.email, self.admin_password)
        response = self.client.get(self.get_resets_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should only contain student_a who has an active reset request
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["user_id"], self.student_a.user_id)
        self.assertEqual(response.data[0]["status"], "Pending")

    def test_get_resets_as_superadmin(self):
        """
        Superadmin retrieves all users in the system, with the correct request status or "No Request".
        """
        self._login_user(self.superadmin.email, self.superadmin_password)
        response = self.client.get(self.get_resets_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should contain all users: superadmin, admin_user, student_a, student_b
        # Total users: 4
        self.assertEqual(len(response.data), 4)

        # Check that student_a shows "Pending" and student_b shows "No Request"
        user_ids = [item["user_id"] for item in response.data]
        self.assertIn(self.student_a.user_id, user_ids)
        self.assertIn(self.student_b.user_id, user_ids)

        student_a_data = next(item for item in response.data if item["user_id"] == self.student_a.user_id)
        student_b_data = next(item for item in response.data if item["user_id"] == self.student_b.user_id)

        self.assertEqual(student_a_data["status"], "Pending")
        self.assertEqual(student_b_data["status"], "No Request")

    def test_reset_password_as_admin_with_pending_request(self):
        """
        Standard Administrator can reset password for a user with a pending request.
        """
        self._login_user(self.admin_user.email, self.admin_password)
        payload = {
            "user_id": self.student_a.user_id,
            "new_password1": "NewPass123",
            "new_password2": "NewPass123",
        }
        response = self.client.post(self.reset_password_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify password actually changed
        self.student_a.refresh_from_db()
        from django.contrib.auth.hashers import check_password
        self.assertTrue(check_password("NewPass123", self.student_a.password_hash))

        # Verify the request is marked completed
        self.reset_a.refresh_from_db()
        self.assertEqual(self.reset_a.status, PasswordReset.Status.COMPLETED)

    def test_reset_password_as_superadmin_no_request(self):
        """
        Superadmin can reset password for a user who has not requested it.
        """
        self._login_user(self.superadmin.email, self.superadmin_password)
        payload = {
            "user_id": self.student_b.user_id,
            "new_password1": "SuperNewPass123",
            "new_password2": "SuperNewPass123",
        }
        response = self.client.post(self.reset_password_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify password changed
        self.student_b.refresh_from_db()
        from django.contrib.auth.hashers import check_password
        self.assertTrue(check_password("SuperNewPass123", self.student_b.password_hash))
        
        # Verify no reset request exists/was created or if one exists it is completed
        resets = PasswordReset.objects.filter(user=self.student_b)
        # Should remain empty or be marked Completed if any exists (but none should exist initially)
        self.assertEqual(resets.count(), 0)

    def test_unauthenticated_requests(self):
        """
        Verify that unauthenticated requests return 401 Unauthorized.
        """
        # Get password reset requests list
        response_get = self.client.get(self.get_resets_url)
        self.assertEqual(response_get.status_code, status.HTTP_401_UNAUTHORIZED)

        # Post password reset
        payload = {
            "user_id": self.student_a.user_id,
            "new_password1": "NewPass123",
            "new_password2": "NewPass123",
        }
        response_post = self.client.post(self.reset_password_url, payload, format="json")
        self.assertEqual(response_post.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_admin_requests(self):
        """
        Verify that a student user requesting either endpoint gets 403 Forbidden.
        """
        self._login_user(self.student_a.email, "studentpassword")

        # Get password reset requests list
        response_get = self.client.get(self.get_resets_url)
        self.assertEqual(response_get.status_code, status.HTTP_403_FORBIDDEN)

        # Post password reset
        payload = {
            "user_id": self.student_b.user_id,
            "new_password1": "NewPass123",
            "new_password2": "NewPass123",
        }
        response_post = self.client.post(self.reset_password_url, payload, format="json")
        self.assertEqual(response_post.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_reset_protected_account(self):
        """
        Verify that a standard Administrator trying to reset a Superadmin's or another Administrator's password gets 403 Forbidden.
        """
        self._login_user(self.admin_user.email, self.admin_password)

        # Attempt to reset Superadmin's password
        payload_super = {
            "user_id": self.superadmin.user_id,
            "new_password1": "HackSuper123",
            "new_password2": "HackSuper123",
        }
        response_super = self.client.post(self.reset_password_url, payload_super, format="json")
        self.assertEqual(response_super.status_code, status.HTTP_403_FORBIDDEN)

        # Attempt to reset another Administrator's password
        another_admin = User.objects.create(
            user_id=2026005,
            email="anotheradmin@test.com",
            user_type="Administrator",
        )
        payload_admin = {
            "user_id": another_admin.user_id,
            "new_password1": "HackAdmin123",
            "new_password2": "HackAdmin123",
        }
        response_admin = self.client.post(self.reset_password_url, payload_admin, format="json")
        self.assertEqual(response_admin.status_code, status.HTTP_403_FORBIDDEN)

    def test_reset_mismatched_passwords(self):
        """
        Verify payload with mismatched passwords returns 400 Bad Request.
        """
        self._login_user(self.superadmin.email, self.superadmin_password)
        payload = {
            "user_id": self.student_a.user_id,
            "new_password1": "Password123",
            "new_password2": "Mismatched123",
        }
        response = self.client.post(self.reset_password_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Passwords do not match", response.data["detail"])

    def test_reset_empty_passwords(self):
        """
        Verify payload with empty/missing passwords returns 400 Bad Request.
        """
        self._login_user(self.superadmin.email, self.superadmin_password)
        payload = {
            "user_id": self.student_a.user_id,
            "new_password1": "",
            "new_password2": "",
        }
        response = self.client.post(self.reset_password_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Passwords cannot be empty", response.data["detail"])

    def test_reset_nonexistent_user(self):
        """
        Verify payload with nonexistent user_id returns 404 Not Found.
        """
        self._login_user(self.superadmin.email, self.superadmin_password)
        payload = {
            "user_id": 9999999,
            "new_password1": "Password123",
            "new_password2": "Password123",
        }
        response = self.client.post(self.reset_password_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("Target user not found", response.data["detail"])

    def test_multiple_requests_maps_to_latest(self):
        """
        Verify that if a user has multiple requests (Completed and Pending), Superadmin list retrieves only one entry per user with the latest status.
        """
        # Set student_b to have a completed request and a pending request
        PasswordReset.objects.create(
            user=self.student_b,
            status=PasswordReset.Status.COMPLETED
        )
        PasswordReset.objects.create(
            user=self.student_b,
            status=PasswordReset.Status.PENDING
        )

        self._login_user(self.superadmin.email, self.superadmin_password)
        response = self.client.get(self.get_resets_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check total number of items is still 4 (one per user in database: superadmin, admin_user, student_a, student_b)
        self.assertEqual(len(response.data), 4)

        # The entry for student_b should be "Pending" (latest request status)
        student_b_data = next(item for item in response.data if item["user_id"] == self.student_b.user_id)
        self.assertEqual(student_b_data["status"], "Pending")
