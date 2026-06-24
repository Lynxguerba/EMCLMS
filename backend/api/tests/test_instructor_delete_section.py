from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from api.models import (
    User,
    Course,
    Section,
    Content,
    ContentFile,
    Grade,
    SubmissionFile,
    CourseSchoolYear,
)
from django.core.files.uploadedfile import SimpleUploadedFile
import os
from django.conf import settings
from django.db import transaction


class InstructorDeleteSectionTest(APITestCase):
    def setUp(self):
        self.school_year, _ = CourseSchoolYear.objects.get_or_create(
            school_year_id=1, defaults={"school_year": "2023-2024"}
        )

        # Create Instructor
        self.instructor_password = "instructorpassword"
        self.instructor_user = User.objects.create(
            user_id=2025050,
            email="instructor_del_sec@test.com",
            user_type="Instructor",
        )
        self.instructor_user.set_password(self.instructor_password)
        self.instructor_user.save()

        # Create Student
        self.student_password = "studentpassword"
        self.student_user = User.objects.create(
            user_id=2025051,
            email="student_del_sec@test.com",
            user_type="Student",
        )
        self.student_user.set_password(self.student_password)
        self.student_user.save()

        # Create Course
        self.course = Course.objects.create(
            course_title="Test Course",
            course_code="TC101",
            description="Description for Test Course",
            instructor=self.instructor_user,
            school_year=self.school_year,
        )

        # Create Section
        self.section = Section.objects.create(
            course=self.course,
            section_title="Test Section",
            description="Description for Test Section",
            order_in_course=1,
        )

        # Create Content
        self.content = Content.objects.create(
            section=self.section,
            content_title="Test Content",
            content_description="Description for Test Content",
            content_type="ACTIVITY",
            order_in_section=1,
            total_score=100,
        )

        # Create ContentFile
        self.content_file_name = "test_content.pdf"
        self.content_file_path = os.path.join(
            settings.MEDIA_ROOT, "content_files", self.content_file_name
        )
        os.makedirs(os.path.dirname(self.content_file_path), exist_ok=True)
        # Manual file creation removed to rely on SimpleUploadedFile

        self.uploaded_content_file = SimpleUploadedFile(
            name=self.content_file_name,
            content=b"This is a test content file.",
            content_type="application/pdf",
        )
        self.content_file = ContentFile.objects.create(
            content=self.content, file=self.uploaded_content_file
        )

        # Create Grade and SubmissionFile (simulating student submission)
        self.grade = Grade.objects.create(
            content=self.content,
            user=self.student_user,
            score=0,
            status="PENDING",
            submitted_at="2023-01-01T12:00:00Z",
        )

        self.submission_file_name = "test_submission.txt"
        self.submission_file_path = os.path.join(
            settings.MEDIA_ROOT, "submission_files", self.submission_file_name
        )
        os.makedirs(os.path.dirname(self.submission_file_path), exist_ok=True)
        # Manual file creation removed

        self.uploaded_submission_file = SimpleUploadedFile(
            name=self.submission_file_name,
            content=b"This is a test submission file.",
            content_type="text/plain",
        )
        self.submission_file = SubmissionFile.objects.create(
            grade=self.grade, file=self.uploaded_submission_file
        )

        self.delete_url = reverse(
            "instructor_delete_section", args=[self.section.section_id]
        )
        self.login_url = reverse("login")

    def _login_user(self, email, password):
        self.client.post(self.login_url, {"email": email, "password": password})

    def tearDown(self):
        # Clean up files created during tests
        if os.path.exists(self.content_file_path):
            os.remove(self.content_file_path)
        if os.path.exists(os.path.dirname(self.content_file_path)):
            try:
                os.rmdir(os.path.dirname(self.content_file_path))
            except OSError:
                pass  # Directory might not be empty if other tests also use it

        if os.path.exists(self.submission_file_path):
            os.remove(self.submission_file_path)
        if os.path.exists(os.path.dirname(self.submission_file_path)):
            try:
                os.rmdir(os.path.dirname(self.submission_file_path))
            except OSError:
                pass  # Directory might not be empty if other tests also use it

        # Ensure all objects are deleted for clean state for subsequent tests.
        # Use transaction.atomic to ensure all related objects are deleted together.
        with transaction.atomic():
            ContentFile.objects.all().delete()
            SubmissionFile.objects.all().delete()
            Grade.objects.all().delete()
            Content.objects.all().delete()
            Section.objects.all().delete()
            Course.objects.all().delete()
            User.objects.all().delete()
            CourseSchoolYear.objects.all().delete()

    def test_instructor_delete_section_success(self):
        self._login_user(self.instructor_user.email, self.instructor_password)

        # Check that files exist before deletion
        self.assertTrue(os.path.exists(self.content_file.file.path))
        self.assertTrue(os.path.exists(self.submission_file.file.path))

        response = self.client.delete(self.delete_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Assert database entries are deleted
        self.assertFalse(
            Section.objects.filter(section_id=self.section.section_id).exists()
        )
        self.assertFalse(
            Content.objects.filter(content_id=self.content.content_id).exists()
        )
        self.assertFalse(ContentFile.objects.filter(id=self.content_file.id).exists())
        self.assertFalse(Grade.objects.filter(grade_id=self.grade.grade_id).exists())
        self.assertFalse(
            SubmissionFile.objects.filter(id=self.submission_file.id).exists()
        )

        # Assert physical files are deleted
        self.assertFalse(os.path.exists(self.content_file.file.path))
        self.assertFalse(os.path.exists(self.submission_file.file.path))

    def test_instructor_delete_section_unauthorized(self):
        # Attempt to delete without logging in
        response = self.client.delete(self.delete_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Attempt to delete as a student
        self._login_user(self.student_user.email, self.student_password)
        response = self.client.delete(self.delete_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_instructor_delete_section_not_found(self):
        self._login_user(self.instructor_user.email, self.instructor_password)
        non_existent_url = reverse("instructor_delete_section", args=[99999])
        response = self.client.delete(non_existent_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
