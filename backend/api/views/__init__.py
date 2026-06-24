# backend\api\views\__init__.py

from .auth_views import login, session_user, logout, impersonate_user, stop_impersonating
from .instructor_course_count import instructor_course_count
from .instructor_student_count import instructor_student_count
from .instructor_enrollment_stats import instructor_enrollment_stats
from .get_instructor_courses import get_instructor_courses
from .course_detail import course_detail
from .course_sections import course_sections
from .section_content import section_content
from .get_submission import get_submission
from .get_submission import get_submission
from .submit_activity import submit_activity
from .add_section import add_section
from .course_count import course_count
from .admin_get_user_count import admin_get_user_count
from .admin_course_enrollment_count import admin_course_enrollment_count
from .admin_get_all_courses_with_instructor_fullnames import (
    admin_get_all_courses_with_instructor_fullnames,
)
from .get_student_enrollments import get_student_enrollments
from .admin_get_all_password_reset_of_users import admin_get_all_password_reset_of_users
from .instructor_get_content_title import instructor_get_content_title
from .admin_generate_pdf_report import admin_generate_pdf_report
from .instructor_generate_courseswithstudent_pdf_report import (
    instructor_generate_courseswithstudent_pdf_report,
)
from .get_instructor_upcoming_deadlines import get_instructor_upcoming_deadlines
from .instructor_generate_studentwithgrades_pdf_report import (
    instructor_generate_studentswithgrades_pdf_report,
)
from .student_generate_pdf_report import student_generate_pdf_report
from .student_get_all_contents import student_get_all_contents
from .student_get_all_sections import student_get_all_sections
from .student_get_all_courses import student_get_all_courses
from .student_get_course_detail import student_get_course_detail
from .student_get_sections_for_course import student_get_sections_for_course
from .student_get_contents_for_course import student_get_contents_for_course
from .semantic_search_books import semantic_search_books
from .admin_create_user import admin_create_user
from .admin_bulk_create_user import admin_bulk_create_user
from .admin_get_users_by_type import admin_get_users_by_type
from .admin_update_user import admin_update_user
from .admin_create_course import admin_create_course
from .admin_get_all_rows import admin_get_all_rows
from .admin_get_course_completion import admin_get_course_completion
from .admin_password_reset import admin_password_reset
from .instructor_get_courses_with_students import instructor_get_courses_with_students
from .get_course_school_years import get_course_school_years
from .instructor_get_all_unenrolled_students import (
    instructor_get_all_unenrolled_students,
)
from .instructor_update_section import instructor_update_section
from .instructor_update_content import instructor_update_content
from .instructor_add_content import instructor_add_content
from .instructor_delete_section import instructor_delete_section
from .student_submit_activity_files import student_submit_activity_files
from .student_get_submission import student_get_submission
from .get_instructor_grades import get_instructor_grades
from .instructor_update_grade import instructor_update_grade
from .get_student_performance import get_student_performance
from .get_student_performance_for_instructor import get_student_performance_for_instructor
from .instructor_add_course_book import instructor_add_course_book
from .instructor_get_course_book import instructor_get_course_book
from .instructor_get_recommended_books import instructor_get_recommended_books
from .student_get_recommended_books import student_get_recommended_books
from .toggle_section_completed import toggle_section_completed
from .get_student_logs import get_student_logs
from .add_student_log import add_student_log
from .get_instructor_logs import get_instructor_logs
from .add_instructor_log import add_instructor_log
from .admin_generate_allusers_pdf_report import admin_generate_allusers_pdf_report
from .admin_generate_allcourses_pdf_report import admin_generate_allcourses_pdf_report
from .admin_generate_allenrollments_pdf_report import (
    admin_generate_allenrollments_pdf_report,
)
from .admin_generate_passwordresetrequests_pdf_report import (
    admin_generate_passwordresetrequests_pdf_report,
)
from .admin_generate_studentlogs_pdf_report import admin_generate_studentlogs_pdf_report
from .admin_generate_facultylogs_pdf_report import admin_generate_facultylogs_pdf_report
from .ocr_upload import OCRUploadView
from .admin_course_school_years import (
    admin_course_school_years,
    admin_delete_course_school_year,
)
from .admin_course_clone import clone_course
from .admin_get_instructors import admin_get_instructors
from .reassign_instructor import admin_reassign_instructor
from .admin_delete_course import admin_delete_course
from .password_reset_request import password_reset_request
from .user_update_profile import user_update_profile
from .accounting_fees import accounting_fees_list_create, accounting_fee_detail
from .accounting_ledger import accounting_students_list, accounting_student_ledger, accounting_unpaid_charges, accounting_unused_credits, accounting_create_transaction, accounting_bulk_charge, accounting_bulk_charge_preview, accounting_void_transaction
from .student_ledger import student_ledger_summary
from .accounting_stats import accounting_dashboard_stats
from .accounting_courses import accounting_get_all_courses
from .librarian_get_book_count import librarian_get_book_count
from .librarian_add_new_book import librarian_add_new_book
from .librarian_get_all_rows import librarian_get_all_rows
from .librarian_update_book import librarian_update_book
from .librarian_generate_booksdata_pdf_report import (
    librarian_generate_booksdata_pdf_report,
)
from .librarian_manage_bookshelves import *
from .instructor_enroll_students import instructor_enroll_students
from .instructor_unenroll_students import instructor_unenroll_students
from .get_user_choices import get_user_choices

from .get_user_notifications import get_user_notifications
from .mark_notification_read import mark_notification_read
from .mark_all_notifications_read import mark_all_notifications_read
from .instructor_delete_content import *
from .instructor_get_course_grades_report import instructor_get_course_grades_report
from .admin_delete_user import admin_delete_user
from .registration_views import (
    register_user,
    list_registration_requests,
    delete_registration_request,
)
from .librarian_book_requests import (
    list_book_requests,
    update_request_status,
    confirm_book_pickup,
    reject_book_request,
)
from .librarian_borrow_return import (
    librarian_get_borrow_records,
        librarian_create_borrow_record,
        librarian_return_book,
        librarian_check_user,
        librarian_check_book,
    )

from .librarian_get_weekly_activity import librarian_get_weekly_activity
from .librarian_get_recent_activity import librarian_get_recent_activity

from .user_borrow_views import (
    user_get_book_requests,
    user_get_borrow_records,
    submit_borrow_request,
    cancel_book_request,
)
from .instructor_weekly_engagement import get_instructor_weekly_engagement
from .instructor_recent_activity import get_instructor_recent_activity
from .update_course import update_course
from .admin_db_backup import admin_db_backup
from .admin_db_restore import admin_db_restore
from .record_download import record_download
from .record_book_access import record_book_access
from .librarian_book_analytics import get_most_accessed_books