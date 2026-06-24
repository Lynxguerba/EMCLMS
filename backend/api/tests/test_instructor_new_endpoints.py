from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from api.models import User, Course, Enrollment, CourseSchoolYear, Section, Content, Grade, Book, Bookshelf

class InstructorNewEndpointsTest(APITestCase):
    def setUp(self):
        # Create default bookshelf
        self.bookshelf, _ = Bookshelf.objects.get_or_create(
            bookshelf_id=1, defaults={'name': 'General'}
        )

        # Ensure the default school year exists
        self.school_year, _ = CourseSchoolYear.objects.get_or_create(
            school_year_id=1, defaults={'school_year': '2023-2024'}
        )

        self.instructor_password = "instructorpassword"
        self.instructor = User.objects.create(
            user_id=2025001,
            email="instructor@test.com",
            user_type="Instructor",
        )
        self.instructor.set_password(self.instructor_password)
        self.instructor.save()

        self.student = User.objects.create(
            user_id=2025002,
            email="student@test.com",
            user_type="Student",
        )
        self.student.set_password("studentpassword")
        self.student.save()

        self.course = Course.objects.create(
            course_title="Test Course",
            course_code="TC101",
            instructor=self.instructor,
            school_year=self.school_year
        )

        Enrollment.objects.create(student=self.student, course=self.course)

        self.section = Section.objects.create(
            course=self.course,
            section_title="Week 1"
        )

        self.content = Content.objects.create(
            section=self.section,
            content_title="Assignment 1",
            content_type="Activity",
            due_date=timezone.now() + timedelta(days=7)
        )

        self.book = Book.objects.create(
            title="Test Book",
            author="Test Author",
            isbn="1234567890"
        )

        self.login_url = reverse("login")

    def _login_instructor(self):
        self.client.post(self.login_url, {"email": self.instructor.email, "password": self.instructor_password})

    def test_enrollment_stats_success(self):
        self._login_instructor()
        url = "/api/instructor/enrollment-stats/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["data"]), 1)
        self.assertEqual(response.data["data"][0]["code"], "TC101")
        self.assertEqual(response.data["data"][0]["count"], 1)

    def test_upcoming_deadlines_success(self):
        self._login_instructor()
        url = "/api/instructor/upcoming-deadlines/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["content_title"], "Assignment 1")
        self.assertEqual(response.data[0]["total_students"], 1)
        self.assertEqual(response.data[0]["submissions_count"], 0)

        # Add a submission
        Grade.objects.create(
            content=self.content,
            user=self.student,
            status="Submitted"
        )
        response = self.client.get(url)
        self.assertEqual(response.data[0]["submissions_count"], 1)

    def test_get_course_book_success(self):
        self._login_instructor()
        url = f"/api/instructor/get/course-book/?book_id={self.book.no}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["course_code"], "TC101")
        self.assertEqual(response.data[0]["is_book_mapped"], False)

    def test_unauthorized_access(self):
        # Test without login
        url = "/api/instructor/enrollment-stats/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
