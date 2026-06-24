from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from django.db import IntegrityError
from django.core.files.uploadedfile import SimpleUploadedFile
from api.models import (
    User,
    Content,
    Course,
    Section,
    CourseSchoolYear,
    Book,
    Bookshelf,
    CourseRecommendedBook,
    ContentFile,
    Notification,
)


class ContentModelTest(TestCase):
    def setUp(self):
        """Set up the necessary objects for testing Content model."""
        self.instructor = User(email="instructor@test.com", user_type="Instructor")
        self.instructor.set_password("instrpass")
        self.instructor.save()

        self.school_year = CourseSchoolYear.objects.create(school_year="2025-2026")

        self.course = Course.objects.create(
            course_code="CS101",
            course_title="Intro to CS",
            instructor=self.instructor,
            school_year=self.school_year,
        )
        self.section = Section.objects.create(
            course=self.course, section_title="Week 1"
        )

    def test_is_active_with_future_due_date(self):
        """Content is active if its due_date is in the future."""
        future_date = timezone.now() + timedelta(days=5)
        content = Content.objects.create(
            section=self.section,
            content_title="Upcoming Assignment",
            content_type="Activity",
            due_date=future_date,
        )
        self.assertTrue(content.is_active)

    def test_is_active_with_past_due_date(self):
        """Content is not active if its due_date is in the past."""
        past_date = timezone.now() - timedelta(days=1)
        content = Content.objects.create(
            section=self.section,
            content_title="Past Assignment",
            content_type="Activity",
            due_date=past_date,
        )
        self.assertFalse(content.is_active)

    def test_is_active_with_no_due_date(self):
        """Content is active if it has no due_date."""
        content = Content.objects.create(
            section=self.section,
            content_title="Reading Material",
            content_type="File",
            due_date=None,
        )
        self.assertTrue(content.is_active)


class CourseModelTest(TestCase):
    def setUp(self):
        """Set up objects for Course model tests."""
        self.instructor = User(email="course_instructor@test.com", user_type="Instructor")
        self.instructor.set_password("coursepass")
        self.instructor.save()
        self.school_year = CourseSchoolYear.objects.create(school_year="2024-2025")

    def test_course_uniqueness(self):
        """A course must be unique for a given code, school year, and instructor."""
        Course.objects.create(
            course_code="UNIQ202",
            course_title="Unique Course",
            instructor=self.instructor,
            school_year=self.school_year,
        )
        with self.assertRaises(IntegrityError):
            Course.objects.create(
                course_code="UNIQ202",
                course_title="Unique Course",
                instructor=self.instructor,
                school_year=self.school_year,
            )

    def test_clone_course(self):
        """Test the comprehensive cloning of a course."""
        # Arrange: Create a full original course structure
        original_instructor = self.instructor
        new_instructor = User(email="new_instructor@test.com", user_type="Instructor")
        new_instructor.set_password("newpass")
        new_instructor.save()

        # Old and new school years
        latest_school_year = CourseSchoolYear.objects.create(school_year="2025-2026")

        bookshelf = Bookshelf.objects.create(name="Fiction")
        book = Book.objects.create(title="Test Book", recommendation_count=5, bookshelf=bookshelf)

        original_course = Course.objects.create(
            course_code="CLONE101",
            course_title="Course to Clone",
            instructor=original_instructor,
            school_year=self.school_year,
        )
        CourseRecommendedBook.objects.create(course=original_course, book=book)

        original_section = Section.objects.create(
            course=original_course, section_title="Original Section"
        )
        
        dummy_file = SimpleUploadedFile("test_file.txt", b"file_content")
        original_content = Content.objects.create(
            section=original_section,
            content_title="Original Content",
            content_type="File",
        )
        original_content_file = ContentFile.objects.create(content=original_content, file=dummy_file)

        # Act: Clone the course to the new school year with a new instructor
        result = Course.clone_course(
            course_id=original_course.course_id, new_instructor_id=new_instructor.user_id
        )

        # Assert: Check the results
        self.assertTrue(result["success"])
        cloned_course = Course.objects.get(
            course_code="CLONE101", school_year=latest_school_year
        )
        
        # 1. Cloned course attributes
        self.assertEqual(cloned_course.instructor, new_instructor)
        self.assertEqual(cloned_course.school_year, latest_school_year)
        self.assertEqual(cloned_course.course_title, original_course.course_title)

        # 2. Cloned section
        self.assertTrue(cloned_course.section_set.exists())
        cloned_section = cloned_course.section_set.first()
        self.assertEqual(cloned_section.section_title, original_section.section_title)

        # 3. Cloned content
        self.assertTrue(cloned_section.content_set.exists())
        cloned_content = cloned_section.content_set.first()
        self.assertEqual(cloned_content.content_title, original_content.content_title)

        # 4. Cloned content file
        self.assertTrue(cloned_content.files.exists())
        cloned_file = cloned_content.files.first()
        self.assertEqual(cloned_file.file.name, original_content_file.file.name)

        # 5. Cloned recommended book
        self.assertTrue(cloned_course.recommended_books.filter(pk=book.pk).exists())

        # 6. Incremented recommendation count on book
        book.refresh_from_db()
        self.assertEqual(book.recommendation_count, 6)

        # 7. Notification for the new instructor
        self.assertTrue(
            Notification.objects.filter(
                user=new_instructor, title__icontains="Course Cloned"
            ).exists()
        )

class CourseRecommendedBookModelTest(TestCase):
    def setUp(self):
        """Set up objects for CourseRecommendedBook tests."""
        instructor = User(email="rec_instructor@test.com", user_type="Instructor")
        instructor.set_password("recpass")
        instructor.save()

        school_year = CourseSchoolYear.objects.create(school_year="2023-2024")
        bookshelf = Bookshelf.objects.create(name="Non-Fiction")

        self.course = Course.objects.create(
            course_code="REC101",
            course_title="Recommendation Test",
            instructor=instructor,
            school_year=school_year,
        )
        self.book = Book.objects.create(title="Another Test Book", bookshelf=bookshelf)

    def test_recommendation_uniqueness(self):
        """A book recommendation must be unique for a given course."""
        CourseRecommendedBook.objects.create(course=self.course, book=self.book)
        with self.assertRaises(IntegrityError):
            CourseRecommendedBook.objects.create(course=self.course, book=self.book)
