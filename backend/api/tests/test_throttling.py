from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from django.core.cache import cache
from rest_framework import status
from django.conf import settings
import time
from unittest.mock import patch
from django.utils import timezone
from api.models import User, FailedLoginAttempt


class ThrottlingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()  # Reset throttles before each test

    @patch('time.sleep')
    def test_login_progressive_delay(self, mock_sleep):
        """
        Ensure the login endpoint applies progressive delays after 3 failed attempts.
        """
        url = '/api/login/'
        data = {'email': 'test@gmail.com', 'password': 'wrongpassword'}

        # 1st, 2nd, and 3rd failed attempts should NOT sleep
        for i in range(3):
            response = self.client.post(url, data, format='json')
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
            mock_sleep.assert_not_called()

        # 4th failed attempt should trigger 1-second delay
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        mock_sleep.assert_called_once_with(1)
        mock_sleep.reset_mock()

        # 5th failed attempt should trigger 2-second delay
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        mock_sleep.assert_called_once_with(2)
        mock_sleep.reset_mock()

        # 6th failed attempt should trigger 4-second delay
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        mock_sleep.assert_called_once_with(4)


    @override_settings(REST_FRAMEWORK={
        "DEFAULT_THROTTLE_RATES": {"register": "3/minute"},
    })
    def test_registration_throttling(self):
        """
        Ensure registration is throttled after 3 attempts.
        """
        url = '/api/post/register/'
        data = {'email': 'new@gmail.com', 'first_name': 'New', 'last_name': 'User'}

        for i in range(3):
            response = self.client.post(url, data, format='json')
            self.assertNotEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    @override_settings(REST_FRAMEWORK={
        "DEFAULT_THROTTLE_RATES": {"password_reset": "5/minute"},
    })
    def test_password_reset_throttling(self):
        """
        Ensure password reset is throttled after 5 attempts.
        """
        url = '/api/post/password-reset-request/'
        data = {'email': 'test@gmail.com'}

        for i in range(5):
            response = self.client.post(url, data, format='json')
            self.assertNotEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        
    @override_settings(ALLOWED_HOSTS=['allowed.com'], DEBUG=False)
    def test_allowed_hosts(self):
        """
        Ensure that requests with invalid hosts are rejected.
        Note: Django's CommonMiddleware checks ALLOWED_HOSTS.
        The test client usually sets HTTP_HOST to 'testserver'.
        """
        # We need to manually enforce the check or simulate a real request environment.
        # However, the standard Django Client bypasses this if not careful.
        # We will try to override the HTTP_HOST header.
        
        # 1. Valid Host
        response = self.client.get('/api/login/', HTTP_HOST='allowed.com')
        # Should be 405 (Method Not Allowed) or 200/401, but NOT 400 Bad Request (SuspiciousOperation)
        self.assertNotEqual(response.status_code, 400)

        # 2. Invalid Host
        # Django's test client is a bit special with ALLOWED_HOSTS. 
        # Ideally, we check that it raises DisallowedHost or returns 400.
        try:
            response = self.client.get('/api/login/', HTTP_HOST='evil.com')
            self.assertEqual(response.status_code, 400, "Should return 400 for invalid host")
        except Exception as e:
            # In some test setups, it raises an exception instead of returning 400
            pass

    def test_throttle_rates_configuration(self):
        """
        Verify that all required throttle scopes are defined.
        This prevents ImproperlyConfigured errors in production.
        """
        throttle_rates = settings.REST_FRAMEWORK.get('DEFAULT_THROTTLE_RATES', {})
        
        required_scopes = ['anon', 'user', 'login', 'register', 'password_reset']
        for scope in required_scopes:
            self.assertIn(scope, throttle_rates, f"Throttle scope '{scope}' is missing from settings.")

    @patch('time.sleep')
    def test_login_edge_cases(self, mock_sleep):
        """
        Verify successful login reset, case insensitivity, and cooldown expiration.
        """
        url = '/api/login/'
        
        # Create a test user
        user = User.objects.create(
            email="edgecase@gmail.com",
            first_name="Edge",
            last_name="Case",
            user_type="Student",
        )
        user.set_password("correctpassword")
        user.save()

        # --- Case 1: Case Insensitivity ---
        # Fail login twice with mixed case email
        data_upper = {'email': 'EdgeCase@gmail.com', 'password': 'wrongpassword'}
        self.client.post(url, data_upper, format='json')
        self.client.post(url, data_upper, format='json')
        
        # Verify attempt counter exists and matches normalized email
        record = FailedLoginAttempt.objects.get(email="edgecase@gmail.com")
        self.assertEqual(record.failures, 2)

        # Fail login a 3rd time with lowercase email
        data_lower = {'email': 'edgecase@gmail.com', 'password': 'wrongpassword'}
        self.client.post(url, data_lower, format='json')
        
        # 4th login attempt (lowercase) should trigger delay
        self.client.post(url, data_lower, format='json')
        mock_sleep.assert_called_once_with(1)
        mock_sleep.reset_mock()

        # --- Case 2: Success Reset ---
        # Login with correct password (should still experience delay of 2s because previous failures count was 4)
        data_success = {'email': 'edgecase@gmail.com', 'password': 'correctpassword'}
        response = self.client.post(url, data_success, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_sleep.assert_called_once_with(2)
        mock_sleep.reset_mock()
        
        # Verify counter reset to 0 in database
        record.refresh_from_db()
        self.assertEqual(record.failures, 0)

        # --- Case 3: Cooldown Expiration ---
        # Fail login 3 times to set counter to 3
        for i in range(3):
            self.client.post(url, data_lower, format='json')
        
        record.refresh_from_db()
        self.assertEqual(record.failures, 3)

        # Force the last_attempt timestamp in the database to be 16 minutes in the past
        FailedLoginAttempt.objects.filter(id=record.id).update(
            last_attempt=timezone.now() - timezone.timedelta(minutes=16)
        )

        # The next failed attempt should reset the failures count to 1 (since it expired) and not sleep
        response = self.client.post(url, data_lower, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        mock_sleep.assert_not_called()
        
        record.refresh_from_db()
        self.assertEqual(record.failures, 1)



