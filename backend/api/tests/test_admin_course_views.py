# backend/api/tests/test_admin_course_views.py
from django.test import TestCase, Client
from django.urls import reverse
from rest_framework import status
from api.models import User, Course, CourseSchoolYear
from api.views.admin_create_course import admin_create_course
from api.views.admin_delete_course import admin_delete_course
import json

class AdminCourseViewsTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.admin_user = User.objects.create(
            email='admin@gmail.com',
            user_type='Administrator',
            first_name='Admin',
            last_name='User',
            program='BS IT'
        )
        self.admin_user.set_password('adminpassword')
        self.admin_user.save()

        self.instructor_user = User.objects.create(
            email='instructor@gmail.com',
            user_type='Instructor',
            first_name='Instructor',
            last_name='User',
            program='BS IT'
        )
        self.instructor_user.set_password('instructorpassword')
        self.instructor_user.save()

        self.student_user = User.objects.create(
            email='student@gmail.com',
            user_type='Student',
            first_name='Student',
            last_name='User',
            program='BS IT'
        )
        self.student_user.set_password('studentpassword')
        self.student_user.save()

        # Create a default CourseSchoolYear to satisfy the model's default
        self.default_school_year = CourseSchoolYear.objects.create(school_year_id=1, school_year='2022-2023')


        # Log in the admin user and set user_id in session
        self.client.login(email='admin@gmail.com', password='adminpassword')
        session = self.client.session
        session['user_id'] = str(self.admin_user.user_id)
        session.save()

    def test_admin_create_course_success(self):
        url = reverse('admin_create_course')
        data = {
            'course_code': 'CS101',
            'course_title': 'Introduction to Computer Science',
            'description': 'A basic introduction to computer science concepts.',
            'instructor_id': self.instructor_user.user_id,
        }
        response = self.client.post(url, json.dumps(data), content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Course.objects.count(), 1)
        # Assuming default school_year_id is 1
        self.assertTrue(Course.objects.filter(course_code='CS101', school_year=self.default_school_year).exists())
        self.assertEqual(response.json()['message'], 'Course created successfully')

    def test_admin_create_course_missing_fields(self):
        url = reverse('admin_create_course')
        data = {
            'course_code': '',  # Empty course code
            'course_title': '', # Empty course title
            'description': 'A basic introduction to computer science concepts.',
            'instructor_id': self.instructor_user.user_id,
        }
        response = self.client.post(url, json.dumps(data), content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.json())
        self.assertEqual(response.json()['detail'], 'Course code cannot be empty')
        
        data_missing_title = {
            'course_code': 'CS102',
            'course_title': '', # Empty course title
            'description': 'A basic introduction to computer science concepts.',
            'instructor_id': self.instructor_user.user_id,
        }
        response = self.client.post(url, json.dumps(data_missing_title), content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.json())
        self.assertEqual(response.json()['detail'], 'Course title cannot be empty')

        data_missing_instructor = {
            'course_code': 'CS103',
            'course_title': 'Introduction to Computer Science',
            'description': 'A basic introduction to computer science concepts.',
            # Missing instructor_id
        }
        response = self.client.post(url, json.dumps(data_missing_instructor), content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.json())
        self.assertEqual(response.json()['detail'], 'Instructor not found') # Instructor ID is required, which defaults to 'None' and causes 'Instructor not found'

    def test_admin_create_course_invalid_instructor(self):
        url = reverse('admin_create_course')
        data = {
            'course_code': 'CS103',
            'course_title': 'Algorithms',
            'description': 'Advanced algorithms.',
            'instructor_id': 99999, # Non-existent instructor ID
        }
        response = self.client.post(url, json.dumps(data), content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.json())
        self.assertEqual(response.json()['detail'], 'Instructor not found')
        self.assertEqual(Course.objects.count(), 0)

    def test_admin_create_course_non_instructor_user(self):
        url = reverse('admin_create_course')
        data = {
            'course_code': 'CS104',
            'course_title': 'Operating Systems',
            'description': 'Study of operating systems.',
            'instructor_id': self.student_user.user_id, # Student user as instructor
        }
        response = self.client.post(url, json.dumps(data), content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.json())
        self.assertEqual(response.json()['detail'], 'User is not an instructor.')
        self.assertEqual(Course.objects.count(), 0)

    def test_admin_create_course_duplicate_course_code(self):
        url = reverse('admin_create_course')
        data = {
            'course_code': 'CS200',
            'course_title': 'Introduction to CS',
            'description': 'A basic introduction to computer science concepts.',
            'instructor_id': self.instructor_user.user_id,
        }
        self.client.post(url, json.dumps(data), content_type='application/json')

        # Attempt to create again with same course_code
        response = self.client.post(url, json.dumps(data), content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.json())
        self.assertEqual(response.json()['detail'], 'Course code already exists for this instructor in the current school year')
        self.assertEqual(Course.objects.count(), 1) # Should still be 1

    def test_admin_delete_course_success(self):
        # First, create a course to delete
        course = Course.objects.create(
            course_code='DEL101',
            course_title='Course to Delete',
            description='This course will be deleted.',
            instructor=self.instructor_user,
            school_year=self.default_school_year,
        )
        self.assertEqual(Course.objects.count(), 1)

        # Now, delete the course
        delete_url = reverse('admin_delete_course', args=[course.course_id])
        response = self.client.delete(delete_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()['success'])
        self.assertEqual(Course.objects.count(), 0)
        self.assertFalse(Course.objects.filter(course_id=course.course_id).exists())

    def test_admin_delete_course_not_found(self):
        delete_url = reverse('admin_delete_course', args=[99999]) # Use a non-existent integer ID
        response = self.client.delete(delete_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('detail', response.json())
        self.assertEqual(response.json()['detail'], 'Course not found')
        self.assertEqual(Course.objects.count(), 0)

    def test_admin_delete_course_unauthorized(self):
        # Create a course as admin first (to ensure there's something to try and delete)
        course = Course.objects.create(
            course_code='UNAUTH101',
            course_title='Unauthorized Delete',
            description='Course for unauthorized delete test.',
            instructor=self.instructor_user,
            school_year=self.default_school_year
        )
        self.assertEqual(Course.objects.count(), 1)
        
        # Log out the admin user
        self.client.logout()

        # Log in as a student user and set session
        self.client.login(email='student@gmail.com', password='studentpassword')
        session = self.client.session
        session['user_id'] = str(self.student_user.user_id)
        session.save()

        # Now try to delete as student
        delete_url = reverse('admin_delete_course', args=[course.course_id])
        response = self.client.delete(delete_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.json())
        self.assertEqual(response.json()['detail'], 'Forbidden')
        self.assertEqual(Course.objects.count(), 1) # Course should still exist
    def test_admin_create_course_duplicate_code_different_instructor(self):
        # 1. Create a second instructor
        another_instructor = User.objects.create(
            email='instructor2@gmail.com',
            user_type='Instructor',
            first_name='Another',
            last_name='Instructor',
        )
        another_instructor.set_password('password')
        another_instructor.save()

        url = reverse('admin_create_course')
        # 2. Create the first course
        data1 = {
            'course_code': 'REPRO101',
            'course_title': 'Repro Course',
            'instructor_id': self.instructor_user.user_id,
        }
        self.client.post(url, json.dumps(data1), content_type='application/json')

        # 3. Attempt to create another course with same code but different instructor
        data2 = {
            'course_code': 'REPRO101',
            'course_title': 'Repro Course',
            'instructor_id': another_instructor.user_id,
        }
        response = self.client.post(url, json.dumps(data2), content_type='application/json')
        
        # 4. Confirm it SUCCEEDS now
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Course.objects.count(), 2) # Now 2 courses exist with the same code but different instructors
