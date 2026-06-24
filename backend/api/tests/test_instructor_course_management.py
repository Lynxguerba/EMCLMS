from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from api.models import (
    User,
    Course,
    Book,
    CourseRecommendedBook,
    Section,
    CourseSchoolYear,
    Bookshelf,
)


class InstructorCourseManagementTest(APITestCase):
    def setUp(self):
        # Ensure default school year
        self.school_year, _ = CourseSchoolYear.objects.get_or_create(
            school_year_id=1, defaults={"school_year": "2023-2024"}
        )

        # Ensure default bookshelf exists
        self.bookshelf, _ = Bookshelf.objects.get_or_create(
            bookshelf_id=1, defaults={"name": "Default Bookshelf"}
        )

        # Create Instructor
        self.instructor_password = "instructorpassword"
        self.instructor_user = User.objects.create(
            user_id=2025050,
            email="instructor_mgmt@test.com",
            user_type="Instructor",
        )
        self.instructor_user.set_password(self.instructor_password)
        self.instructor_user.save()

        # Create Student
        self.student_user = User.objects.create(
            user_id=2025051,
            email="student_mgmt@test.com",
            user_type="Student",
        )
        self.student_user.set_password("studentpassword")
        self.student_user.save()

        # Create Course
        self.course = Course.objects.create(
            course_title="Management Course",
            course_code="MGMT101",
            description="Course for management tests",
            instructor=self.instructor_user,
            school_year=self.school_year,
        )

        # Create Book
        self.book = Book.objects.create(
            title="Test Book", author="Test Author", isbn="1234567890"
        )

        self.login_url = reverse("login")

    def _login_user(self, email, password):
        self.client.post(self.login_url, {"email": email, "password": password})

    # --- Tests for instructor_add_course_book ---

    def test_instructor_add_course_book_success(self):
        self._login_user(self.instructor_user.email, self.instructor_password)
        url = "/api/instructor/post/add-course-book/"
        data = {"course_id": self.course.course_id, "book_id": self.book.no}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            CourseRecommendedBook.objects.filter(
                course=self.course, book=self.book
            ).exists()
        )
        self.book.refresh_from_db()
        self.assertEqual(self.book.recommendation_count, 1)

        # Test removing the book (toggle)
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(
            CourseRecommendedBook.objects.filter(
                course=self.course, book=self.book
            ).exists()
        )
        self.book.refresh_from_db()
        self.assertEqual(self.book.recommendation_count, 0)

    def test_instructor_add_course_book_unauthorized(self):
        self._login_user(self.student_user.email, "studentpassword")
        url = "/api/instructor/post/add-course-book/"
        data = {"course_id": self.course.course_id, "book_id": self.book.no}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_instructor_add_course_book_missing_fields(self):
        self._login_user(self.instructor_user.email, self.instructor_password)
        url = "/api/instructor/post/add-course-book/"
        data = {"course_id": self.course.course_id}  # Missing book_id
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- Tests for instructor_get_course_book ---

    def test_instructor_get_course_book_success(self):
        self._login_user(self.instructor_user.email, self.instructor_password)
        url = f"/api/instructor/get/course-book/?book_id={self.book.no}"

        # First, ensure no mapping
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data[0]["is_book_mapped"])

        # Add mapping
        CourseRecommendedBook.objects.create(course=self.course, book=self.book)

        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data[0]["is_book_mapped"])

    def test_instructor_get_course_book_unauthorized(self):
        self._login_user(self.student_user.email, "studentpassword")
        url = f"/api/instructor/get/course-book/?book_id={self.book.no}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # --- Tests for add_section ---

    def test_add_section_success(self):
        self._login_user(self.instructor_user.email, self.instructor_password)
        url = f"/api/courses/{self.course.course_id}/sections/add/"
        data = {
            "section_title": "New Section",
            "description": "Section Description",
            "order_in_course": 1,
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Section.objects.count(), 1)
        self.assertEqual(Section.objects.first().section_title, "New Section")

    def test_add_section_unauthorized(self):
        self._login_user(self.student_user.email, "studentpassword")
        url = f"/api/courses/{self.course.course_id}/sections/add/"
        data = {"section_title": "New Section"}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- Tests for instructor_update_section ---

    def test_instructor_update_section_success(self):
        section = Section.objects.create(course=self.course, section_title="Old Title")
        self._login_user(self.instructor_user.email, self.instructor_password)
        url = f"/api/instructor/put/update-section/{section.section_id}/"
        data = {"section_title": "Updated Title", "description": "Updated Description"}
        response = self.client.put(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        section.refresh_from_db()
        self.assertEqual(section.section_title, "Updated Title")

    def test_instructor_update_section_unauthorized(self):
        section = Section.objects.create(course=self.course, section_title="Old Title")
        self._login_user(self.student_user.email, "studentpassword")
        url = f"/api/instructor/put/update-section/{section.section_id}/"
        data = {"section_title": "Updated Title"}
        response = self.client.put(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
