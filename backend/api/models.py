from django.db import models, transaction
from django.contrib.auth.hashers import make_password
from django.contrib.postgres.fields import ArrayField
from django.utils import timezone
from django.core.files.storage import storages
from decimal import Decimal



# Create your models here.
class User(models.Model):
    USER_TYPES = [
        ("Student", "Student"),
        ("Instructor", "Instructor"),
        ("Administrator", "Administrator"),
        ("Librarian", "Librarian"),
        ("Accounting", "Accounting"),
        ("Superadmin", "Superadmin"),
    ]

    PROGRAM_CHOICES = [
        ("AB-Theology", "AB-Theology"),
        ("Master of Divinity programs", "Master of Divinity programs"),
    ]

    user_id = models.BigIntegerField(primary_key=True, editable=False, unique=True)
    email = models.EmailField(unique=True)
    password_hash = models.CharField(max_length=255)
    first_name = models.CharField(max_length=255, blank=True)
    last_name = models.CharField(max_length=255, blank=True)
    user_type = models.CharField(max_length=20, choices=USER_TYPES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    profile_picture = models.ImageField(
        upload_to="profile_pictures/", blank=True, null=True
    )
    program = models.CharField(max_length=255, choices=PROGRAM_CHOICES, blank=True)
    last_online = models.DateTimeField(null=True, blank=True)

    def set_password(self, raw_password):
        self.password_hash = make_password(raw_password)

    def save(self, *args, **kwargs):
        if not self.user_id:
            current_year = timezone.now().year
            with transaction.atomic():  # ensure atomicity
                # lock rows for this year while checking the last user
                last_user = (
                    User.objects.filter(user_id__startswith=str(current_year))
                    .select_for_update()  # prevents race conditions
                    .order_by("-user_id")
                    .first()
                )

                if last_user:
                    self.user_id = last_user.user_id + 1
                else:
                    self.user_id = int(f"{current_year}000")

        super().save(*args, **kwargs)

    class Meta:
        db_table = "users"


class Course(models.Model):
    course_id = models.AutoField(primary_key=True)
    course_code = models.CharField(
        max_length=50,
        null=False,
        blank=False,
    )
    course_title = models.CharField(max_length=255, null=False, blank=False)
    description = models.TextField(blank=True, null=False)
    instructor = models.ForeignKey(
        "User", on_delete=models.CASCADE, null=False, blank=False
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    school_year = models.ForeignKey(
        "CourseSchoolYear",
        on_delete=models.PROTECT,
        null=False,
        blank=False,
        related_name="courses",
        default=1,
    )

    recommended_books = models.ManyToManyField(
        "Book",
        through="CourseRecommendedBook",
        related_name="recommended_in_courses",
        blank=True,
    )

    class Meta:
        db_table = "courses"
        unique_together = (
            "course_code",
            "school_year",
            "instructor",
        )  # <<-- change here

    @classmethod
    def clone_course(cls, course_id: int, new_instructor_id: int = None):
        try:
            with transaction.atomic():
                original_course = cls.objects.select_related("school_year").get(
                    course_id=course_id
                )

                # Determine the instructor for the new course
                instructor_for_clone = original_course.instructor
                if new_instructor_id:
                    try:
                        instructor_for_clone = User.objects.get(
                            user_id=new_instructor_id, user_type="Instructor"
                        )
                    except User.DoesNotExist:
                        raise ValueError("The specified new instructor was not found.")

                # 1. Get latest school year
                latest_school_year = CourseSchoolYear.objects.order_by(
                    "-school_year_id"
                ).first()
                if not latest_school_year:
                    raise ValueError("No school year found.")

                # 2. Clone course
                cloned_course = Course.objects.create(
                    course_code=original_course.course_code,
                    course_title=original_course.course_title,
                    description=original_course.description,
                    instructor=instructor_for_clone,  # Use the determined instructor
                    school_year=latest_school_year,
                )

                # 3. Clone sections
                original_sections = Section.objects.filter(course=original_course)
                section_map = {}  # original_section_id -> cloned_section
                for section in original_sections:
                    cloned_section = Section.objects.create(
                        course=cloned_course,
                        section_title=section.section_title,
                        description=section.description,
                        order_in_course=section.order_in_course,
                        is_completed=False,  # reset completion
                    )
                    section_map[section.section_id] = cloned_section

                # 4. Clone content
                original_contents = Content.objects.filter(
                    section__course=original_course
                )
                content_map = {}  # original_content_id -> cloned_content
                for content in original_contents:
                    cloned_content = Content.objects.create(
                        section=section_map[content.section.section_id],
                        content_title=content.content_title,
                        content_type=content.content_type,
                        due_date=content.due_date,
                        order_in_section=content.order_in_section,
                        content_description=content.content_description,
                        total_score=content.total_score,
                    )
                    content_map[content.content_id] = cloned_content

                # 5. Clone content files (same file path)
                original_files = ContentFile.objects.filter(
                    content__in=original_contents
                )
                for file in original_files:
                    ContentFile.objects.create(
                        content=content_map[file.content.content_id],
                        file=file.file,  # same file path
                    )

                # 6. Clone recommended books
                original_books = CourseRecommendedBook.objects.filter(
                    course=original_course
                )
                for rel in original_books:
                    CourseRecommendedBook.objects.create(
                        course=cloned_course,
                        book=rel.book,
                    )
                    # Increment recommendation count
                    rel.book.recommendation_count += 1
                    rel.book.save(update_fields=["recommendation_count"])

                # 7. Notify the instructor
                title = "Course Cloned for New School Year"
                message = f"The course '{cloned_course.course_title} ({cloned_course.course_code})' has been cloned for the {cloned_course.school_year.school_year} school year. You are assigned as the instructor."
                Notification.objects.create(
                    user=cloned_course.instructor,
                    title=title,
                    message=message,
                    status=Notification.Status.UNREAD,
                )

                return {
                    "success": True,
                    "course_code": cloned_course.course_code,
                    "school_year": cloned_course.school_year.school_year,
                }

        except Course.DoesNotExist:
            return {"success": False, "detail": "Original course not found."}


class CourseSchedule(models.Model):
    DAY_CHOICES = [
        ("Monday", "Monday"),
        ("Tuesday", "Tuesday"),
        ("Wednesday", "Wednesday"),
        ("Thursday", "Thursday"),
        ("Friday", "Friday"),
        ("Saturday", "Saturday"),
        ("Sunday", "Sunday"),
    ]

    schedule_id = models.AutoField(primary_key=True)
    course = models.ForeignKey(
        "Course", on_delete=models.CASCADE, related_name="schedules"
    )
    day_of_week = models.CharField(max_length=10, choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()

    class Meta:
        db_table = "course_schedules"
        ordering = ["day_of_week", "start_time"]


class CourseSchoolYear(models.Model):
    school_year_id = models.AutoField(primary_key=True)
    school_year = models.CharField(max_length=30, unique=True)

    class Meta:
        db_table = "course_school_years"


class Section(models.Model):
    section_id = models.AutoField(primary_key=True)
    course = models.ForeignKey("Course", on_delete=models.CASCADE)
    section_title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    order_in_course = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_completed = models.BooleanField(default=False)

    class Meta:
        db_table = "sections"


class Content(models.Model):
    CONTENT_TYPES = [
        ("Activity", "Activity"),
        ("File", "File"),
        ("Announcement", "Announcement"),
    ]

    content_id = models.AutoField(primary_key=True)
    section = models.ForeignKey("Section", on_delete=models.CASCADE)
    content_title = models.CharField(max_length=255)
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPES)
    due_date = models.DateTimeField(blank=True, null=True)
    order_in_section = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    content_description = models.TextField(blank=True)
    total_score = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )

    @property
    def is_active(self) -> bool:
        """
        Dynamically determine if content is active.
        Active if:
          - No due_date is set, OR
          - due_date is in the future.
        """
        return not self.due_date or self.due_date >= timezone.now()

    class Meta:
        db_table = "content"


class ContentFile(models.Model):
    content = models.ForeignKey(
        "Content", on_delete=models.CASCADE, related_name="files"
    )
    file = models.FileField(upload_to="content_files/", storage=storages["raw"])
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "content_files"


class SubmissionFile(models.Model):
    grade = models.ForeignKey(
        "Grade", on_delete=models.CASCADE, related_name="submission_files"
    )
    file = models.FileField(upload_to="submission_files/", storage=storages["raw"])
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "submission_files"


class Grade(models.Model):
    GRADE_STATUS = [
        ("Pending", "Pending"),
        ("Submitted", "Submitted"),
        ("Graded", "Graded"),
        ("Late", "Late"),
    ]

    grade_id = models.AutoField(primary_key=True)
    content = models.ForeignKey("Content", on_delete=models.CASCADE)
    user = models.ForeignKey("User", on_delete=models.CASCADE)
    score = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    normalized_score = models.DecimalField(
        max_digits=5, decimal_places=2, blank=True, null=True
    )
    feedback = models.TextField(blank=True)
    graded_at = models.DateTimeField(blank=True, null=True)
    submitted_at = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=GRADE_STATUS)

    class Meta:
        db_table = "grades"


class Enrollment(models.Model):

    enrollment_id = models.AutoField(primary_key=True)
    student = models.ForeignKey("User", on_delete=models.CASCADE)
    course = models.ForeignKey("Course", on_delete=models.CASCADE)
    enrollment_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "enrollments"


class PasswordReset(models.Model):
    class Status(models.TextChoices):
        PENDING = "Pending"
        COMPLETED = "Completed"

    password_reset_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )

    class Meta:
        db_table = "password_reset"


class Bookshelf(models.Model):
    bookshelf_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = "bookshelves"


class Book(models.Model):
    no = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255, null=False, default="Unknown Book")
    author = models.CharField(max_length=255, null=False, default="Unknown Author")
    publisher = models.CharField(max_length=255, null=True)
    copyright = models.IntegerField(null=True)
    isbn = models.CharField(max_length=20, unique=True, null=True)
    copy = models.IntegerField(null=False, default=1)
    recommendation_count = models.IntegerField(default=0)
    file_path = models.FileField(
        upload_to="ebooks/",
        blank=True,
        null=True,
        storage=storages["raw"]
    )
    bookshelf = models.ForeignKey(
        "Bookshelf",
        on_delete=models.SET_NULL,
        null=True,
        related_name="books",
        default=1,
    )
    embedding = ArrayField(
        models.FloatField(),
        blank=True,
        null=True,
        help_text="Precomputed sentence embedding for semantic search.",
    )

    class Meta:
        db_table = "books"
        unique_together = ("title", "author")


class CourseRecommendedBook(models.Model):
    id = models.AutoField(primary_key=True)
    course = models.ForeignKey("Course", on_delete=models.CASCADE)
    book = models.ForeignKey("Book", on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "course_recommended_books"
        unique_together = ("course", "book")


class Notification(models.Model):
    class Status(models.TextChoices):
        UNREAD = "Unread", "Unread"
        READ = "Read", "Read"

    notification_id = models.AutoField(primary_key=True)

    user = models.ForeignKey(
        "User", on_delete=models.CASCADE, related_name="notifications"
    )

    title = models.CharField(max_length=255)

    message = models.TextField(blank=True)

    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.UNREAD
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"


class StudentLog(models.Model):
    log_id = models.AutoField(primary_key=True)
    student = models.ForeignKey(
        "User", on_delete=models.SET_NULL, null=True, blank=True
    )
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "student_logs"


class InstructorLog(models.Model):
    log_id = models.AutoField(primary_key=True)
    instructor = models.ForeignKey(
        "User", on_delete=models.SET_NULL, null=True, blank=True
    )
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "instructor_logs"


class RegistrationRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "Pending", "Pending"
        APPROVED = "Approved", "Approved"
        REJECTED = "Rejected", "Rejected"

    id = models.AutoField(primary_key=True)
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )
    requested_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "registration_requests"
        ordering = ["-requested_at"]


class BorrowRecord(models.Model):
    class Status(models.TextChoices):
        BORROWED = "Borrowed", "Borrowed"
        RETURNED = "Returned", "Returned"
        OVERDUE = "Overdue", "Overdue"
        LOST = "Lost", "Lost"

    class BookCondition(models.TextChoices):
        EXCELLENT = "excellent", "Excellent - Like new"
        GOOD = "good", "Good - Normal wear"
        FAIR = "fair", "Fair - Noticeable wear"
        POOR = "poor", "Poor - Damaged"

    borrow_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        "User", on_delete=models.CASCADE, related_name="borrow_records"
    )
    book = models.ForeignKey(
        "Book", on_delete=models.CASCADE, related_name="borrow_records"
    )
    borrow_date = models.DateTimeField(auto_now_add=True)
    due_date = models.DateTimeField()
    return_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.BORROWED
    )
    book_condition = models.CharField(
        max_length=20, choices=BookCondition.choices, blank=True, null=True
    )
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "borrow_records"
        ordering = ["-borrow_date"]


class BookRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "Pending", "Pending"
        APPROVED = "Approved", "Approved"

    request_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        "User", on_delete=models.CASCADE, related_name="book_requests"
    )
    book = models.ForeignKey(
        "Book", on_delete=models.CASCADE, related_name="book_requests"
    )
    request_date = models.DateTimeField(auto_now_add=True)
    reason = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )

    class Meta:
        db_table = "book_requests"
        ordering = ["-request_date"]


class AccountingFee(models.Model):
    fee_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, default="Active")
    color = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "accounting_fees"


class StudentBalance(models.Model):
    student = models.OneToOneField(
        "User", on_delete=models.CASCADE, related_name="balance"
    )
    outstanding_balance = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "student_balances"


class StudentTransaction(models.Model):
    TRANSACTION_TYPES = [
        ("Charge", "Charge"),
        ("Payment", "Payment"),
    ]
    transaction_id = models.AutoField(primary_key=True)
    student = models.ForeignKey(
        "User", on_delete=models.CASCADE, related_name="transactions"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    remaining_balance = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0.00")
    )
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    category = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_transactions",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_voided = models.BooleanField(default=False)
    void_reason = models.TextField(blank=True, null=True)
    voided_at = models.DateTimeField(null=True, blank=True)
    voided_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="voided_transactions",
    )

    def save(self, *args, **kwargs):
        # Set remaining_balance equal to amount on first save for Charges
        if not self.pk and self.transaction_type == "Charge":
            self.remaining_balance = self.amount
        super().save(*args, **kwargs)

    class Meta:
        db_table = "student_transactions"
        ordering = ["-created_at"]


class TransactionAllocation(models.Model):
    allocation_id = models.AutoField(primary_key=True)
    payment = models.ForeignKey(
        StudentTransaction, on_delete=models.CASCADE, related_name="allocations_from"
    )
    # If this is a reallocation, source_payment tracks the original credit transaction
    source_payment = models.ForeignKey(
        StudentTransaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reallocations_provided"
    )
    charge = models.ForeignKey(
        StudentTransaction, on_delete=models.CASCADE, related_name="allocations_to"
    )
    amount_allocated = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "student_transaction_allocations"


class FileDownload(models.Model):
    download_id = models.AutoField(primary_key=True)
    content = models.ForeignKey("Content", on_delete=models.CASCADE, related_name="downloads")
    user = models.ForeignKey("User", on_delete=models.CASCADE, related_name="downloads")
    downloaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "file_downloads"
        unique_together = ("content", "user") # Track unique students per content


class BookAccess(models.Model):
    access_id = models.AutoField(primary_key=True)
    book = models.ForeignKey("Book", on_delete=models.CASCADE, related_name="accesses")
    user = models.ForeignKey("User", on_delete=models.CASCADE, related_name="book_accesses")
    accessed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "book_accesses"
        # We don't use unique_together here because we might want to track over time, 
        # but we will handle abuse prevention in the view/query.


class FailedLoginAttempt(models.Model):
    email = models.EmailField(unique=True)
    failures = models.IntegerField(default=0)
    last_attempt = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "failed_login_attempts"



# Signals for Automated Balance and Notification Management
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def create_student_balance(sender, instance, created, **kwargs):
    """Automatically create a StudentBalance record for new students."""
    if created and instance.user_type == "Student":
        StudentBalance.objects.get_or_create(student=instance)