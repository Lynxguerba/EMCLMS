from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from api.models import User, Course, Enrollment, CourseSchoolYear, Section, Content, ContentFile, Grade
from unittest.mock import patch, PropertyMock

class StudentEndpointsTest(APITestCase):
    def setUp(self):
        """Set up users, courses, sections, and contents for student endpoint tests."""
        # Ensure the default school year exists
        self.school_year = CourseSchoolYear.objects.create(
            school_year='2023-2024'
        )

        self.instructor_password = "instructorpassword"
        self.instructor_user = User.objects.create(
            user_id=2025050,
            email="instructor_student_test@test.com",
            user_type="Instructor",
        )
        self.instructor_user.set_password(self.instructor_password)
        self.instructor_user.save()

        self.student_password = "studentpassword"
        self.student_user = User.objects.create(
            user_id=2025051,
            email="student_test@test.com",
            user_type="Student",
        )
        self.student_user.set_password(self.student_password)
        self.student_user.save()
        
        # Create courses
        self.course1 = Course.objects.create(
            course_title="Test Course 1",
            course_code="TC101",
            description="A test course",
            instructor=self.instructor_user,
            school_year=self.school_year
        )
        self.course2 = Course.objects.create(
            course_title="Test Course 2",
            course_code="TC102",
            description="Another test course",
            instructor=self.instructor_user,
            school_year=self.school_year
        )
        
        # Create sections
        self.section1 = Section.objects.create(
            course=self.course1,
            section_title="Section 1",
            description="First section",
            order_in_course=1
        )
        self.section2 = Section.objects.create(
            course=self.course2,
            section_title="Section 2",
            description="Second section",
            order_in_course=1
        )

        # Create content
        self.content1 = Content.objects.create(
            section=self.section1,
            content_title="Content 1",
            content_type="Activity",
            order_in_section=1
        )

        # Enroll student in course1 only
        Enrollment.objects.create(student=self.student_user, course=self.course1)

        self.login_url = reverse("login")

    def _login_student(self):
        """Helper to log in the student user."""
        self.client.post(self.login_url, {"email": self.student_user.email, "password": self.student_password})

    def test_student_get_all_courses(self):
        """Test that a student can retrieve all their enrolled courses."""
        self._login_student()
        url = "/api/student/courses/"
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["course_id"], self.course1.course_id)

    def test_student_get_all_sections(self):
        """Test that a student can retrieve sections for their enrolled courses."""
        self._login_student()
        url = "/api/student/sections/"
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should only get section1 because enrolled in course1
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["section_id"], self.section1.section_id)

    def test_student_get_all_contents(self):
        """Test that a student can retrieve contents for their enrolled courses."""
        self._login_student()
        url = "/api/student/contents/"
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should only get content1
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["content_id"], self.content1.content_id)

    def test_student_get_performance(self):
        """Test that a student can retrieve their performance across enrolled courses."""
        # Create a grade for content1
        # Course 1: 85.0
        Grade.objects.create(
            content=self.content1,
            user=self.student_user,
            normalized_score=85.0
        )
        
        # Course 2: 75.0 (Adding enrollment and activity for course 2)
        Enrollment.objects.create(student=self.student_user, course=self.course2)
        content2 = Content.objects.create(
            section=self.section2,
            content_title="Content 2",
            content_type="Activity",
            order_in_section=1
        )
        Grade.objects.create(
            content=content2,
            user=self.student_user,
            normalized_score=75.0
        )
        
        self._login_student()
        url = "/api/student/get/performance/"
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["courses"]), 2)
        
        # Course 1 average: 85.0
        # Course 2 average: 75.0
        # Overall average should be (85 + 75) / 2 = 80.0
        self.assertEqual(float(response.data["overall_average"]), 80.0)

    def test_unauthorized_access(self):
        """Test that an unauthenticated user cannot access the student endpoints."""
        endpoints = [
            "/api/student/courses/",
            "/api/student/sections/",
            "/api/student/contents/",
        ]
        for url in endpoints:
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_forbidden_access_for_instructor(self):
        """Test that an instructor cannot access the student endpoints."""
        self.client.post(self.login_url, {"email": self.instructor_user.email, "password": self.instructor_password})
        endpoints = [
            "/api/student/courses/",
            "/api/student/sections/",
            "/api/student/contents/",
        ]
        for url in endpoints:
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_cannot_access_unowned_course(self):
        """Test that a student cannot access details of a course they are not enrolled in."""
        self._login_student()
        # Student is enrolled in course1, but NOT in course2
        
        url_detail = f"/api/student/courses/{self.course2.course_id}/"
        response = self.client.get(url_detail)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        url_sections = f"/api/student/courses/{self.course2.course_id}/sections/"
        response = self.client.get(url_sections)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        url_contents = f"/api/student/courses/{self.course2.course_id}/contents/"
        response = self.client.get(url_contents)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('django.core.files.uploadedfile.UploadedFile.size', new_callable=PropertyMock)
    def test_student_submit_file_over_20mb_limit(self, mock_size):
        """Test that student submission is rejected if file size exceeds 20MB."""
        mock_size.return_value = 21 * 1024 * 1024
        self._login_student()
        url = f"/api/student/content/{self.content1.content_id}/submit-files/"
        
        from django.core.files.uploadedfile import SimpleUploadedFile
        large_file = SimpleUploadedFile("large.txt", b"small_content")
        
        response = self.client.post(url, {"files": [large_file], "confirm": "false"}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("exceeds the 20MB limit", response.data["detail"])

    @patch('django.core.files.uploadedfile.UploadedFile.size', new_callable=PropertyMock)
    def test_student_submit_file_under_20mb_limit(self, mock_size):
        """Test that student submission succeeds if file size is under 20MB (e.g., 15MB)."""
        mock_size.return_value = 15 * 1024 * 1024
        self._login_student()
        url = f"/api/student/content/{self.content1.content_id}/submit-files/"
        
        from django.core.files.uploadedfile import SimpleUploadedFile
        valid_file = SimpleUploadedFile("valid.txt", b"small_content")
        
        response = self.client.post(url, {"files": [valid_file], "confirm": "false"}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
