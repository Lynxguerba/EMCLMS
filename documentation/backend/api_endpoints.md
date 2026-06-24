# API Endpoints

The EMCLMS backend follows a role-based URL structure for clarity and security. The base endpoint for all API calls is `api/`.

## Authentication & Session
- `POST api/login/`: Validates credentials and creates a session. **(Rate limited: 10/min)**
- `POST api/logout/`: Destroys the current session.
- `GET api/session/`: Returns details of the currently authenticated user.
- `POST api/post/register/`: Submits a new registration request for administrative approval. **(Rate limited: 10/min)**
- `POST api/post/password-reset-request/`: Initiates a password recovery workflow. **(Rate limited: 10/min)**

## Admin Endpoints (`api/admin/`)
- `GET get/registration-requests/`: Lists all pending sign-up requests.
- `POST create-user/`: Manually create a new user account. Accepts `password` for manual credential assignment.
- `POST bulk-create-user/`: Processes a list of users for batch creation. Supports optional custom passwords and auto-generates credentials if omitted.
- `POST post/course-clone/<id>/`: Clones an existing course with its sections and contents.
- `GET generate-report/`: Triggers PDF report generation for various system metrics.
- `GET course-enrollments/`: Returns statistical data for enrollment charts.

## Librarian Endpoints (`api/librarian/`)
- `POST post/add-new-book/`: Adds a new book to the catalog (triggers embedding generation).
- `GET get/all-rows/`: Fetches all records for a specific table (e.g., `?table=book`).
- `PUT put/update-book/<id>/`: Updates details of an existing book.
- `GET get/booksdata-report/`: Generates a PDF report of library books.
- `GET get-post/bookshelves/`: Retrieves all bookshelves or creates a new one.
- `PUT put/update-bookshelf/<id>/`: Renames an existing bookshelf.
- `DELETE delete/bookshelves/<id>/`: Deletes a bookshelf.
- `GET get/borrow-records/`: Lists all active and past book loans.
- `PUT return-book/<id>/`: Updates a borrow record to "Returned".
- `POST post/confirm-book-pickup/<id>/`: Transitions a book request to a borrow record.

## Instructor Endpoints (`api/instructor/`)
- `GET get/instructor-courses/`: Returns courses assigned to the logged-in instructor.
- `POST enroll-students/`: Enrolls one or more students into a course.
- `POST unenroll-students/`: Unenrolls students from a course.
- `POST post/add-content/`: Adds Activities, Files, or Announcements to a course section.
- `PUT put/update-section/<id>/`: Updates section title or visibility.
- `PUT put/update-content/<id>/`: Updates content details or attached files.
- `DELETE delete/section/<id>/`: Deletes a course section.
- `DELETE delete/content/<id>/`: Deletes a content item.
- `PATCH patch/update-grade/<id>/`: Updates scores and feedback for student submissions.
- `GET upcoming-deadlines/`: Aggregates deadlines across all managed courses.
- `GET recent-activity/`: Fetches recent student activities in the instructor's courses.
- `GET course-count/`, `student-count/`, `enrollment-stats/`: Metric endpoints for dashboard cards.

## Student Endpoints (`api/student/`)
- `GET courses/`: Lists all courses the student is currently enrolled in.
- `GET sections/`: Lists all sections across all enrolled courses.
- `GET contents/`: Lists all educational contents across all enrolled courses.
- `GET courses/<id>/`: Retrieves details of a specific enrolled course.
- `GET courses/<id>/sections/`: Lists sections for a specific enrolled course.
- `GET courses/<id>/contents/`: Lists educational contents for a specific enrolled course.
- `POST content/<id>/submit-files/`: Handles file uploads for assignments.
- `GET content/<id>/submission/`: Retrieves the student's submission for a specific content.
- `GET generate-student-reports/`: Generates a PDF report of student progress.
- `GET get/performance/`: Returns course-wise progress analytics and the overall academic average (calculated as the mean of each enrolled course's average).
- `GET get/recommended-books/<course_id>/`: Fetches recommended books for a course.
- `POST post/add-student-log/`: Logs a student's activity.
- `GET ledger/`: Retrieves the student's transaction history and current balance.

## Accounting Endpoints (`api/accounting/`)
- `GET students/`: Lists all students with their net outstanding balances.
- `GET students/<id>/ledger/`: Returns the full transaction history for a specific student. The response includes a `student` object with a `total_unapplied_credits` field and detailed allocations between payments and charges.
- `GET students/<id>/unpaid-charges/`: Lists all charges for a student that still have a remaining balance.
- `GET students/<id>/unused-credits/`: Lists all payments for a student that have not been fully allocated to charges.
- `POST transactions/`: Records a new Payment or Charge. Supports complex student-level allocations and re-allocations from existing credits.
- `POST bulk-charge/`: Applies a common fee (e.g., "Monthly Tuition") to a filtered group of students.
- `PATCH transactions/<id>/void/`: Marks a transaction as voided and updates the student's balance accordingly, restoring credits where applicable.
- `GET fees/`: Lists all globally configured fee rates.
- `GET dashboard-stats/`: Aggregates receivables and payment metrics for the accounting dashboard.

## General & AI Features
- `GET api/courses/<id>/`: Returns course details including dynamic stats (`enrolled_student_count`, `section_count`, `activity_count`, `school_year`).
- `PATCH api/courses/<id>/update/`: Updates the code, title and description of a course (Admins only).
- `GET api/users/semantic-book-search/`: Performs vector-based similarity search for books.
- `POST api/ocr/upload/`: Processes an image or PDF to extract text via Tesseract.
- `GET api/user/get/notifications/`: Fetches unread alerts for the authenticated user.
## Rate Limiting

To maintain system stability and security, certain endpoints are subject to rate limiting:
- **Login/Register/Password Reset:** 10 requests per minute.
- **Authenticated Users:** 2000 requests per hour.
- **Anonymous Users:** 100 requests per minute.

Scale these values in `backend/core/settings.py` under `REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]`.

- `POST api/user/post/update-profile/`: Updates the authenticated user's profile information (name, avatar, password).
- `POST api/user/post/submit-borrow-request/`: Submits a request to borrow a specific book.
- `DELETE api/user/delete/cancel-book-request/<id>/`: Cancels a pending book borrow request.

