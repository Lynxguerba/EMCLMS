# Development To-Do List

This document tracks planned fixes, feature implementations, and system improvements for EMCLMS. Contributors are encouraged to pick tasks from this list or propose new ones.

## Mandatory Workflow
- **Read Documentation First:** Before you proceed with any changes, make sure to read the `documentation/` directory as it includes all the documentation for the project.

- **Report First:** Any discovered bugs or proposed features MUST be added to this list before any implementation begins.
- **Task-Driven Changes:** Do not implement any changes unless they are documented below and you have been specifically tasked to do so.
- **Scope Adherence:** Strictly apply changes only within the scope of the documented task. Do not refactor unrelated code or fix other issues unless they are critical blockers or part of the defined task.
- **Hierarchical Completion Rule:** A main task or parent subtask must **ONLY** be marked as complete `[X]` when **ALL** of its children/subtasks are also marked `[X]`. Use `[.]` for partially completed parent tasks.

---

### Legend

- `[ ]` Incomplete: No subtasks are finished.
- `[.]` Partially complete: At least one subtask is finished, but not all.
- `[X]` Complete: **ALL** subtasks and nested items are marked `[X]`.

---

### Note for AI Models (Antigravity & others)
When updating this document:
1. **Maintain Hierarchy:** Always preserve the indentation and nested structure.
2. **Propagate Status:** When you finish a subtask, check if it was the last one for its parent. If so, update the parent to `[X]`. If not, ensure the parent is `[.]`.
3. **Be Specific:** Only mark the exact subtask you worked on. Do not mark an entire feature as done unless you have verified every sub-item.
4. **Break Down Large Tasks:** If a task is complex or large, break it down into smaller, manageable subtasks within the hierarchy. For each subtask:
    - Provide a clear **Description** or **Goal**.
    - Include a **Files Involved** list (affected, added, or deleted).


- [.] **Frontend: Optimize Page Navigation and Data Fetching**
  - **Root Cause Identified:** Sequential `/api/session/` calls on every page mount block data fetching and cause full-page loading flickers.
    - [.] **Frontend: Implement Component-Level Skeletons and TanStack Query**
      - **Goal:** Improve perceived performance and eliminate full-page loading flickers by transitioning from full-page `CircularProgress` to component-level Skeletons and implementing TanStack Query for data management.
      - **Progress Update:** Infrastructure (TanStack Query, `useQueries.ts`, and `Skeletons.tsx`) is 100% complete. Remaining work is the manual refactoring of individual pages to use these tools.
      - **Strategy:**
        1. [.] **Refactor Pages for Layout-First Rendering:** Replace global `if (loading) return <CircularProgress />` checks in pages with layout-first rendering and component-level skeletons.
           - [ ] **Refactor: InstructorGradeCourse**
             - **Goal:** Implement `CourseContentSkeleton` and allow Sidebar/Navbar to render immediately while data is fetching.
             - **Files Involved:** `frontend/src/pages/InstructorGradeCourse.tsx`
           - [ ] **Refactor: AdminManageUsers**
             - **Goal:** Implement `TableSkeleton` for the user grid while maintaining Sidebar visibility.
             - **Files Involved:** `frontend/src/pages/AdminManageUsers.tsx`
           - [ ] **Refactor: StudentDashboard**
             - **Goal:** Use `MetricCardSkeleton` and `ActivityFeedSkeleton` for dashboard components.
             - **Files Involved:** `frontend/src/pages/StudentDashboard.tsx`
           - [ ] **Refactor: InstructorDashboard**
             - **Goal:** Replace full-page loading with `ChartCardSkeleton` and `MetricCardSkeleton`.
             - **Files Involved:** `frontend/src/pages/InstructorDashboard.tsx`
           - [ ] **Refactor: AdminDashboard**
             - **Goal:** Implement component-level skeletons for all dashboard analytics cards.
             - **Files Involved:** `frontend/src/pages/AdminDashboard.tsx`
           - [ ] **Refactor: LibrarianReport & AdminReport**
             - **Goal:** Ensure report parameters and layout are visible while data is being fetched/processed.
             - **Files Involved:** `frontend/src/pages/LibrarianReport.tsx`, `frontend/src/pages/AdminReport.tsx`
           - [ ] **Phase 2: Remaining Pages (Role-Based)**
             - **Instructor:**
               - [ ] `InstructorGradeContent`: Use `TableSkeleton` for student list.
               - [ ] `InstructorSchedule`: Use `CalendarSkeleton`.
               - [ ] `InstructorReports`: Use `ReportTableSkeleton`.
               - [ ] `InstructorBookSearch`, `InstructorBorrowBooks`, `InstructorReturnBooks`: Use `TableSkeleton`.
             - **Librarian:**
               - [ ] `LibrarianDashboard`: Fully refactor to remove global `authLoading` flicker.
               - [ ] `LibrarianManageBooks`: Use `TableSkeleton`.
               - [ ] `LibrarianBorrowReturn`: Use `TableSkeleton`.
             - **Admin:**
               - [ ] `AdminManageCourses`: Use `TableSkeleton`.
               - [ ] `AdminManageRegistrationRequests`: Use `TableSkeleton`.
               - [ ] `AdminLogs`, `AdminFacultyLogs`, `AdminStudentLogs`: Use `ReportTableSkeleton`.
               - [ ] `AdminChangePasswords`: Use `TableSkeleton`.
             - **Student:**
               - [ ] `StudentPerformance`: Use `CoursePerformanceSkeleton`.
               - [ ] `StudentSchedule`: Use `CalendarSkeleton`.
             - **Common/Shared:**
               - [ ] `UserBookSearch`, `UserBorrowBooks`, `UserReturnBooks`: Use `TableSkeleton`.
        2. [X] **Create Skeletons:** Reusable Skeleton components created in `frontend/src/pages/components/Skeletons.tsx`.
        3. [X] **Integrate TanStack Query:** Core logic implemented in `frontend/src/hooks/useQueries.ts`.
        4. [X] **Implement Mutations & Cache Invalidation:** Handled globally via `useGlobalMutation`.

- [ ] **Quality Assurance & Testing**
  - [ ] **Test Coverage Expansion (Backend)**
    - [ ] **Submissions:** Add tests for `student_submit_activity_files.py` and submission retrieval views.
    - [ ] **Reports:** Add tests for PDF generation across all user roles (Admin, Instructor, Student).
    - [ ] **Engagement:** Add tests for Notifications (`get_user_notifications.py`) and weekly activity/engagement views.
    - [ ] **Account Management:** Add tests for password reset flows and profile updates.
    - [ ] **Admin Utilities:** Add tests for course cloning, instructor reassignment, and course completion metrics.
    - [ ] **Grading:** Add tests for `instructor_update_grade.py`.
  - [ ] **Frontend Testing Infrastructure**
    - [ ] Implement unit tests for reusable UI components (Skeletons, Modals, Navbar, Sidebar).
    - [ ] Add TanStack Query integration tests for core dashboards (success/error state validation).
    - [ ] (Research) Setup E2E testing framework (e.g., Playwright) for critical user journeys.
  - [ ] **Performance & Benchmarking**
    - [ ] Verify query count reduction for all refactored N+1 endpoints using Django Silk or similar tool.

## Bug Fixes

## Production Readiness & Security

- [ ] **Infrastructure: Enhance Environment Awareness**
  - [ ] Replace `DEBUG = "RENDER" not in os.environ` with an explicit `DEBUG` environment variable check in `settings.py`.
  - [ ] Update `psycopg2-binary` to `psycopg2` in `requirements.txt` and ensure `libpq-dev` is used in the `Dockerfile` for production stability.
- [ ] **Security: Harden Django Configuration**
  - [ ] Enable `SECURE_SSL_REDIRECT` in production.
  - [ ] Set `SECURE_HSTS_SECONDS`, `SECURE_HSTS_INCLUDE_SUBDOMAINS`, and `SECURE_HSTS_PRELOAD`.
  - [ ] Enable `SECURE_BROWSER_XSS_FILTER` and `SECURE_CONTENT_TYPE_NOSNIFF`.
- [ ] **Reliability: Improve Cold Starts and Async Operations**
  - [ ] **Asynchronous Emails:** Offload `send_registration_confirmation_email` to a background task (e.g., using a simple threading approach or a task queue like Celery) to prevent UI hangs.
  - [ ] **Logging:** Implement explicit `LOGGING` configuration in `settings.py` to capture errors to a file or external service in production.

## System Observability: Notifications & Logging

- [ ] **Notifications: Transition to a Unified Service Architecture**
  - **Goal:** Centralize notification logic to ensure consistency and support multi-channel delivery (In-app, Email, Push).
  - **Strategy:**
    1. Implement Django Signals (`post_save`) to decouple business logic from notification triggers.
    2. Create a centralized `NotificationService` in `backend/api/services/`.
  - **Implementation Status:**
    - [ ] **Phase 1: Course & Content Integration**
      - [ ] Notify students when new `Section` or `Content` is added to an enrolled course.
      - [ ] Notify students of upcoming deadlines (24-hour warning).
    - [ ] **Phase 2: Administrative & User Security**
      - [ ] Notify Admins of new `RegistrationRequest` submissions.
      - [ ] Notify users of password change completions.
    - [X] **Phase 3: Financial Notifications**
      - [X] Notify students when a new `Charge` is applied to their account.
      - [X] Notify students of `Payment` confirmation.
    - [ ] **Phase 4: Frontend & Real-time UI**
      - [ ] Implement a Notification Badge in the Sidebar/Header with an unread count.
      - [ ] Create a dedicated Notification Pane with "Mark all as read" and "Delete" capabilities.
      - [ ] (Research) Explore WebSockets (Django Channels) for real-time push notifications.

- [ ] **Logging: Implement a Unified Audit Trail**
  - **Goal:** Replace fragmented logging with a single, searchable audit log for all critical system actions.
  - **Strategy:**
    1. Create a unified `AuditLog` model to track User, Action, Target, and Changes (JSON).
    2. Implement a Global Logging Middleware to automatically record write operations (POST/PATCH/DELETE).
  - **Implementation Status:**
    - [ ] **Core Logging Infrastructure**
      - [ ] Design and migrate the `AuditLog` model.
      - [ ] Implement the `AuditLogMiddleware` to capture request metadata.
    - [ ] **Enhanced Activity Tracking**
      - [ ] Log sensitive actions: Grade changes, Course deletions, User permission updates.
      - [ ] Track engagement metrics: File downloads, Content views.
      - [ ] Log security events: Failed login attempts, Unauthorized (403) access.
    - [ ] **Admin Visibility**
      - [ ] Build a frontend Log Viewer for Admins with filtering by user, date, and action type.

