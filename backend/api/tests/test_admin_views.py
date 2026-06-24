from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from api.models import User, Course, Enrollment, CourseSchoolYear


class UserChoicesViewTest(APITestCase):
    def setUp(self):
        """Set up an admin and a regular user for UserChoicesView tests."""
        self.admin_password = "adminpassword"
        self.admin_user = User.objects.create(
            email="admin@test.com",
            user_type="Administrator",
            first_name="Admin",
            last_name="User",
        )
        self.admin_user.set_password(self.admin_password)
        self.admin_user.save()

        self.student_password = "studentpassword"
        self.student_user = User.objects.create(
            email="student@test.com",
            user_type="Student",
            first_name="Student",
            last_name="User",
        )
        self.student_user.set_password(self.student_password)
        self.student_user.save()

        self.url = reverse("get_user_choices")

    def test_get_user_choices_as_admin_success(self):
        """
        Tests that an admin can successfully retrieve user choices.
        """
        self.client.post(reverse("login"), {"email": self.admin_user.email, "password": self.admin_password})
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("user_types", response.data)
        self.assertIn("programs", response.data)
        self.assertEqual(response.data["user_types"], [choice[0] for choice in User.USER_TYPES])
        self.assertEqual(response.data["programs"], [choice[0] for choice in User.PROGRAM_CHOICES])

    def test_get_user_choices_as_non_admin_forbidden(self):
        """
        Tests that a non-admin user is forbidden from retrieving user choices.
        """
        self.client.post(reverse("login"), {"email": self.student_user.email, "password": self.student_password})
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("detail", response.data)
        self.assertEqual(response.data["detail"], "Forbidden")

    def test_get_user_choices_unauthenticated_unauthorized(self):
        """
        Tests that an unauthenticated user is unauthorized to retrieve user choices.
        """
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("detail", response.data)
        self.assertEqual(response.data["detail"], "Unauthorized")


class AdminCreateUserTest(APITestCase):
    def setUp(self):
        """Set up admin and non-admin users for admin_create_user tests."""
        self.admin_password = "adminpassword123"
        self.admin_user = User(
            user_id=2025001,  # Explicitly set to avoid conflicts with auto-gen IDs
            email="admin_creator@test.com",
            user_type="Administrator",
            first_name="Admin",
            last_name="Creator",
        )
        self.admin_user.set_password(self.admin_password)
        self.admin_user.save()

        self.non_admin_password = "nonadminpassword123"
        self.non_admin_user = User(
            user_id=2025002,
            email="non_admin@test.com",
            user_type="Student",
            first_name="Non",
            last_name="Admin",
        )
        self.non_admin_user.set_password(self.non_admin_password)
        self.non_admin_user.save()

        self.url = reverse("admin_create_user")
        self.login_url = reverse("login")

    def _login_user(self, email, password):
        """Helper to log in a user."""
        self.client.post(self.login_url, {"email": email, "password": password})

    def test_admin_create_user_success(self):
        """
        Tests that an admin can successfully create a new user with valid data.
        """
        self._login_user(self.admin_user.email, self.admin_password)

        new_user_data = {
            "email": "newuser@gmail.com",
            "password_hash": "StrongPass123",
            "user_type": "Student",
            "first_name": "New",
            "last_name": "User",
        }
        response = self.client.post(self.url, new_user_data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email="newuser@gmail.com").exists())
        created_user = User.objects.get(email="newuser@gmail.com")
        self.assertEqual(created_user.email, new_user_data["email"])
        self.assertEqual(created_user.user_type, new_user_data["user_type"])
        self.assertEqual(response.data["email"], new_user_data["email"])

    def test_admin_create_user_non_admin_forbidden(self):
        """
        Tests that a non-admin user is forbidden from creating a new user.
        """
        self._login_user(self.non_admin_user.email, self.non_admin_password)

        new_user_data = {
            "email": "forbidden@gmail.com",
            "password_hash": "StrongPass123",
            "user_type": "Student",
        }
        response = self.client.post(self.url, new_user_data, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(User.objects.filter(email="forbidden@gmail.com").exists())

    def test_admin_create_user_unauthenticated_unauthorized(self):
        """
        Tests that an unauthenticated user is unauthorized to create a new user.
        """
        new_user_data = {
            "email": "unauth@gmail.com",
            "password_hash": "StrongPass123",
            "user_type": "Student",
        }
        response = self.client.post(self.url, new_user_data, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(User.objects.filter(email="unauth@gmail.com").exists())



    def test_admin_create_user_invalid_data_duplicate_email(self):
        """
        Tests creating a user with an email that is already taken.
        """
        self._login_user(self.admin_user.email, self.admin_password)

        # Create a user with this email first
        User.objects.create(email="duplicate@gmail.com", user_type="Student")

        new_user_data = {
            "email": "duplicate@gmail.com",
            "password_hash": "StrongPass123",
            "user_type": "Student",
        }
        response = self.client.post(self.url, new_user_data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)
        self.assertIn("Email is already taken", response.data["detail"])



    def test_admin_create_user_invalid_data_invalid_user_type(self):
        """
        Tests creating a user with an invalid user_type.
        """
        self._login_user(self.admin_user.email, self.admin_password)

        new_user_data = {
            "email": "invalidtype@gmail.com",
            "password_hash": "StrongPass123",
            "user_type": "InvalidType",  # Invalid user type
        }
        response = self.client.post(self.url, new_user_data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)
        self.assertIn("Invalid user_type value", response.data["detail"])


class AdminGetUsersByTypeTest(APITestCase):
    def setUp(self):
        """Set up admin, student, and instructor users for get_users_by_type tests."""
        self.admin_password = "adminpassword123"
        self.admin_user = User(
            user_id=2025010,
            email="admin_viewer@test.com",
            user_type="Administrator",
        )
        self.admin_user.set_password(self.admin_password)
        self.admin_user.save()

        self.student_user = User(
            user_id=2025011,
            email="student_viewer@test.com",
            user_type="Student",
        )
        self.student_user.set_password("studentpass")
        self.student_user.save()
        
        self.instructor_user = User(
            user_id=2025012,
            email="instructor_viewer@test.com",
            user_type="Instructor",
        )
        self.instructor_user.set_password("instructorpass")
        self.instructor_user.save()

        self.login_url = reverse("login")

    def _login_user(self, email, password):
        """Helper to log in a user."""
        self.client.post(self.login_url, {"email": email, "password": password})

    def test_get_users_as_admin_success(self):
        """
        Tests that an admin can successfully retrieve a list of users.
        """
        self._login_user(self.admin_user.email, self.admin_password)
        url = reverse("admin_get_users_by_type", kwargs={"user_type": "Student"})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["user_id"], self.student_user.user_id)
        self.assertEqual(response.data[0]["user_type"], "Student")

    def test_get_users_as_non_admin_forbidden(self):
        """
        Tests that a non-admin user is forbidden from accessing the view.
        """
        self._login_user(self.student_user.email, "studentpass")
        url = reverse("admin_get_users_by_type", kwargs={"user_type": "Student"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_users_unauthenticated_unauthorized(self):
        """
        Tests that an unauthenticated user is unauthorized to access the view.
        """
        url = reverse("admin_get_users_by_type", kwargs={"user_type": "Student"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_users_invalid_type(self):
        """
        Tests that requesting an invalid user_type returns a 400 Bad Request.
        """
        self._login_user(self.admin_user.email, self.admin_password)
        url = reverse("admin_get_users_by_type", kwargs={"user_type": "InvalidType"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    def test_get_users_case_sensitive(self):
        """
        Tests that the user_type check is case-sensitive.
        """
        self._login_user(self.admin_user.email, self.admin_password)
        url = reverse("admin_get_users_by_type", kwargs={"user_type": "student"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    def test_get_users_empty_result(self):
        """
        Tests that a valid user_type with no users returns an empty list.
        """
        self._login_user(self.admin_user.email, self.admin_password)
        url = reverse("admin_get_users_by_type", kwargs={"user_type": "Librarian"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])


class AdminGetUserCountTest(APITestCase):
    def setUp(self):
        """Set up users for AdminGetUserCountTest."""
        self.admin_password = "adminpassword123"
        self.admin_user = User.objects.create(
            user_id=2025030,
            email="admin_count@test.com",
            user_type="Administrator",
            first_name="Admin",
            last_name="Count",
        )
        self.admin_user.set_password(self.admin_password)
        self.admin_user.save()

        self.student_user = User.objects.create(
            user_id=2025031,
            email="student_count@test.com",
            user_type="Student",
            first_name="Student",
            last_name="One",
            program="BSIT",
        )
        self.student_user.set_password("studentcountpass")
        self.student_user.save()
        
        User.objects.create(
            user_id=2025032,
            email="student_count2@test.com",
            user_type="Student",
            first_name="Student",
            last_name="Two",
            program="BSCS",
        ).set_password("studentcountpass2")


        self.instructor_user = User.objects.create(
            user_id=2025033,
            email="instructor_count@test.com",
            user_type="Instructor",
            first_name="Instructor",
            last_name="One",
        )
        self.instructor_user.set_password("instructorcountpass")
        self.instructor_user.save()

        self.librarian_user = User.objects.create(
            user_id=2025034,
            email="librarian_count@test.com",
            user_type="Librarian",
            first_name="Librarian",
            last_name="One",
        )
        self.librarian_user.set_password("librariancountpass")
        self.librarian_user.save()

        self.login_url = reverse("login")
        
    def _login_user(self, email, password):
        """Helper to log in a user."""
        self.client.post(self.login_url, {"email": email, "password": password})

    def test_get_student_count_as_admin_success(self):
        """
        Tests that an admin can successfully retrieve the student count.
        """
        self._login_user(self.admin_user.email, self.admin_password)
        url = f"/api/admin/get/user-count/student/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # There's the created student_user + potentially other students from other tests
        # We need to filter by only the ones we created in this test.
        expected_student_count = User.objects.filter(user_type="Student").count()
        self.assertEqual(response.data["count"], expected_student_count)

    def test_get_instructor_count_as_admin_success(self):
        """
        Tests that an admin can successfully retrieve the instructor count.
        """
        self._login_user(self.admin_user.email, self.admin_password)
        url = f"/api/admin/get/user-count/instructor/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        expected_instructor_count = User.objects.filter(user_type="Instructor").count()
        self.assertEqual(response.data["count"], expected_instructor_count)

    def test_get_program_count_as_admin_success(self):
        """
        Tests that an admin can successfully retrieve program counts.
        """
        self._login_user(self.admin_user.email, self.admin_password)
        url = f"/api/admin/get/user-count/program/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("programs", response.data)
        
        # We need to account for all students, even those from other test classes
        total_students_bsit = User.objects.filter(user_type="Student", program="BSIT").count()
        total_students_bscs = User.objects.filter(user_type="Student", program="BSCS").count()
        
        programs_data = response.data["programs"]
        
        # Verify BSIT count
        bsit_entry = next((item for item in programs_data if item["program"] == "BSIT"), None)
        self.assertIsNotNone(bsit_entry)
        self.assertEqual(bsit_entry["count"], total_students_bsit)

        # Verify BSCS count
        bscs_entry = next((item for item in programs_data if item["program"] == "BSCS"), None)
        self.assertIsNotNone(bscs_entry)
        self.assertEqual(bscs_entry["count"], total_students_bscs)
        
        # Ensure there are no other programs that we don't expect
        # This might be tricky if other test classes create students with other programs.
        # For this test, we are primarily concerned with the programs we've explicitly added.

    def test_get_user_count_as_non_admin_forbidden(self):
        """
        Tests that a non-admin user is forbidden from accessing the user count view.
        """
        self._login_user(self.student_user.email, "studentcountpass")
        url = f"/api/admin/get/user-count/student/" # Any valid argument_type
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_user_count_unauthenticated_unauthorized(self):
        """
        Tests that an unauthenticated user is unauthorized to access the user count view.
        """
        url = f"/api/admin/get/user-count/student/" # Any valid argument_type
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_user_count_invalid_argument_type(self):
        """
        Tests that an invalid argument_type returns a 400 Bad Request.
        """
        self._login_user(self.admin_user.email, self.admin_password)
        url = f"/api/admin/get/user-count/invalidtype/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)
        self.assertIn("Invalid argument.", response.data["detail"])


class AdminCountViewsTest(APITestCase):
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

        self.login_url = reverse("login")

    def _login_user(self, email, password):
        """Helper to log in a user."""
        self.client.post(self.login_url, {"email": email, "password": password})
        
    # --- Tests for admin course_count view ---
    def test_admin_course_count_success(self):
        """
        Tests that an admin can successfully retrieve the total course count.
        """
        self._login_user(self.admin_user.email, self.admin_password)
        url = "/api/admin/course-count/"
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_admin_course_count_forbidden_for_instructor(self):
        """
        Tests that a non-admin (instructor) is forbidden from getting the total course count.
        """
        self._login_user(self.instructor_user.email, self.instructor_password)
        url = "/api/admin/course-count/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_course_count_unauthenticated(self):
        """
        Tests that an unauthenticated user is unauthorized to get the total course count.
        """
        url = "/api/admin/course-count/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
