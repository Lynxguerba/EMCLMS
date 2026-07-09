import sys
import os
import django
import random
from django.db import connection
from django.utils import timezone
from faker import Faker
from django.contrib.auth.hashers import make_password
from django.contrib.postgres.fields import ArrayField


# --- Existing Setup and Helper Functions ---
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from api.models import (
    PasswordReset,
    User,
    Course,
    Section,
    Content,
    Enrollment,
    Grade,
    Book,
    CourseSchoolYear,
    Bookshelf,
    CourseRecommendedBook,
    Notification,
    StudentLog,
    InstructorLog,
    BookRequest,
    BorrowRecord,
    BorrowRecord,
    RegistrationRequest,
    AccountingFee,
    StudentBalance,
    StudentTransaction,
    TransactionAllocation,
)

faker = Faker()


def reset_sequence_for_model(model):
    with connection.cursor() as cursor:
        table = model._meta.db_table
        pk = model._meta.pk.column
        seq = None
        try:
            cursor.execute(f"SELECT pg_get_serial_sequence('{table}', '{pk}')")
            row = cursor.fetchone()
            if row:
                seq = row[0]
        except Exception:
            # Likely not using PostgreSQL or pg_get_serial_sequence failed
            pass
            
        if seq:
            cursor.execute(f"ALTER SEQUENCE {seq} RESTART WITH 1")
        model.objects.all().delete()


# --- Existing Seeder Functions (copied for completeness) ---
def seed_users():
    User.objects.all().delete()

    instructor_names = [
        "Dr. Kris Jeongme Lee",
        "Mrs Leah Bañez",
        "Mrs Marie Prime Antonio",
        "Sir Galileo Antonio",
        "Ms. Lenimarie O. Rodriguez",
    ]

    for full_name in instructor_names:
        name_parts = full_name.strip().split()
        filtered_parts = [
            p
            for p in name_parts
            if "." not in p
            and p.lower() not in ["rev", "dr", "mrs", "ms", "sir", "pastor"]
        ]

        first_name = filtered_parts[0] if len(filtered_parts) > 0 else ""
        last_name = " ".join(filtered_parts[1:]) if len(filtered_parts) > 1 else ""

        random_number = random.randint(1000, 9999) - 1
        email = f"{first_name.lower()}.{last_name.replace(' ', '').lower()}{random_number}@gmail.com"

        user = User.objects.create(
            email=email,
            first_name=first_name,
            last_name=last_name,
            user_type="Instructor",
            program="",
        )
        user.set_password("asd123ASD")
        user.save()

    student_programs = ["AB-Theology", "Master of Divinity programs"]

    student_data = [
        ["ADIM", "CHRIS", "Macalunas", "", "Female", "2024-001"],
        ["AGUIRRE", "RHEABEL", "ADAS", "", "Female", "2024-002"],
        ["ANDI", "JETRIEL", "Awe", "", "Female", "2024-003"],
        ["ANDI", "JOMARI", "Awe", "", "Male", "2024-004"],
        ["ATIENZA", "ESTHER MAY", "Gevero", "", "Female", "2024-005"],
        ["ATIENZA", "KENNETH JAY", "GEVERO", "", "Male", "2024-006"],
        ["BABANTO", "JOSEPH JOEL", "Sarmiento", "", "Male", "2024-007"],
        ["BABANTO", "MERIAM JEAN", "Sarmiento", "", "Female", "2024-008"],
        ["BASADRE", "FEBE", "C", "", "Female", "2024-009"],
        ["DENOLAN", "GENHEIZ KATE", "", "", "Female", "2024-010"],
        ["DINGCONG", "LOVELY ROSE", "Soterio", "", "Female", "2024-011"],
        ["DULANGAN", "JERAPHY", "DONDING", "", "Male", "2024-012"],
        ["DUMALAT", "KARL VINCENT", "", "", "Male", "2024-013"],
        ["ESPINOSA", "SHANE", "Florenosos", "", "Female", "2024-014"],
        ["ESMANI", "JULAIZA", "OCLAO", "", "Female", "2024-015"],
        ["GLORAN", "JONELYN", "MANGGAY", "", "Female", "2024-016"],
        ["GULADA", "RYAN REY", "", "", "Male", "2024-017"],
        ["MANLATAS", "JAN-JAN", "Dag-um", "", "Male", "2024-018"],
    ]

    for student in student_data:
        last_name, first_name, middle_name, ext_name, sex, student_id = student

        random_number = random.randint(100, 999)
        email = f"{first_name.lower().replace(' ', '')}.{last_name.lower()}{random_number}@gmail.com"
        program = random.choice(student_programs)

        user = User.objects.create(
            email=email,
            first_name=first_name,
            last_name=last_name,
            user_type="Student",
            program=program,
        )
        user.set_password("asd123ASD")
        user.save()

    admin_user = User.objects.create(
        email="admin@gmail.com",
        first_name="System",
        last_name="Administrator",
        user_type="Administrator",
        program="",
    )
    admin_user.set_password("asd123ASD")
    admin_user.save()

    librarian_user = User.objects.create(
        email="librarian@gmail.com",
        first_name="Library",
        last_name="Manager",
        user_type="Librarian",
        program="",
    )
    librarian_user.set_password("asd123ASD")
    librarian_user.save()
    
    accounting_user = User.objects.create(
        email="accounting@gmail.com",
        first_name="Finance",
        last_name="Staff",
        user_type="Accounting",
        program="",
    )
    accounting_user.set_password("asd123ASD")
    accounting_user.save()

    superadmin_user = User.objects.create(
        email="superadmin@gmail.com",
        first_name="System",
        last_name="Superadmin",
        user_type="Superadmin",
        program="",
    )
    superadmin_user.set_password("asd123ASD")
    superadmin_user.save()

    print("✅ Users seeded")


def seed_courses():
    reset_sequence_for_model(Course)
    instructors = list(User.objects.filter(user_type="Instructor"))
    school_years = list(CourseSchoolYear.objects.all())
    courses = []

    course_data = [
        # Semester 1
        (
            "GE101",
            "Arts Appreciation",
            "Explores visual, performing, and literary arts to deepen appreciation of Filipino and global creativity.",
            3,
        ),
        (
            "GE102",
            "Contemporary World",
            "Examines global issues and perspectives in the context of globalization and modern society.",
            3,
        ),
        (
            "GE103",
            "Mathematics in the Modern World",
            "Applies mathematical tools to real-world problems and everyday decision-making.",
            3,
        ),
        (
            "GE104",
            "Science, Technology, Society",
            "Discusses the interplay between science, technology, and social change.",
            3,
        ),
        (
            "GE105",
            "The Life and Work of Rizal",
            "A study of José Rizal’s life, works, and writings and their impact on Philippine history.",
            3,
        ),
        (
            "GE106",
            "Apologetics (GE Elective 1)",
            "Equips students to rationally defend the Christian faith and worldview.",
            3,
        ),
        (
            "GE107",
            "Christian Worldview (GE Elective 2)",
            "Examines major tenets of a Christian worldview in contrast to secular philosophies.",
            3,
        ),
        (
            "PE101",
            "PE 1",
            "Introduction to physical fitness and basic movement skills.",
            2,
        ),
        (
            "NSTP101",
            "NSTP 1",
            "National Service Training Program focused on civic welfare and military training.",
            3,
        ),
        # Semester 2
        (
            "GE201",
            "Ethics 1",
            "Explores ethical theories and principles and how they apply in real-life moral decisions.",
            3,
        ),
        (
            "GE202",
            "Readings in Philippine History",
            "Analyzes primary sources in Philippine history to promote critical understanding.",
            3,
        ),
        (
            "GE203",
            "Purposive Communication",
            "Focuses on writing, speaking, and presenting ideas clearly for academic and professional contexts.",
            3,
        ),
        (
            "GE204",
            "Understanding the Self",
            "Introduces concepts from psychology, sociology, and philosophy to understand self and identity.",
            3,
        ),
        (
            "GE205",
            "Youth Ministry (GE Elective 3)",
            "Equips students to minister to and mentor young people in church and community settings.",
            3,
        ),
        (
            "PT101",
            "Practical Theology",
            "Engages in contextual ministry practices including preaching, worship, and discipleship.",
            2,
        ),
        (
            "PE102",
            "PE 2",
            "Continuation of physical education with focus on team and recreational sports.",
            2,
        ),
        (
            "NSTP102",
            "NSTP 2",
            "Second part of the National Service Training Program emphasizing implementation and reflection.",
            3,
        ),
    ]

    if not school_years:
        print("⚠️ No school years found. Run seed_course_school_years first.")
        return

    if instructors:
        for i, (code, title, desc, units) in enumerate(course_data):
            course = Course(
                course_code=code,
                course_title=f"{title} ({units} units)",
                description=desc,
                instructor=instructors[i % len(instructors)],
                school_year=school_years[i % len(school_years)],
            )
            courses.append(course)
    else:
        print("⚠️ No instructors found. Aborting course seeding.")
        return

    Course.objects.bulk_create(courses)
    print("✅ Courses seeded")


def seed_course_school_years():
    reset_sequence_for_model(CourseSchoolYear)
    school_year_data = [
        "2026-2027 1st semester",
    ]
    school_years = []
    for sy in school_year_data:
        school_years.append(CourseSchoolYear(school_year=sy))

    CourseSchoolYear.objects.bulk_create(school_years)
    print(f"✅ {len(school_years)} CourseSchoolYear records seeded")


def seed_enrollments():
    reset_sequence_for_model(Enrollment)

    students = list(User.objects.filter(user_type="Student"))
    courses = list(Course.objects.all())
    enrollments = []

    if not students:
        print("⚠️ No students found to enroll.")
        return

    if not courses:
        print("⚠️ No courses available for enrollment.")
        return

    for student in students:
        num_courses = random.randint(1, len(courses))
        selected_courses = random.sample(courses, num_courses)

        for course in selected_courses:
            enrollments.append(
                Enrollment(
                    student=student,
                    course=course,
                )
            )

    Enrollment.objects.bulk_create(enrollments)
    print(
        f"✅ Enrolled {len(students)} students with {len(enrollments)} total enrollments"
    )


def seed_sections():
    reset_sequence_for_model(Section)
    courses = Course.objects.all()
    sections = []

    # Hardcoded section data for specific courses
    course_section_map = {
        "GE101": [
            {
                "title": "Foundations: What is Art?",
                "desc": "Explore the fundamental principles, elements, and purposes of art across cultures.",
            },
            {
                "title": "Journey Through Philippine Artistry",
                "desc": "A deep dive into the rich tapestry of Filipino art, from pre-colonial to contemporary forms.",
            },
            {
                "title": "Global Art Movements and Their Impact",
                "desc": "Travel through major art movements like the Renaissance, Impressionism, and Modernism, and analyze their global influence.",
            },
            {
                "title": "Final Project: Virtual Exhibition Curation",
                "desc": "Apply your knowledge by conceptualizing and designing a virtual art exhibition with a chosen theme.",
            },
        ],
        "GE102": [
            {
                "title": "The Global Economy: Structures and Divides",
                "desc": "Analyze the economic structures defining globalization and examine the persistent North-South divide.",
            },
            {
                "title": "A World of Ideas: Cultural and Media Flows",
                "desc": "Investigate the global circulation of ideas, media, and the challenges of cultural homogenization.",
            },
            {
                "title": "People on the Move: Global Migration & Demographics",
                "desc": "Discuss the dynamics of global population shifts, migration patterns, and the future of urbanization.",
            },
            {
                "title": "Final Debate: The Ethics of Globalization",
                "desc": "Engage in a structured debate on the ethical dilemmas and future opportunities of our interconnected world.",
            },
        ],
        "GE103": [
            {
                "title": "Patterns in Nature: The Mathematics of Our World",
                "desc": "Discover mathematical patterns in nature, from the Fibonacci sequence in flowers to the fractal geometry of coastlines.",
            },
            {
                "title": "Financial Literacy: Mathematics for a Secure Future",
                "desc": "Learn practical mathematical tools for budgeting, loans, interest, and long-term investment.",
            },
            {
                "title": "Data and Deception: The Power of Statistics",
                "desc": "An introduction to statistical analysis, data visualization, and how to critically interpret data presented in media.",
            },
            {
                "title": "Case Study: Real-World Mathematical Modeling",
                "desc": "Apply mathematical modeling techniques to analyze and propose solutions for a practical, real-world problem.",
            },
        ],
        "GE104": [
            {
                "title": "Introduction to STS: A New Way of Seeing",
                "desc": "Understand the core concepts of Science, Technology, and Society and how they are interconnected.",
            },
            {
                "title": "Historical Revolutions: From Copernicus to the Computer",
                "desc": "Explore key scientific and technological revolutions that have shaped human history and society.",
            },
            {
                "title": "The Digital Age: Society, Ethics, and Information",
                "desc": "Analyze the social and ethical impacts of the internet, social media, and artificial intelligence.",
            },
             {
                "title": "Final Project: Tech-Solution for a Social Problem",
                "desc": "Propose a technology-based solution to a pressing social issue, considering both its benefits and ethical implications.",
            },
        ]
    }

    for course in courses:
        section_details = course_section_map.get(
            course.course_code,
            [
                {
                    "title": f"Week 1: Introduction to {course.course_title}",
                    "desc": "An overview of the course objectives and foundational concepts.",
                },
                {
                    "title": f"Week 2: Core Principles",
                    "desc": "Exploring the central theories and ideas of the subject.",
                },
                {
                    "title": f"Week 3: Advanced Topics",
                    "desc": "Delving into more complex and specialized areas.",
                },
                {
                    "title": f"Week 4: Final Assessment",
                    "desc": "Review and final examination or project work.",
                },
            ],
        )

        for index, detail in enumerate(section_details):
            sections.append(
                Section(
                    course=course,
                    section_title=detail["title"],
                    description=detail["desc"],
                    order_in_course=index + 1,
                )
            )

    Section.objects.bulk_create(sections)
    print("✅ Sections seeded")


def seed_content():
    reset_sequence_for_model(Content)
    sections = Section.objects.all()
    contents = []

    # Hardcoded content data for specific sections
    section_content_map = {
        # --- GE101: Arts Appreciation ---
        "Foundations: What is Art?": [
            {"type": "Announcement", "title": "Welcome to the World of Art!", "desc": "Let's begin our journey. Please review the module syllabus and introduce yourself in the forums."},
            {"type": "File", "title": "Reading: The Language of Art", "desc": "A foundational text on the elements (line, shape, color) and principles (balance, rhythm) of design."},
            {"type": "Graded Activity", "title": "Analysis: The Elements in Practice", "desc": "Analyze three provided paintings and identify the core artistic elements used by the artists.", "score": 25},
            {"type": "Graded Activity", "title": "Forum Discussion: What is 'Good' Art?", "desc": "Participate in a forum discussing the subjective and objective measures of artistic quality.", "score": 10},
        ],
        "Journey Through Philippine Artistry": [
            {"type": "Announcement", "title": "Let's Explore Filipino Creativity!", "desc": "This week, we celebrate the diverse artistry of the Philippines, from ancient to modern times."},
            {"type": "File", "title": "Video: The Master Weavers of Ifugao", "desc": "A documentary on the intricate processes and cultural significance of Ifugao weaving traditions."},
            {"type": "File", "title": "Gallery: Contemporary Filipino Sculptors", "desc": "A curated collection of works from leading contemporary sculptors in the Philippines."},
            {"type": "Graded Activity", "title": "Case Study: The Symbolism of T'nalak", "desc": "Write a short essay on the cultural and spiritual symbolism embedded in T'nalak weaving.", "score": 30},
        ],
        # --- GE102: The Contemporary World ---
        "The Global Economy: Structures and Divides": [
            {"type": "Announcement", "title": "Understanding Our Globalized Economy", "desc": "This module tackles the complex web of global economics. Let's get started!"},
            {"type": "File", "title": "Reading: The World is Flat (Excerpt)", "desc": "An excerpt from Thomas Friedman's book on the forces flattening the global economic playing field."},
            {"type": "Graded Activity", "title": "Case Study Analysis: The Global North-South Divide", "desc": "Analyze provided data and write a report on the economic disparities between the Global North and South.", "score": 40},
            {"type": "Graded Activity", "title": "Quiz: Key Economic Concepts", "desc": "A multiple-choice quiz covering key terms like GDP, IMF, and World Bank.", "score": 15},
        ],
        # --- GE103: Mathematics in the Modern World ---
        "Patterns in Nature: The Mathematics of Our World": [
            {"type": "Announcement", "title": "Mathematics is Everywhere!", "desc": "Prepare to see the world through a mathematical lens. It's more beautiful than you think!"},
            {"type": "File", "title": "Reading: Nature's Numbers by Ian Stewart", "desc": "An excerpt from Chapter 1 discussing the ubiquitous patterns found in the natural world."},
            {"type": "Graded Activity", "title": "Photo Hunt: Fibonacci in Your Environment", "desc": "Find and photograph three examples of the Fibonacci sequence in your home or community. Submit them with a brief explanation.", "score": 20},
            {"type": "Graded Activity", "title": "Problem Set: Fractal Geometry", "desc": "Complete a set of problems related to simple fractal generation and properties.", "score": 25},
        ],
         "Financial Literacy: Mathematics for a Secure Future": [
            {"type": "Announcement", "title": "Mastering Your Money", "desc": "This unit provides the mathematical tools you need for a financially secure future."},
            {"type": "File", "title": "Spreadsheet Template: Personal Budget Planner", "desc": "An Excel template to help you track your income and expenses."},
            {"type": "Graded Activity", "title": "Practical Exercise: Budgeting for the Future", "desc": "Create a detailed one-month personal budget based on a given scenario. Justify your spending and savings decisions.", "score": 35},
            {"type": "Graded Activity", "title": "Quiz: Simple and Compound Interest", "desc": "Solve a series of problems involving interest calculations for loans and investments.", "score": 20},
        ],
    }

    for section in sections:
        content_details = section_content_map.get(
            section.section_title,
            [
                {
                    "type": "Announcement",
                    "title": f"Getting Started with {section.section_title}",
                    "desc": "Here is the introductory material for this section.",
                },
                {
                    "type": "File",
                    "title": "Core Reading Material",
                    "desc": "Please download and read the attached document.",
                },
                {
                    "type": "Graded Activity",
                    "title": "Check-in Quiz",
                    "desc": "A short quiz to test your understanding of the initial concepts.",
                    "score": 10,
                },
            ],
        )

        for i, detail in enumerate(content_details):
            due_date = None
            total_score = None
            # The user wants more graded activities, so let's use "Graded Activity"
            # The model supports "Activity", so we will use that and just name it Graded Activity in the title
            content_type = "Activity" if detail["type"] == "Graded Activity" else detail["type"]

            if content_type == "Activity":
                due_date = timezone.now() + timezone.timedelta(
                    days=random.randint(5, 20)
                )
                total_score = detail.get("score", 0)

            contents.append(
                Content(
                    section=section,
                    content_title=detail["title"],
                    content_type=content_type,
                    content_description=detail["desc"],
                    order_in_section=i + 1,
                    due_date=due_date,
                    total_score=total_score,
                )
            )

    Content.objects.bulk_create(contents)
    print("✅ Content seeded with improved detail")


def seed_grades():
    reset_sequence_for_model(Grade)
    grades = []
    activities = Content.objects.filter(content_type="Activity")
    enrollments = Enrollment.objects.select_related("student", "course").all()

    enrollment_map = {}
    for enrollment in enrollments:
        if enrollment.course_id not in enrollment_map:
            enrollment_map[enrollment.course_id] = []
        enrollment_map[enrollment.course_id].append(enrollment.student)

    for activity in activities:
        course_id = activity.section.course_id
        students_in_course = enrollment_map.get(course_id, [])

        for student in students_in_course:
            # Initialize default values
            status = "Pending"
            score, normalized_score, feedback, submitted_at, graded_at = (
                None,
                None,
                "",
                None,
                None,
            )

            # Decide if the student submits the activity (85% chance of submission)
            if random.random() < 0.85:
                # Student submits. Determine if late or on time.
                submission_lag = random.uniform(-3, 3)  # Can be 3 days early or late
                submitted_at = (
                    activity.due_date + timezone.timedelta(days=submission_lag)
                    if activity.due_date
                    else timezone.now()
                )

                is_late = activity.due_date and submitted_at > activity.due_date
                status = "Late" if is_late else "Submitted"

                # Decide if the submitted work gets graded (70% chance of being graded)
                if random.random() < 0.70:
                    status = "Graded"
                    graded_at = submitted_at + timezone.timedelta(
                        days=random.randint(1, 5)
                    )

                    # Generate score
                    performance = random.uniform(0.55, 1.0)  # 55% to 100%
                    if is_late:
                        performance *= 0.9  # 10% penalty for being late
                        feedback = "Submitted late. "

                    score = round(float(activity.total_score) * performance, 2)
                    normalized_score = (
                        round((score / float(activity.total_score)) * 100, 2)
                        if activity.total_score and activity.total_score > 0
                        else 0
                    )

                    # Generate feedback based on performance
                    if performance > 0.9:
                        feedback += "Excellent work! Keep it up."
                    elif performance > 0.75:
                        feedback += "Good effort. Solid understanding of the material."
                    else:
                        feedback += "There are areas for improvement. Please review the feedback and course materials."
            # If not submitted, status remains 'Pending'
            
            grades.append(
                Grade(
                    content=activity,
                    user=student,
                    score=score,
                    normalized_score=normalized_score,
                    feedback=feedback.strip(),
                    status=status,
                    submitted_at=submitted_at,
                    graded_at=graded_at,
                )
            )

    Grade.objects.bulk_create(grades)
    print("✅ Grades seeded with corrected logic")


def seed_password_resets():
    reset_sequence_for_model(PasswordReset)
    all_users = list(User.objects.all())

    # Create password reset requests for a few random users, simulating real requests
    num_resets = random.randint(3, min(7, len(all_users)))
    selected_users = random.sample(all_users, num_resets)

    password_resets_to_create = []
    for user in selected_users:
        password_resets_to_create.append(
            PasswordReset(
                user=user,
                status=random.choice(
                    [PasswordReset.Status.PENDING, PasswordReset.Status.COMPLETED]
                ),
                created_at=timezone.now()
                - timezone.timedelta(days=random.randint(1, 30)),
                updated_at=(
                    timezone.now()
                    if random.random() < 0.5
                    else timezone.now() - timezone.timedelta(days=random.randint(1, 10))
                ),
            )
        )
    PasswordReset.objects.bulk_create(password_resets_to_create)
    print("✅ Password resets seeded")



def seed_bookshelves():
    reset_sequence_for_model(Bookshelf)
    
    bookshelf_data = [
        {"bookshelf_id": 1, "name": "Theology"},
        {"bookshelf_id": 2, "name": "Philosophy"},
        {"bookshelf_id": 3, "name": "History"},
        {"bookshelf_id": 4, "name": "Fiction"},
        {"bookshelf_id": 5, "name": "Science"},
    ]
    
    bookshelves_to_create = []
    for data in bookshelf_data:
        bookshelves_to_create.append(Bookshelf(bookshelf_id=data["bookshelf_id"], name=data["name"]))
    
    Bookshelf.objects.bulk_create(bookshelves_to_create)
    print(f"✅ {len(bookshelves_to_create)} bookshelves seeded.")


# --- New Book Seeder Function ---
def seed_books():
    reset_sequence_for_model(Book)
    books = []

    # Fetch all available bookshelves
    bookshelves = {b.name: b for b in Bookshelf.objects.all()}
    if not bookshelves:
        print("⚠️ No bookshelves found. Run seed_bookshelves first.")
        return

    book_data = [
        (
            "The Christian Doctrine of the Church, Faith, and the Consummation",
            "Emil Brunner",
            "Wipf & Stock",
            1960,
            "978-1-4982-0530-6",
            1,
            0,
            "Theology",
            None,
        ),
        (
            "Historical Criticism and Theological Interpretation of Scripture",
            "Peter Stuhlmacher",
            "Fortress Press",
            None,
            None,
            1,
            0,
            "Theology",
            None,
        ),
        (
            "The Trinity Guide to Eschatology",
            "William J. La Due",
            "Continuum",
            2004,
            "0-8264-1608-x",
            1,
            0,
            "Theology",
            None,
        ),
        (
            "Journal of Biblical and Pheumatological Research",
            "Paul Elbert",
            "Wipf and Stock Publishers",
            2012,
            "978-1-62032-562-9",
            1,
            0,
            "Theology",
            None,
        ),
        (
            "The Religious Context and Early Christianity: A Guide to Graeco-Roman Religions",
            "Hans – Josef Klauck",
            "Fortress Press",
            2003,
            "0-8006-3593-0",
            1,
            0,
            "History",
            None,
        ),
        (
            "Body of Divinity",
            "Thomas Watson",
            "Baker Book House",
            1979,
            "0-8010-9615-4",
            1,
            0,
            "Theology",
            None,
        ),
        (
            "Elements of Homiletic: A Method for Preparing to Preach",
            "O.C. Edwards",
            "Pueblo Publishing Company",
            1982,
            "0-916134-55-5",
            1,
            0,
            "Theology",
            None,
        ),
        (
            "John",
            "Robert W. Yarbrough",
            "Wipf & Stock",
            1991,
            "978-1-61097-395-3",
            1,
            0,
            "Theology",
            None,
        ),
        (
            "The Logic of Evangelism",
            "William J. Abraham",
            "Wm. B. Eerdmans Publishing Co.",
            1989,
            "0-8028-0433-0",
            1,
            5,
            "Theology",
            None,
        ),
        (
            "Jewish Backgrounds of the New Testament",
            "J. Julius Scott",
            "Baker Academic",
            1995,
            "978-0-8010-2240-1",
            1,
            4,
            "History",
            None,
        ),
        (
            "Prophets and Wise",
            "William McKane",
            "SCM Press Ltd",
            1965,
            None,
            1,
            6,
            "Theology",
            None,
        ),
        (
            "A Spiritual Formation Workbook: Small Group Resources for Nurturing Christian Growth",
            "James Bryan Smith and Richard J. Foster",
            "HarperSanFrancisco",
            1993,
            "0-06-066965-9",
            1,
            1,
            "Theology",
            None,
        ),
        (
            "Missionary of Reconciliation : The Role of the Doctrine of Reconciliation in the Preaching of Bishop Festo Kivengere of Uganda between 1971-1988",
            "Alfred Olwa",
            "Langham Monographs",
            2013,
            "978-1-7836-993-4",
            1,
            7,
            "Theology",
            None,
        ),
        (
            "Theology in Missionary Perspective : Lesslie Newbigin’s Legacy",
            "Mark T.B. Laing and Paul Weston",
            "Pickwick Publications",
            2012,
            "978-1-61097-574-2",
            1,
            0,
            "Theology",
            None,
        ),
        (
            "Introducing Catholic Theology : Interpreting Jesus",
            "Gerald O’Collins",
            "Cassel Ltd",
            1983,
            "0-225-66357-0",
            1,
            0,
            "Theology",
            None,
        ),
        (
            "The People of God : Essay on the Believer’s Church",
            "Paul Basden And David S. Dockery",
            "Wipf and Stock Publishers",
            1991,
            "978-1-60608-894-4",
            1,
            0,
            "Theology",
            None,
        ),
        (
            "The Method and Message of Jewish Apocalyptic",
            "D.S Russell",
            "The Westminster Press",
            1964,
            None,
            1,
            0,
            "Theology",
            None,
        ),
        (
            "Persons, Powers and Pluralities : Toward a Trinitarian Theology of Culture",
            "Eric G. Flett",
            "James Clarke & Co.",
            2011,
            "978-0-227-68002-5",
            1,
            0,
            "Theology",
            None,
        ),
        (
            "The Birth of Christianity : The First Twenty Years",
            "Paul Barnett",
            "William B. Eerdmans Publishing Company",
            2005,
            "978-0-8028-2781-4",
            1,
            0,
            "History",
            None,
        ),
        (
            "Homiletic : Moves and Structures",
            "David Buttrick",
            "Fortress Press",
            1987,
            "0-8006-0777-5",
            1,
            0,
            "Theology",
            None,
        ),
        (
            "New Testament Interpretation: Essays on Principles and Methods",
            "I. Howard Marshall",
            "William B. Eerdmans Publishing Company",
            1977,
            "0-8028-3503-1",
            1,
            0,
            "Theology",
            None,
        ),
        (
            "The Story Luke Tells : Luke’s Unique Witness to the Gospel",
            "Justo L. Gonzalez",
            "William B. Eerdmans Publishing Company",
            2015,
            "978-0-8028-7200-5",
            1,
            0,
            "Theology",
            None,
        ),
        (
            "The Church in Act : Lutheran Liturgical Theology",
            "Maxwell E. Johnson",
            "Fortress Press",
            2015,
            "978-1-4514-8883-8",
            1,
            0,
            "Theology",
            None,
        ),
        (
            "Not With Wisdom of Words : Nonrational Persuasion in the New Testament",
            "Gary S.Selby",
            "William B. Eerdmans Publishing Company",
            2016,
            "978-0-8028-73002",
            1,
            0,
            "Theology",
            None,
        ),
        (
            "Eusebius’ Ecclesiastical History",
            "Christian Frederick Cruse",
            "Baker Book House",
            1979,
            "0-8010-3306-3",
            1,
            0,
            "History",
            None,
        ),
        (
            "Baptismal Imagery in Early Christianity :Ritual, Visual, and Theological Dimensions",
            "Robin M. Jensen",
            "Baker Academic",
            2012,
            "978-0-8010-4823-6",
            1,
            0,
            "Theology",
            None,
        ),
        (
            "Beyond Foundationalism : Shaping Theology in a Postmodern Context",
            "Stanley J. Grenz and John R. Franke",
            "Westminster John Knox Press",
            2001,
            "0-664-22325-7",
            1,
            0,
            "Theology",
            None,
        ),
        (
            "Seized by Truth : Reading the Bible as Scripture",
            "Joel B. Green",
            "Abindon Press",
            2007,
            "978-0-687-02355-4",
            1,
            0,
            "Theology",
            None,
        ),
        (
            "Romans in Context :A Theological Appreciation of Paul’s Magnum Opus",
            "Delano Vincent Palmer",
            "Resource Publications",
            2011,
            "978-1-60899-754-1",
            1,
            0,
            "Theology",
            None,
        ),
        (
            "Paul within Judaism : Restoring the First-Century Context to the Apostle",
            "Mark D. Nanos and Magnus Zetterholm",
            "Fortress Press",
            2015,
            "978-1-4514-7003-1",
            1,
            0,
            "Theology",
            None,
        ),
        (
            "Meaning in Text : Historical Shaping of a Narrative Hermeneutics",
            "Edgar V. McKnight",
            "Fortress Press",
            1970,
            "0-8006-0518-7",
            1,
            0,
            "Theology",
            None,
        ),
        (
            "Shaken Faith : What You Don’t Know (and Need to Know) about Faith Crises and How They Affected Spiritual Growth",
            "Sanejo J. leonard",
            "Wipf and Stock",
            2015,
            "978-1-62564-941-4",
            1,
            0,
            "Theology",
            None,
        ),
        (
            "The New Testament Background : Writing from Ancient Greece and the Roman Empire That Illuminate Christian Origins",
            "C.K Barret",
            "HarperSanFrancisco",
            1987,
            "0-006-060881-1",
            1,
            0,
            "History",
            None,
        ),
        (
            "Christ & Culture Revisited",
            "D. A. Carson",
            "William B. Eerdmans Publishing Company",
            2008,
            "978-0-8028-3174-3",
            1,
            0,
            "Theology",
            None,
        ),
        (
            "Christ-Centered Worship: Letting the Gospel Shape our Practice",
            "Bryan Chapel",
            "Baker Academic",
            2009,
            "978-0-8010-3640-8",
            1,
            0,
            "Theology",
            None,
        ),
        (
            "Mission Partnership in Creative Tension",
            "Samuel Cueva",
            "Langham Monographs",
            2015,
            "978-1-7836-89316",
            1,
            0,
            "Theology",
            None,
        ),
        (
            "The Unfolding Mystery of the Divine Name : The God of Sinai in our Midst",
            "Michael P. Knowles",
            "Dawners Groves",
            2012,
            "978-0-8308-3985-8",
            1,
            0,
            "Theology",
            None,
        ),
        (
            "Surprised by Hope",
            "N. T. Wright",
            "HarperCollins e-books",
            2008,
            "978-0-06-194059-0",
            7,
            28,
            "Theology",
            "ebooks/Surprised-by-Hope-N.-T.-Wright.pdf",
        ),
    ]

    for book_info in book_data:
        bookshelf_name = book_info[7]
        bookshelf = bookshelves.get(bookshelf_name)

        book = Book(
            title=book_info[0],
            author=book_info[1],
            publisher=(book_info[2] if book_info[2] else None),
            copyright=(book_info[3] if book_info[3] else None),
            isbn=book_info[4] if book_info[4] else None,
            copy=book_info[5],
            recommendation_count=book_info[6],
            bookshelf=bookshelf,
            file_path=book_info[8] if book_info[8] else None,
        )
        books.append(book)

    Book.objects.bulk_create(books)
    print("✅ Books seeded")


def seed_course_recommended_books():
    reset_sequence_for_model(CourseRecommendedBook)
    courses = list(Course.objects.all())
    books = list(Book.objects.all())
    recommendations = []

    if not courses or not books:
        print("⚠️ Not enough courses or books to create recommendations.")
        return

    for course in courses:
        # Recommend 1 to 3 books per course
        num_recommendations = random.randint(1, 3)
        recommended_books = random.sample(books, min(num_recommendations, len(books)))

        for book in recommended_books:
            # to avoid duplicate recommendations
            if not CourseRecommendedBook.objects.filter(course=course, book=book).exists():
                recommendations.append(
                    CourseRecommendedBook(course=course, book=book)
                )
                # also increment the recommendation_count in the book model
                book.recommendation_count += 1
                book.save(update_fields=['recommendation_count'])


    CourseRecommendedBook.objects.bulk_create(recommendations)
    print(f"✅ {len(recommendations)} course recommended books seeded.")


def seed_notifications():
    reset_sequence_for_model(Notification)
    users = list(User.objects.all())
    notifications = []
    
    notification_titles = [
        "New Course Content Available",
        "Upcoming Assignment Due",
        "Grade Posted",
        "Welcome to the Platform",
        "System Announcement",
    ]
    notification_messages = [
        "A new lecture has been uploaded to your 'Introduction to Python' course.",
        "Your 'Data Structures Midterm' is due next Friday. Don't forget to submit!",
        "Your grade for 'Algebra I Homework 3' has been posted. Check your scores.",
        "We're excited to have you on board! Explore your courses and features.",
        "The system will undergo maintenance on Saturday from 2 AM to 4 AM UTC.",
        "Your instructor has added new materials to 'Calculus II, Section A'."
    ]

    if not users:
        print("⚠️ No users to create notifications for.")
        return

    for user in users:
        num_notifications = random.randint(0, 5)
        for i in range(num_notifications):
            notifications.append(
                Notification(
                    user=user,
                    title=random.choice(notification_titles),
                    message=random.choice(notification_messages),
                    status=random.choice([Notification.Status.READ, Notification.Status.UNREAD]),
                )
            )
    Notification.objects.bulk_create(notifications)
    print(f"✅ {len(notifications)} notifications seeded.")


def seed_student_logs():
    reset_sequence_for_model(StudentLog)
    students = list(User.objects.filter(user_type="Student"))
    logs = []

    log_messages = [
        "Logged in successfully.",
        "Accessed course materials for GE101.",
        "Submitted assignment for GE103: Homework 1.",
        "Viewed grades for GE102.",
        "Updated profile information.",
        "Downloaded notes for GE104: Lecture 5."
    ]

    if not students:
        print("⚠️ No students to create logs for.")
        return

    for student in students:
        num_logs = random.randint(1, 10)
        for _ in range(num_logs):
            logs.append(
                StudentLog(
                    student=student,
                    message=random.choice(log_messages),
                )
            )
    StudentLog.objects.bulk_create(logs)
    print(f"✅ {len(logs)} student logs seeded.")


def seed_instructor_logs():
    reset_sequence_for_model(InstructorLog)
    instructors = list(User.objects.filter(user_type="Instructor"))
    logs = []

    log_messages = [
        "Logged in to instructor dashboard.",
        "Uploaded new content for GE201.",
        "Graded assignments for GE203: Essay 1.",
        "Responded to student queries.",
        "Created a new section for GE202.",
        "Updated course description for PT101."
    ]

    if not instructors:
        print("⚠️ No instructors to create logs for.")
        return

    for instructor in instructors:
        num_logs = random.randint(1, 10)
        for _ in range(num_logs):
            logs.append(
                InstructorLog(
                    instructor=instructor,
                    message=random.choice(log_messages),
                )
            )
    InstructorLog.objects.bulk_create(logs)
    print(f"✅ {len(logs)} instructor logs seeded.")


def seed_book_requests():
    reset_sequence_for_model(BookRequest)
    users = list(User.objects.filter(user_type__in=["Student", "Instructor"]))
    books = list(Book.objects.all())
    requests = []

    request_reasons = [
        "Needed for research paper.",
        "Reference for course materials.",
        "Personal interest in the subject.",
        "Recommended by instructor.",
        "Required for thesis.",
        "To supplement class readings.",
    ]

    if not users:
        print("⚠️ No users (Students/Instructors) to create book requests for.")
        return

    if not books:
        print("⚠️ No books to create requests for.")
        return

    for user in users:
        # Increased to 5-10 requests per user
        num_requests = random.randint(5, 10)
        selected_books = random.sample(books, min(num_requests, len(books)))

        for book in selected_books:
            status = BookRequest.Status.APPROVED if random.random() < 0.30 else BookRequest.Status.PENDING
            
            requests.append(
                BookRequest(
                    user=user,
                    book=book,
                    reason=random.choice(request_reasons),
                    status=status,
                    # Spread across 90 days
                    request_date=timezone.now() - timezone.timedelta(days=random.randint(0, 90))
                )
            )

    BookRequest.objects.bulk_create(requests)
    
    # Update dates manually to bypass auto_now_add=True
    all_reqs = BookRequest.objects.all()
    for req in all_reqs:
        random_date = timezone.now() - timezone.timedelta(days=random.randint(0, 90))
        BookRequest.objects.filter(request_id=req.request_id).update(request_date=random_date)
        
    print(f"✅ {len(requests)} book requests seeded with date variety.")


def seed_borrow_records():
    reset_sequence_for_model(BorrowRecord)
    users = list(User.objects.filter(user_type__in=["Student", "Instructor"]))
    books = list(Book.objects.all())
    records = []

    if not users or not books:
        print("⚠️ No users or books to create borrow records for.")
        return

    conditions = [c[0] for c in BorrowRecord.BookCondition.choices]
    
    for user in users:
        # Increased to 5-10 borrow records per user
        num_borrows = random.randint(5, 10)
        selected_books = random.sample(books, min(num_borrows, len(books)))
        
        for i, book in enumerate(selected_books):
            # Rotate through all statuses
            status_cycle = [
                BorrowRecord.Status.RETURNED,
                BorrowRecord.Status.BORROWED,
                BorrowRecord.Status.OVERDUE,
                BorrowRecord.Status.LOST,
                BorrowRecord.Status.BORROWED, # Extra borrowed for more active cases
                BorrowRecord.Status.RETURNED, # Extra returned for history
            ]
            status = status_cycle[i % len(status_cycle)]
            
            now = timezone.now()
            if status == BorrowRecord.Status.RETURNED:
                borrow_date = now - timezone.timedelta(days=random.randint(20, 90))
                due_date = borrow_date + timezone.timedelta(days=14)
                return_date = borrow_date + timezone.timedelta(days=random.randint(1, 14))
            elif status == BorrowRecord.Status.OVERDUE:
                due_date = now - timezone.timedelta(days=random.randint(1, 30))
                borrow_date = due_date - timezone.timedelta(days=14)
                return_date = None
            elif status == BorrowRecord.Status.BORROWED:
                # Some due very soon, some later
                due_date = now + timezone.timedelta(days=random.randint(-2, 14))
                borrow_date = now - timezone.timedelta(days=random.randint(1, 12))
                return_date = None
            else: # LOST
                borrow_date = now - timezone.timedelta(days=random.randint(60, 120))
                due_date = borrow_date + timezone.timedelta(days=14)
                return_date = None

            records.append(
                BorrowRecord(
                    user=user,
                    book=book,
                    borrow_date=borrow_date,
                    due_date=due_date,
                    return_date=return_date,
                    status=status,
                    book_condition=random.choice(conditions),
                    notes=f"Seeded {status} scenario"
                )
            )

    BorrowRecord.objects.bulk_create(records)

    # Update dates manually to bypass auto_now_add=True
    all_recs = BorrowRecord.objects.all()
    for rec in all_recs:
        # Generate a random borrow date within the last 90 days
        random_borrow_date = timezone.now() - timezone.timedelta(days=random.randint(5, 90))
        # Keep the due date relative to the new borrow date
        new_due_date = random_borrow_date + timezone.timedelta(days=14)
        
        # If it was returned, keep return date relative to new borrow date
        new_return_date = None
        if rec.status == BorrowRecord.Status.RETURNED:
            new_return_date = random_borrow_date + timezone.timedelta(days=random.randint(1, 14))
            
        BorrowRecord.objects.filter(borrow_id=rec.borrow_id).update(
            borrow_date=random_borrow_date,
            due_date=new_due_date,
            return_date=new_return_date
        )

    print(f"✅ {len(records)} borrow records seeded (all scenarios with date variety).")


def seed_registration_requests():
    reset_sequence_for_model(RegistrationRequest)
    
    scenarios = [
        ("John", "Doe", "john.doe@gmail.com", RegistrationRequest.Status.PENDING),
        ("Jane", "Smith", "jane.smith@gmail.com", RegistrationRequest.Status.APPROVED),
        ("Bob", "Wilson", "bob.wilson@gmail.com", RegistrationRequest.Status.REJECTED),
    ]
    
    requests = []
    for fn, ln, email, status in scenarios:
        requests.append(
            RegistrationRequest(
                first_name=fn,
                last_name=ln,
                email=email,
                status=status,
                requested_at=timezone.now() - timezone.timedelta(days=random.randint(1, 5))
            )
        )
        
    # Add some random ones
    for _ in range(5):
        requests.append(
            RegistrationRequest(
                first_name=faker.first_name(),
                last_name=faker.last_name(),
                email=faker.unique.email(),
                status=random.choice(RegistrationRequest.Status.choices)[0],
                requested_at=timezone.now() - timezone.timedelta(days=random.randint(1, 10))
            )
        )
        
    RegistrationRequest.objects.bulk_create(requests)
    print(f"✅ {len(requests)} registration requests seeded.")


def seed_accounting():
    from django.db import transaction
    from decimal import Decimal

    with transaction.atomic():
        reset_sequence_for_model(AccountingFee)
        reset_sequence_for_model(StudentBalance)
        reset_sequence_for_model(StudentTransaction)

        fees_data = [
            {"name": "Tuition Fee", "amount": 0.00, "status": "Active", "color": "from-blue-500 to-indigo-600"},
            {"name": "Registration Fee", "amount": 500.00, "status": "Active", "color": "from-emerald-400 to-teal-500"},
            {"name": "Library Fee", "amount": 300.00, "status": "Active", "color": "from-amber-400 to-orange-500"},
            {"name": "Laboratory Fee", "amount": 1200.00, "status": "Active", "color": "from-rose-400 to-pink-500"},
            {"name": "Late Enrollment Fine", "amount": 1000.00, "status": "Active", "color": "from-purple-400 to-fuchsia-500"},
        ]
        fees = [AccountingFee(**f) for f in fees_data]
        AccountingFee.objects.bulk_create(fees)
        print("✅ Accounting fees seeded")

        students = User.objects.filter(user_type="Student")
        accounting_admin = User.objects.filter(user_type="Accounting").first()
        
        if not accounting_admin:
            # This shouldn't happen if seed_users is run first, but just in case
            accounting_admin = User.objects.create(
                email="accounting_seed@gmail.com",
                first_name="Finance",
                last_name="Staff",
                user_type="Accounting"
            )
            accounting_admin.set_password("asd123ASD")
            accounting_admin.save()

        for student in students:
            # Create initial balance
            StudentBalance.objects.create(student=student, outstanding_balance=0)
            
            # Add some random transactions
            num_transactions = random.randint(3, 7)
            for _ in range(num_transactions):
                is_charge = random.random() < 0.7 # 70% chance of being a charge
                amount = Decimal(str(random.randint(500, 5000)))
                t_type = "Charge" if is_charge else "Payment"
                category = random.choice(["Tuition", "Misc", "Registration", "Library"])
                
                # Create transaction
                t = StudentTransaction.objects.create(
                    student=student,
                    amount=amount,
                    transaction_type=t_type,
                    category=category,
                    description=f"Seeded {t_type}",
                    created_by=accounting_admin
                )
                
                # Apply our NEW logic for seeding
                bal = StudentBalance.objects.get(student=student)
                if t_type == "Charge":
                    t.remaining_balance = amount
                    t.save()
                    bal.outstanding_balance += amount
                    bal.save()
                else:
                    # Allocation logic (FIFO)
                    pool = amount
                    unpaid_charges = StudentTransaction.objects.filter(student=student, transaction_type="Charge").exclude(remaining_balance=0).order_by('created_at')
                    
                    for charge in unpaid_charges:
                        if pool <= 0: break
                        alloc_amt = min(pool, charge.remaining_balance)
                        
                        TransactionAllocation.objects.create(
                            payment=t,
                            charge=charge,
                            amount_allocated=alloc_amt
                        )
                        charge.remaining_balance -= alloc_amt
                        charge.save()
                        pool -= alloc_amt
                        
                        bal.outstanding_balance -= alloc_amt
                        bal.save()
                    
                    # Unallocated amount is unused credit
                    t.remaining_balance = pool
                    t.save()

    print(f"✅ Accounting ledgers seeded for {students.count()} students")


# --- Main Function ---
def main():
    print("🚀 Starting database seeding... Please wait, this may take several minutes over a remote connection.")
    seed_users()
    seed_course_school_years()
    seed_courses()
    seed_enrollments()
    seed_sections()
    seed_content()
    seed_password_resets()
    seed_bookshelves() 
    seed_books()
    seed_grades()
    seed_course_recommended_books()
    seed_notifications()
    seed_student_logs()
    seed_instructor_logs()
    seed_book_requests()
    seed_borrow_records()
    seed_registration_requests()
    seed_accounting()
    print("🎉 Database seeded with all case scenarios.")


if __name__ == "__main__":
    main()
