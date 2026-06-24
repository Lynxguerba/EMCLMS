from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from api.models import User, Course, Enrollment, CourseSchoolYear

class InstructorCountViewsTest(APITestCase):
    def setUp(self):
        """Set up users, courses, and enrollments for count view tests."""
        # Ensure the default school year exists
        CourseSchoolYear.objects.get_or_create(
            school_year_id=1, defaults={'school_year': '2023-2024'}
        )

        self.admin_password = "adminpassword123"
        self.admin_user = User.objects.create(
            user_id=2025040,
            email="admin_counter@test.com",
            user_type="Administrator",
        )
        self.admin_user.set_password(self.admin_password)
        self.admin_user.save()

        self.instructor_password = "instructorpassword"
        self.instructor_user = User.objects.create(
            user_id=2025041,
            email="instructor_counter@test.com",
            user_type="Instructor",
        )
        self.instructor_user.set_password(self.instructor_password)
        self.instructor_user.save()

        self.instructor_no_courses_password = "instructorpassword2"
        self.instructor_user_no_courses = User.objects.create(
            user_id=2025042,
            email="instructor_counter2@test.com",
            user_type="Instructor",
        )
        self.instructor_user_no_courses.set_password(self.instructor_no_courses_password)
        self.instructor_user_no_courses.save()

        self.student_password = "studentpassword"
        self.student_user = User.objects.create(
            user_id=2025043,
            email="student_counter@test.com",
            user_type="Student",
        )
        self.student_user.set_password(self.student_password)
        self.student_user.save()
        
        # Create courses
        self.course1 = Course.objects.create(
            course_title="Test Course 1",
            course_code="TC101",
            description="A test course",
            instructor=self.instructor_user
        )
        self.course2 = Course.objects.create(
            course_title="Test Course 2",
            course_code="TC102",
            description="Another test course",
            instructor=self.instructor_user
        )
        
        # Create enrollments
        Enrollment.objects.create(student=self.student_user, course=self.course1)
        student2 = User.objects.create(user_id=2025044, email="s2@c.com", user_type="Student")
        student2.set_password('p')
        student2.save()
        Enrollment.objects.create(student=student2, course=self.course1)

        self.login_url = reverse("login")

    def _login_user(self, email, password):
        """Helper to log in a user."""
        self.client.post(self.login_url, {"email": email, "password": password})
        
    # --- Tests for instructor_course_count view ---
    def test_instructor_course_count_success(self):
        """
        Tests that an instructor can successfully retrieve their own course count.
        """
        self._login_user(self.instructor_user.email, self.instructor_password)
        url = "/api/instructor/course-count/"
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_instructor_course_count_for_instructor_with_no_courses(self):
        """
        Tests that an instructor with no courses gets a count of 0.
        """
        self._login_user(self.instructor_user_no_courses.email, self.instructor_no_courses_password)
        url = "/api/instructor/course-count/"
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)

    def test_instructor_course_count_unauthorized_for_admin(self):
        """
        Tests that a non-instructor (admin) is unauthorized to access this view.
        """
        self._login_user(self.admin_user.email, self.admin_password)
        url = "/api/instructor/course-count/"
        response = self.client.get(url)
        # The view returns 401 for wrong user type
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_instructor_course_count_unauthenticated(self):
        """
        Tests that an unauthenticated user is unauthorized to get the instructor course count.
        """
        url = "/api/instructor/course-count/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
    # --- Tests for instructor_student_count view ---
    def test_instructor_student_count_success(self):
        """
        Tests that an instructor can successfully retrieve their total student enrollment count.
        """
        self._login_user(self.instructor_user.email, self.instructor_password)
        url = "/api/instructor/student-count/"
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2) # Two students enrolled in course1

    def test_instructor_student_count_for_instructor_with_no_students(self):
        """
        Tests that an instructor with no student enrollments gets a count of 0.
        """
        self._login_user(self.instructor_user_no_courses.email, self.instructor_no_courses_password)
        url = "/api/instructor/student-count/"
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)

    def test_instructor_student_count_unauthorized_for_student(self):
        """
        Tests that a non-instructor (student) is unauthorized to access this view.
        """
        self._login_user(self.student_user.email, self.student_password)
        url = "/api/instructor/student-count/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_instructor_student_count_unauthenticated(self):
        """
        Tests that an unauthenticated user is unauthorized to get the instructor student count.
        """
        url = "/api/instructor/student-count/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
