# When adding new URL patterns, please follow the format:
# api/<usertype>/<method>/<description>/
# example: api/student/post/add-student-log/

from django.urls import path
from . import views

urlpatterns = [
    # --- Authentication and Session Management ---
    path("api/login/", views.login, name="login"),
    path("api/post/register/", views.register_user, name="register_user"),
    path("api/session/", views.session_user, name="session_user"),
    path("api/logout/", views.logout, name="logout"),
    path("api/impersonate-user/", views.impersonate_user, name="impersonate_user"),
    path("api/stop-impersonating/", views.stop_impersonating, name="stop_impersonating"),
    # --- Admin Endpoints ---
    path("api/admin/get/registration-requests/", views.list_registration_requests, name="list_registration_requests"),
    path("api/admin/delete/registration-request/<int:pk>/", views.delete_registration_request, name="delete_registration_request"),
    path("api/admin/create-user/", views.admin_create_user, name="admin_create_user"),
    path("api/admin/bulk-create-user/", views.admin_bulk_create_user, name="admin_bulk_create_user"),
    path("api/admin/course-count/", views.course_count),
    path("api/admin/get/user-count/<str:argument_type>/", views.admin_get_user_count),
    path("api/admin/course-enrollments/", views.admin_course_enrollment_count),
    path(
        "api/admin/get-all-courses-with-instructor-fullnames/",
        views.admin_get_all_courses_with_instructor_fullnames,
    ),
    path("api/admin/<int:student_id>/enrollments/", views.get_student_enrollments),
    path(
        "api/admin/get-all-password-reset-of-users/",
        views.admin_get_all_password_reset_of_users,
    ),
    path(
        "api/admin/get-users-by-type/<str:user_type>/",
        views.admin_get_users_by_type,
        name="admin_get_users_by_type",
    ),
    path(
        "api/admin/create-course/",
        views.admin_create_course,
        name="admin_create_course",
    ),
    path("api/admin/get/all-rows/", views.admin_get_all_rows),
    path("api/admin/get/course-completion/", views.admin_get_course_completion),
    path("api/admin/post/reset-user-password/", views.admin_password_reset),
    path("api/admin/get/student-logs/", views.get_student_logs),
    path("api/admin/get/instructor-logs/", views.get_instructor_logs),
    path("api/admin/generate-report/", views.admin_generate_pdf_report),
    path("api/admin/get/allusers-report/", views.admin_generate_allusers_pdf_report),
    path(
        "api/admin/get/allcourses-report/", views.admin_generate_allcourses_pdf_report
    ),
    path(
        "api/admin/get/allenrollments-report/",
        views.admin_generate_allenrollments_pdf_report,
    ),
    path(
        "api/admin/get/passwordresetrequests-report/",
        views.admin_generate_passwordresetrequests_pdf_report,
    ),
    path(
        "api/admin/get/studentlogs-report/", views.admin_generate_studentlogs_pdf_report
    ),
    path(
        "api/admin/get/facultylogs-report/", views.admin_generate_facultylogs_pdf_report
    ),
    path("api/admin/get-post/course-school-years/", views.admin_course_school_years),
    path(
        "api/admin/delete/course-school-years/<int:school_year_id>/",
        views.admin_delete_course_school_year,
    ),
    path("api/admin/post/course-clone/<int:course_id>/", views.clone_course),
    path("api/admin/get-all-instructors/", views.admin_get_instructors),
    path(
        "api/admin/reassign-instructor/<int:course_id>/",
        views.admin_reassign_instructor,
    ),
    path(
        "api/admin/delete/course/<int:course_id>/",
        views.admin_delete_course,
        name="admin_delete_course",
    ),
    path(
        "api/admin/get/user-choices/", views.get_user_choices, name="get_user_choices"
    ),
    path(
        "api/admin/delete/user/<int:user_id>/",
        views.admin_delete_user,
        name="admin_delete_user",
    ),
    path(
        "api/admin/update/user/<int:user_id>/",
        views.admin_update_user,
        name="admin_update_user",
    ),
    path("api/admin/db-backup/", views.admin_db_backup, name="admin_db_backup"),
    path("api/admin/db-restore/", views.admin_db_restore, name="admin_db_restore"),
    # --- Librarian Endpoints ---
    path(
        "api/librarian/get/book-count/<str:argument_type>/",
        views.librarian_get_book_count,
        name="librarian_get_book_count",
    ),
    path(
        "api/librarian/post/add-new-book/",
        views.librarian_add_new_book,
        name="librarian_add_new_book",
    ),
    path(
        "api/librarian/get/all-rows/",
        views.librarian_get_all_rows,
        name="librarian_get_all_rows",
    ),
    path(
        "api/librarian/put/update-book/<int:book_id>/",
        views.librarian_update_book,
        name="librarian_update_book",
    ),
    path(
        "api/librarian/get/booksdata-report/",
        views.librarian_generate_booksdata_pdf_report,
    ),
    path("api/librarian/get-post/bookshelves/", views.librarian_manage_bookshelves),
    path(
        "api/librarian/delete/bookshelves/<int:bookshelf_id>/",
        views.librarian_delete_bookshelf,
        name="librarian_delete_bookshelf",
    ),
    path(
        "api/librarian/put/update-bookshelf/<int:bookshelf_id>/",
        views.librarian_update_bookshelf,
        name="librarian_update_bookshelf",
    ),
    path("api/librarian/get/book-requests/", views.list_book_requests, name="list_book_requests"),
    path("api/librarian/post/update-request-status/<int:request_id>/", views.update_request_status, name="update_request_status"),
    path("api/librarian/post/confirm-book-pickup/<int:request_id>/", views.confirm_book_pickup, name="confirm_book_pickup"),
    path("api/librarian/delete/reject-book-request/<int:request_id>/", views.reject_book_request, name="reject_book_request"),
    path(
        "api/librarian/get/borrow-records/",
        views.librarian_get_borrow_records,
        name="librarian_get_borrow_records",
    ),
    path(
        "api/librarian/post/borrow-book/",
        views.librarian_create_borrow_record,
        name="librarian_create_borrow_record",
    ),
    path(
        "api/librarian/put/return-book/<int:borrow_id>/",
        views.librarian_return_book,
        name="librarian_return_book",
    ),
    path(
        "api/librarian/get/check-user/<str:user_id>/",
        views.librarian_check_user,
    ),
    path(
        "api/librarian/get/check-book/<str:isbn>/",
        views.librarian_check_book,
    ),
    path(
        "api/librarian/get/weekly-activity/",
        views.librarian_get_weekly_activity,
        name="librarian_get_weekly_activity",
    ),
    path(
        "api/librarian/get/recent-activity/",
        views.librarian_get_recent_activity,
        name="librarian_get_recent_activity",
    ),
    path(
        "api/librarian/get/most-accessed-books/",
        views.get_most_accessed_books,
        name="get_most_accessed_books",
    ),
    # --- Instructor Endpoints ---
    path("api/instructor/course-count/", views.instructor_course_count),
    path("api/instructor/student-count/", views.instructor_student_count),
    path("api/instructor/enrollment-stats/", views.instructor_enrollment_stats),
    path("api/instructor/get/instructor-courses/", views.get_instructor_courses),
    path(
        "api/instructor/get/courses-with-students/",
        views.instructor_get_courses_with_students,
    ),
    path(
        "api/instructor/get/all-unenrolled-students/<int:course_id>/",
        views.instructor_get_all_unenrolled_students,
    ),
    path(
        "api/instructor/put/update-section/<int:section_id>/",
        views.instructor_update_section,
    ),
    path(
        "api/instructor/put/update-content/<int:content_id>/",
        views.instructor_update_content,
    ),
    path("api/instructor/post/add-content/", views.instructor_add_content),
    path(
        "api/instructor/delete/content/<int:content_id>/",
        views.instructor_delete_content,
    ),
    path(
        "api/instructor/get/content-grades/<int:content_id>/",
        views.get_instructor_grades,
    ),
    path(
        "api/instructor/patch/update-grade/<int:grade_id>/",
        views.instructor_update_grade,
    ),
    path(
        "api/instructor/get/content-title/<int:content_id>/",
        views.instructor_get_content_title,
    ),
    path("api/instructor/post/add-course-book/", views.instructor_add_course_book),
    path("api/instructor/get/course-book/", views.instructor_get_course_book),
    path(
        "api/instructor/get/recommended-books/<int:course_id>/",
        views.instructor_get_recommended_books,
    ),
    path(
        "api/instructor/sections/<int:section_id>/toggle-completed/",
        views.toggle_section_completed,
    ),
    path("api/instructor/post/add-instructor-log/", views.add_instructor_log),
    path(
        "api/instructor/get/courses-with-students-report/",
        views.instructor_generate_courseswithstudent_pdf_report,
    ),
    path(
        "api/instructor/get/students-with-grades-report/",
        views.instructor_generate_studentswithgrades_pdf_report,
    ),
    path("api/instructor/enroll-students/", views.instructor_enroll_students),
    path("api/instructor/unenroll-students/", views.instructor_unenroll_students),
    path(
        "api/instructor/get/course-grades-report/",
        views.instructor_get_course_grades_report,
    ),
    path("api/instructor/upcoming-deadlines/", views.get_instructor_upcoming_deadlines),
    path("api/instructor/weekly-engagement/", views.get_instructor_weekly_engagement),
    path("api/instructor/recent-activity/", views.get_instructor_recent_activity),
    path("api/instructor/delete/section/<int:section_id>/", views.instructor_delete_section, name="instructor_delete_section"),
    path("api/instructor/get/student-performance/<int:student_id>/", views.get_student_performance_for_instructor),
    # --- Student Endpoints ---
    path("api/student/contents/", views.student_get_all_contents),
    path("api/student/sections/", views.student_get_all_sections),
    path("api/student/courses/", views.student_get_all_courses),
    path("api/student/courses/<str:course_id>/", views.student_get_course_detail),
    path(
        "api/student/courses/<str:course_id>/sections/",
        views.student_get_sections_for_course,
    ),
    path(
        "api/student/courses/<str:course_id>/contents/",
        views.student_get_contents_for_course,
    ),
    path("api/student/generate-student-reports/", views.student_generate_pdf_report),
    path(
        "api/student/content/<int:content_id>/submit-files/",
        views.student_submit_activity_files,
    ),
    path(
        "api/student/content/<int:content_id>/submission/", views.student_get_submission
    ),
    path("api/student/get/performance/", views.get_student_performance),
    path(
        "api/student/get/recommended-books/<int:course_id>/",
        views.student_get_recommended_books,
    ),
    path("api/student/post/add-student-log/", views.add_student_log),
    path("api/get/course-school-years/", views.get_course_school_years),
    # --- Course and Section Management (General/Instructor) ---
    path("api/courses/<int:course_id>/", views.course_detail),
    path("api/courses/<int:course_id>/update/", views.update_course, name="update_course"),
    path("api/courses/<int:course_id>/sections/", views.course_sections),
    path("api/courses/<int:course_id>/sections/add/", views.add_section),
    path("api/sections/<int:section_id>/content/", views.section_content),
    # --- Content and Submission Management (General) ---
    path("api/content/<int:content_id>/submit/", views.submit_activity),
    path("api/content/<int:content_id>/submission/", views.get_submission),
    # --- Notification Endpoints ---
    path("api/user/get/notifications/", views.get_user_notifications),
    path(
        "api/user/post/mark-notification-read/<int:notification_id>/",
        views.mark_notification_read,
    ),
    path(
        "api/user/post/mark-all-notifications-read/",
        views.mark_all_notifications_read,
    ),
    # users
    path("api/users/semantic-book-search/", views.semantic_search_books),
    path("api/ocr/upload/", views.OCRUploadView.as_view(), name="ocr-upload"),
    path("api/post/password-reset-request/", views.password_reset_request),
    path("api/user/post/update-profile/", views.user_update_profile),

    # --- User Book Management ---
    path("api/user/get/book-requests/", views.user_get_book_requests, name="user_get_book_requests"),
    path("api/user/delete/cancel-book-request/<int:request_id>/", views.cancel_book_request, name="cancel_book_request"),
    path("api/user/post/submit-borrow-request/", views.submit_borrow_request, name="submit_borrow_request"),
    path("api/user/get/borrow-records/", views.user_get_borrow_records, name="user_get_borrow_records"),

    # --- Accounting Endpoints ---
    path("api/accounting/fees/", views.accounting_fees_list_create, name="accounting_fees_list_create"),
    path("api/accounting/fees/<int:fee_id>/", views.accounting_fee_detail, name="accounting_fee_detail"),
    path("api/accounting/students/", views.accounting_students_list, name="accounting_students_list"),
    path("api/accounting/students/<int:student_id>/ledger/", views.accounting_student_ledger, name="accounting_student_ledger"),
    path("api/accounting/students/<int:student_id>/unpaid-charges/", views.accounting_unpaid_charges, name="accounting_unpaid_charges"),
    path("api/accounting/students/<int:student_id>/unused-credits/", views.accounting_unused_credits, name="accounting_unused_credits"),
    path("api/accounting/transactions/", views.accounting_create_transaction, name="accounting_create_transaction"),
    path("api/accounting/bulk-charge/", views.accounting_bulk_charge, name="accounting_bulk_charge"),
    path("api/accounting/bulk-charge/preview/", views.accounting_bulk_charge_preview, name="accounting_bulk_charge_preview"),
    path("api/accounting/transactions/<int:transaction_id>/void/", views.accounting_void_transaction, name="accounting_void_transaction"),
    path("api/accounting/dashboard-stats/", views.accounting_dashboard_stats, name="accounting_dashboard_stats"),
    path("api/accounting/courses/", views.accounting_get_all_courses, name="accounting_get_all_courses"),

    # --- Student Financials ---
    path("api/student/ledger/", views.student_ledger_summary, name="student_ledger_summary"),
    path("api/student/content/<int:content_id>/record-download/", views.record_download, name="record_download"),
    path("api/books/<int:book_id>/record-access/", views.record_book_access, name="record_book_access"),
]