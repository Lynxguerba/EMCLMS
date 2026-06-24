from rest_framework.test import APITestCase
from rest_framework import status
from ..models import User, Course, Section, Content, Enrollment, Grade, CourseSchoolYear


class InstructorGetCourseGradesReportTests(APITestCase):
    def setUp(self):
        # Create School Year
        self.school_year = CourseSchoolYear.objects.create(school_year="2023-2024")

        # Create Instructor
        self.instructor = User.objects.create(
            user_id=1,
            email="instructor@gmail.com",
            password_hash="hash",
            first_name="John",
            last_name="Doe",
            user_type="Instructor",
        )

        # Create Another Instructor
        self.other_instructor = User.objects.create(
            user_id=2,
            email="other@gmail.com",
            password_hash="hash",
            first_name="Jane",
            last_name="Smith",
            user_type="Instructor",
        )

        # Create Student
        self.student = User.objects.create(
            user_id=3,
            email="student@gmail.com",
            password_hash="hash",
            first_name="Alice",
            last_name="Wonderland",
            user_type="Student",
        )

        # Create Course
        self.course = Course.objects.create(
            course_code="CS101",
            course_title="Intro to CS",
            instructor=self.instructor,
            school_year=self.school_year,
        )

        # Create Section
        self.section = Section.objects.create(
            course=self.course, section_title="Week 1", order_in_course=1
        )

        # Create Activity
        self.activity = Content.objects.create(
            section=self.section,
            content_title="Quiz 1",
            content_type="Activity",
            total_score=100,
            order_in_section=1,
        )

        # Enroll Student
        Enrollment.objects.create(student=self.student, course=self.course)

        # Create Grade
        Grade.objects.create(
            content=self.activity,
            user=self.student,
            score=85,
            normalized_score=85.00,
            status="Graded",
        )

        self.url = "/api/instructor/get/course-grades-report/"

    def test_success(self):
        session = self.client.session
        session["user_id"] = self.instructor.user_id
        session.save()

        response = self.client.get(self.url, {"course_id": self.course.course_id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.data
        self.assertEqual(data["course"]["id"], self.course.course_id)
        self.assertEqual(len(data["columns"]), 1)
        self.assertEqual(data["columns"][0]["section_title"], "Week 1")
        self.assertEqual(len(data["students"]), 1)
        self.assertEqual(data["students"][0]["user_id"], self.student.user_id)
        # Note: keys in JSON response might be strings if using integers as keys in dict
        self.assertEqual(
            data["students"][0]["grades"][self.activity.content_id]["score"], 85
        )

    def test_unauthorized(self):
        response = self.client.get(self.url, {"course_id": self.course.course_id})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_forbidden_not_instructor(self):
        session = self.client.session
        session["user_id"] = self.student.user_id
        session.save()

        response = self.client.get(self.url, {"course_id": self.course.course_id})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_forbidden_not_course_owner(self):
        session = self.client.session
        session["user_id"] = self.other_instructor.user_id
        session.save()

        response = self.client.get(self.url, {"course_id": self.course.course_id})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_missing_course_id(self):
        session = self.client.session
        session["user_id"] = self.instructor.user_id
        session.save()

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_course_id(self):
        session = self.client.session
        session["user_id"] = self.instructor.user_id
        session.save()

        response = self.client.get(self.url, {"course_id": 9999})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
