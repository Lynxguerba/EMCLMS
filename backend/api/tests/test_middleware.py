from django.test import TestCase, Client
from django.contrib.sessions.middleware import SessionMiddleware
from django.utils import timezone
from datetime import timedelta
from api.models import User, StudentLog, InstructorLog
from django.conf import settings

class ActiveUserMiddlewareTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.student = User.objects.create(
            email="student@test.com",
            password_hash="hashed_pw",
            first_name="Test",
            last_name="Student",
            user_type="Student",
            user_id=2024001
        )
        self.instructor = User.objects.create(
            email="instructor@test.com",
            password_hash="hashed_pw",
            first_name="Test",
            last_name="Instructor",
            user_type="Instructor",
            user_id=2024002
        )

    def test_student_auto_logout_after_inactivity(self):
        # 1. Simulate login (set session)
        session = self.client.session
        session["user_id"] = self.student.user_id
        session.save()

        # 2. Set last_online to 31 minutes ago
        past_time = timezone.now() - timedelta(minutes=31)
        self.student.last_online = past_time
        self.student.save()
            
        # 3. Make a request
        response = self.client.get('/api/session/') # Any protected or unprotected endpoint
        
        # 4. Should be 401
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), {"error": "Session expired due to inactivity"})

        # 5. Check Log
        self.assertTrue(StudentLog.objects.filter(student=self.student).exists())
        self.assertEqual(StudentLog.objects.first().message, "Automatically logged out due to inactivity.")

    def test_instructor_auto_logout_after_inactivity(self):
        session = self.client.session
        session["user_id"] = self.instructor.user_id
        session.save()

        past_time = timezone.now() - timedelta(minutes=31)
        self.instructor.last_online = past_time
        self.instructor.save()

        response = self.client.get('/api/session/')
        
        self.assertEqual(response.status_code, 401)
        self.assertTrue(InstructorLog.objects.filter(instructor=self.instructor).exists())

    def test_active_user_updates_last_online(self):
        session = self.client.session
        session["user_id"] = self.student.user_id
        session.save()

        # Set last_online to 10 minutes ago (active, but needs update)
        initial_time = timezone.now() - timedelta(minutes=10)
        self.student.last_online = initial_time
        self.student.save()

        # Make request
        self.client.get('/api/session/')
        
        self.student.refresh_from_db()
        # Should be updated to near now
        self.assertTrue(self.student.last_online > initial_time)
        
        # Log should NOT be created
        self.assertFalse(StudentLog.objects.filter(student=self.student).exists())

