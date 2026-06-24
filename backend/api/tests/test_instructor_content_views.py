from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from api.models import User, Course, Section, Content, CourseSchoolYear
from django.utils import timezone
from unittest.mock import patch, PropertyMock


class InstructorContentManagementTest(APITestCase):
    def setUp(self):
        # Ensure the default school year exists
        self.school_year, _ = CourseSchoolYear.objects.get_or_create(
            school_year_id=1, defaults={"school_year": "2023-2024"}
        )

        # Create Instructor
        self.instructor_password = "instructorpassword"
        self.instructor_user = User.objects.create(
            user_id=2025041,
            email="instructor_content@test.com",
            user_type="Instructor",
        )
        self.instructor_user.set_password(self.instructor_password)
        self.instructor_user.save()

        # Create Another Instructor (for unauthorized access tests)
        self.other_instructor_user = User.objects.create(
            user_id=2025042,
            email="other_instructor@test.com",
            user_type="Instructor",
        )
        self.other_instructor_user.set_password(self.instructor_password)
        self.other_instructor_user.save()

        # Create Student (for unauthorized access tests)
        self.student_user = User.objects.create(
            user_id=2025043,
            email="student_content@test.com",
            user_type="Student",
        )
        self.student_user.set_password("studentpassword")
        self.student_user.save()

        # Create Course
        self.course = Course.objects.create(
            course_title="Test Course Content",
            course_code="TCC101",
            description="A test course for content",
            instructor=self.instructor_user,
            school_year=self.school_year,
        )

        # Create Section
        self.section = Section.objects.create(
            course=self.course, section_title="Test Section", order_in_course=1
        )

        # Create Content
        self.content = Content.objects.create(
            section=self.section,
            content_title="Existing Content",
            content_type="Activity",
            order_in_section=1,
            total_score=100,
        )

        self.login_url = reverse("login")

    def _login_user(self, email, password):
        self.client.post(self.login_url, {"email": email, "password": password})

    # --- Tests for instructor_add_content ---

    def test_instructor_add_content_success(self):
        self._login_user(self.instructor_user.email, self.instructor_password)
        url = "/api/instructor/post/add-content/"
        data = {
            "section_id": self.section.section_id,
            "content_title": "New Content",
            "content_type": "Activity",
            "content_description": "Description",
            "total_score": 50,
            "due_date": (timezone.now() + timezone.timedelta(days=7)).isoformat(),
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Content.objects.count(), 2)
        self.assertEqual(Content.objects.last().content_title, "New Content")

    def test_instructor_add_content_unauthorized_student(self):
        self._login_user(self.student_user.email, "studentpassword")
        url = "/api/instructor/post/add-content/"
        data = {
            "section_id": self.section.section_id,
            "content_title": "New Content",
            "content_type": "Activity",
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_instructor_add_content_missing_fields(self):
        self._login_user(self.instructor_user.email, self.instructor_password)
        url = "/api/instructor/post/add-content/"
        data = {
            "section_id": self.section.section_id,
            # Missing content_title and content_type
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- Tests for instructor_update_content ---

    def test_instructor_update_content_success(self):
        self._login_user(self.instructor_user.email, self.instructor_password)
        url = f"/api/instructor/put/update-content/{self.content.content_id}/"
        data = {
            "content_title": "Updated Content Title",
            "content_description": "Updated Description",
            "total_score": 75,
        }
        response = self.client.put(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.content.refresh_from_db()
        self.assertEqual(self.content.content_title, "Updated Content Title")
        self.assertEqual(self.content.total_score, 75)

    def test_instructor_update_content_unauthorized_student(self):
        self._login_user(self.student_user.email, "studentpassword")
        url = f"/api/instructor/put/update-content/{self.content.content_id}/"
        data = {"content_title": "Updated"}
        response = self.client.put(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_instructor_update_content_not_found(self):
        self._login_user(self.instructor_user.email, self.instructor_password)
        url = "/api/instructor/put/update-content/9999/"
        data = {"content_title": "Updated"}
        response = self.client.put(url, data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- Tests for instructor_delete_content ---

    def test_instructor_delete_content_success(self):
        self._login_user(self.instructor_user.email, self.instructor_password)
        url = f"/api/instructor/delete/content/{self.content.content_id}/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Content.objects.count(), 0)

    def test_instructor_delete_content_unauthorized_student(self):
        self._login_user(self.student_user.email, "studentpassword")
        url = f"/api/instructor/delete/content/{self.content.content_id}/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_instructor_delete_content_not_found(self):
        self._login_user(self.instructor_user.email, self.instructor_password)
        url = "/api/instructor/delete/content/9999/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch('django.core.files.uploadedfile.UploadedFile.size', new_callable=PropertyMock)
    def test_instructor_add_content_large_file_success(self, mock_size):
        """Test that an instructor can upload a large file (e.g., 50MB) without size limits."""
        mock_size.return_value = 50 * 1024 * 1024
        self._login_user(self.instructor_user.email, self.instructor_password)
        url = "/api/instructor/post/add-content/"
        
        from django.core.files.uploadedfile import SimpleUploadedFile
        large_file = SimpleUploadedFile("large_lecture.pdf", b"pdf_content")
        
        data = {
            "section_id": self.section.section_id,
            "content_title": "Huge Lecture Notes",
            "content_type": "File",
            "files": [large_file],
        }
        response = self.client.post(url, data, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Content.objects.last().content_title, "Huge Lecture Notes")
