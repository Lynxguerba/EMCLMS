# Database Schema

EMCLMS uses PostgreSQL as its primary relational database. Below is a breakdown of the core models and their relationships.

## Core Models

### 1. User Management
- **User:** Custom user model supporting Students, Instructors, Administrators, and Accounting Staff.
- **RegistrationRequest:** Manages new user sign-ups awaiting administrative approval.
- **PasswordReset:** Tracks password reset tokens and status.

### 2. Accounting & Finance
- **StudentBalance:** Summary model tracking current total `outstanding_balance` for a student.
- **StudentTransaction:** Detailed ledger tracking `amount`, `transaction_type` (Charge/Payment), `category` (Tuition, Misc, etc.), `description`, and `created_by`.
- **TransactionAllocation:** Junction table linking a `payment` or `source_payment` (unused credit) to a specific `charge` to show how funds are distributed.
- **AccountingFee:** Configuration model for standard fee rates (Tuition, Registration, etc.).

### 2. Academic Structure
- **Course:** Represents a specific subject, linked to an Instructor and a School Year.
- **CourseSchoolYear:** Manages academic years (e.g., "2023-2024").
- **Enrollment:** Junction table linking Students to Courses.
- **Section:** Sub-units within a Course (e.g., "Module 1", "Week 1").

### 3. Content & Submissions
- **Content:** Educational materials (Activities, Files, Announcements) within a Section.
- **ContentFile:** Associated files for course content.
- **Grade:** Tracks student progress, scores, and feedback for specific Content.
- **SubmissionFile:** Student-uploaded files for activities.

### 4. Library System
- **Book:** Catalog of physical and digital books. Includes `embedding` (ArrayField) for semantic search.
- **Bookshelf:** Categorization for books.
- **BorrowRecord:** Tracks physical book loans, status (Borrowed/Returned), and condition.
- **BookRequest:** User requests for library acquisitions or specific access.
- **CourseRecommendedBook:** Linking books to specific courses for student reference.

### 5. System Logs & Notifications
- **Notification:** User-specific alerts for course updates or library status.
- **StudentLog / InstructorLog:** Audit trails for user activities.

## Relationships Diagram (Conceptual)

- **User** 1:N **Enrollment** N:1 **Course**
- **Course** 1:N **Section** 1:N **Content** 1:N **Grade** N:1 **User**
- **User** 1:N **StudentTransaction**
- **User** 1:1 **StudentBalance**
- **StudentTransaction** 1:N **TransactionAllocation** N:1 **StudentTransaction** (Self-referencing allocation map)

- **Atomic User IDs:** Custom `save()` logic in the `User` model ensures unique, year-prefixed IDs (e.g., `2024001`) even under high concurrency.
