from django.test import TestCase
from api.models import (
    User,
    Content,
    Course,
    Section,
    CourseSchoolYear,
    Enrollment,
    Grade,
    PasswordReset,
    StudentLog,
    InstructorLog,
)

class SmokeTestModels(TestCase):
    def setUp(self):
        """Set up objects for smoke tests."""
        self.student = User(email="student_smoke@test.com", user_type="Student")
        self.student.set_password("studentpass")
        self.student.save()

        self.instructor = User(email="instructor_smoke@test.com", user_type="Instructor")
        self.instructor.set_password("instrpass")
        self.instructor.save()
        
        school_year = CourseSchoolYear.objects.create(school_year="2022-2023")
        course = Course.objects.create(
            course_code="SMOKE101",
            course_title="Smoke Test Course",
            instructor=self.instructor,
            school_year=school_year,
        )
        section = Section.objects.create(course=course, section_title="Smoke Section")
        self.content = Content.objects.create(section=section, content_title="Smoke Content", content_type="Activity")

    def test_simple_model_creation(self):
        """Smoke test to ensure simple models can be created."""
        enrollment = Enrollment.objects.create(student=self.student, course=self.content.section.course)
        self.assertIsNotNone(enrollment.pk)

        grade = Grade.objects.create(content=self.content, user=self.student, status="Pending")
        self.assertIsNotNone(grade.pk)

        password_reset = PasswordReset.objects.create(user=self.student)
        self.assertIsNotNone(password_reset.pk)

        student_log = StudentLog.objects.create(student=self.student, message="Logged in.")
        self.assertIsNotNone(student_log.pk)

        instructor_log = InstructorLog.objects.create(instructor=self.instructor, message="Created course.")
        self.assertIsNotNone(instructor_log.pk)
