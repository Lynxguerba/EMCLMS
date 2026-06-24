# Test Inventory

This document provides a manual inventory of existing automated tests and identifies gaps in coverage for the EMCLMS project.

## 1. Existing Backend Tests (Django)

Total Test Files: 22
Total Estimated Tests: ~130+

### Model Tests (Unit Tests)
- **User Model (`test_user_model.py`):** Tests ID generation (current year + sequence) and password hashing.
- **Course Model (`test_course_model.py`):** Tests course uniqueness and comprehensive course cloning (sections, content, recommended books).
- **Content Model (`test_course_model.py`):** Tests `is_active` logic based on due dates.
- **Other Models (`test_other_models.py`):** Smoke tests for Enrollment, Grade, PasswordReset, StudentLog, and InstructorLog.

### API & View Tests (Integration Tests)
- **Authentication (`test_auth_views.py`):** Login, Logout, and Session User endpoints.
- **Admin Management:**
    - **Bulk Create (`test_admin_bulk_create_user.py`):** Success, partial success (duplicates/invalid), and unauthorized access.
    - **Course Operations (`test_admin_course_views.py`):** Create/Delete course, missing fields, invalid instructor, duplicate codes.
    - **User Operations (`test_admin_views.py`):** Create user, get choices (programs/types), get users by type, get counts (student/instructor/program).
    - **Registration (`test_registration_acceptance.py`):** Accepting registration deletes the request.
    - **Course Update (`test_update_course.py`):** Admin and Owner (Instructor) can update course details; unauthorized users denied.
- **Instructor Management:**
    - **Content (`test_instructor_content_views.py`):** Add/Update/Delete content, authorization checks, not found cases.
    - **Course Management (`test_instructor_course_management.py`):** Add/Remove course books, add/update sections.
    - **Reports (`test_instructor_get_course_grades_report.py`):** Basic retrieval of grade reports.
    - **New Endpoints (`test_instructor_new_endpoints.py`):** Verification of recently added instructor utility endpoints.
- **Student Endpoints (`test_student_endpoints.py`):**
    - Get enrolled courses, sections, and content.
    - Performance metrics retrieval.
    - Access control (cannot view unowned courses).
- **Librarian Management (`test_librarian_views.py`):**
    - Add/Update/Delete books and bookshelves.
    - Get counts, recent activity, and table rows.
    - Borrow/Request logic (`test_book_requests.py`): Submit requests, auto-cancel on approval, manual borrow cancellation.
- **System Utilities:**
    - **Middleware (`test_middleware.py`):** ActiveUserMiddleware (auto-logout for inactivity, updating last_online).
    - **Throttling (`test_throttling.py`):** Login, Registration, and Password Reset rate limiting; Allowed Hosts check; and configuration verification (preventing `ImproperlyConfigured` errors).

---

## 2. Identified Gaps (Untested Components)

### Backend Gaps (High Priority)
- **ML & Specialized Features:**
    - `ocr_upload.py`: OCR processing logic and file handling.
    - `semantic_search_books.py`: Embedding generation and similarity search logic.
- **File & Submission Handling:**
    - `student_submit_activity_files.py` / `submit_activity.py`: File upload logic for assignments.
    - `get_submission.py` / `student_get_submission.py`: Retrieval of student work.
- **PDF Report Generation:**
    - All `admin_generate_*_pdf_report.py` views.
    - `instructor_generate_*_pdf_report.py` views.
    - `librarian_generate_booksdata_pdf_report.py`.
    - `student_generate_pdf_report.py`.
- **User Engagement & Notifications:**
    - `get_user_notifications.py`, `mark_notification_read.py`, `mark_all_notifications_read.py`.
    - `instructor_weekly_engagement.py`, `librarian_get_weekly_activity.py`.
- **Security & Password Management:**
    - `password_reset_request.py`, `admin_password_reset.py`, `admin_get_all_password_reset_of_users.py`.
    - `user_update_profile.py` (including profile picture changes).
- **Administrative Utilities:**
    - `reassign_instructor.py`, `admin_course_clone.py`, `admin_get_course_completion.py`.
    - `admin_course_school_years.py`, `get_course_school_years.py`.
- **Instructor Grading:**
    - `instructor_update_grade.py`.

### Frontend Gaps (Critical)
- **Unit Tests:** No tests for shared components (Navbar, Sidebar, Modals, Skeleton loaders).
- **Integration Tests:** No tests for TanStack Query flows (success/error states) on Dashboards.
- **E2E Tests:** No coverage for critical user journeys (Registration -> Login -> Course Enrollment -> Submission -> Grading).

### Documentation Gaps
- **API Reference:** Many endpoints listed in `backend/api/views/` are not fully documented in `docs/backend/api_endpoints.md`.
