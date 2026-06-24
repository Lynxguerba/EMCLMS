# backend/api/tests/test_update_course.py
from django.test import TestCase, Client
from django.urls import reverse
from rest_framework import status
from api.models import User, Course, CourseSchoolYear
import json

class UpdateCourseViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        
        # Admin
        self.admin_user = User.objects.create(
            email='admin@gmail.com',
            user_type='Administrator',
            first_name='Admin',
            last_name='User'
        )
        self.admin_user.set_password('password')
        self.admin_user.save()

        # Instructor 1 (Owner)
        self.instructor1 = User.objects.create(
            email='inst1@gmail.com',
            user_type='Instructor',
            first_name='Inst',
            last_name='One'
        )
        self.instructor1.set_password('password')
        self.instructor1.save()

        # Instructor 2 (Not Owner)
        self.instructor2 = User.objects.create(
            email='inst2@gmail.com',
            user_type='Instructor',
            first_name='Inst',
            last_name='Two'
        )
        self.instructor2.set_password('password')
        self.instructor2.save()

        # Student
        self.student = User.objects.create(
            email='student@gmail.com',
            user_type='Student',
            first_name='Student',
            last_name='User'
        )
        self.student.set_password('password')
        self.student.save()

        self.school_year = CourseSchoolYear.objects.create(school_year_id=1, school_year='2023-2024')

        self.course = Course.objects.create(
            course_code='OLD101',
            course_title='Old Title',
            description='Old Description',
            instructor=self.instructor1,
            school_year=self.school_year
        )

    def login_as(self, user):
        self.client.login(email=user.email, password='password')
        session = self.client.session
        session['user_id'] = str(user.user_id)
        session.save()

    def test_update_course_as_admin_success(self):
        self.login_as(self.admin_user)
        url = reverse('update_course', args=[self.course.course_id])
        data = {
            'course_code': 'NEW101',
            'course_title': 'New Title',
            'course_description': 'New Description'
        }
        response = self.client.patch(url, json.dumps(data), content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.course.refresh_from_db()
        self.assertEqual(self.course.course_code, 'NEW101')
        self.assertEqual(self.course.course_title, 'New Title')
        self.assertEqual(self.course.description, 'New Description')

    def test_update_course_as_assigned_instructor_denied(self):
        self.login_as(self.instructor1)
        url = reverse('update_course', args=[self.course.course_id])
        data = {
            'course_code': 'INST101',
            'course_title': 'Inst Title',
            'course_description': 'Inst Description'
        }
        response = self.client.put(url, json.dumps(data), content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_course_as_unassigned_instructor_denied(self):
        self.login_as(self.instructor2)
        url = reverse('update_course', args=[self.course.course_id])
        data = {
            'course_code': 'HACK101',
            'course_title': 'Hacked Title',
            'course_description': 'Hacked'
        }
        response = self.client.patch(url, json.dumps(data), content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_course_as_student_denied(self):
        self.login_as(self.student)
        url = reverse('update_course', args=[self.course.course_id])
        data = {'course_title': 'Student Edit'}
        response = self.client.patch(url, json.dumps(data), content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_course_missing_title(self):
        self.login_as(self.admin_user)
        url = reverse('update_course', args=[self.course.course_id])
        data = {
            'course_code': 'VALID',
            'course_title': '', # Empty title
            'course_description': 'Desc'
        }
        response = self.client.patch(url, json.dumps(data), content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_course_missing_code(self):
        self.login_as(self.admin_user)
        url = reverse('update_course', args=[self.course.course_id])
        data = {
            'course_code': '', # Empty code
            'course_title': 'Valid Title',
            'course_description': 'Desc'
        }
        response = self.client.patch(url, json.dumps(data), content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_course_unauthorized(self):
        url = reverse('update_course', args=[self.course.course_id])
        data = {'course_title': 'No Auth'}
        response = self.client.patch(url, json.dumps(data), content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
