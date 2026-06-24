# Routing & Navigation

EMCLMS uses **React Router 7** for client-side routing. The application follows a flat routing structure defined in `src/pages/Router.tsx`.

## Route Organization

Routes are grouped by user roles and functionality:

### 1. Authentication & Common
- `/`: The entry point (Login Page).
- `/profile-settings`: Shared settings page for all authenticated users.
- `*`: Catch-all route for the `NotFoundPage`.

### 2. Student Routes
- `/StudentDashboard`: Main student overview.
- `/StudentCourses`: List of enrolled courses.
- `/Course/:course_id`: Detail view for a specific course.
- `/StudentPerformance`: Grade tracking and analytics.

### 3. Instructor Routes
- `/InstructorDashboard`: Faculty overview and logs.
- `/InstructorCourses`: Management view of assigned courses.
- `/InstructorGrade`: Entry point for grading workflows.
- `/InstructorReports`: Generatable academic reports.

### 4. Admin Routes
- `/AdminDashboard`: System-wide analytics and logs.
- `/AdminManageUsers`: CRUD operations for user accounts.
- `/AdminManageRegistrationRequests`: Approval workflow for new users.
- `/AdminLogs`: Audit trails for both faculty and students.

### 5. Librarian Routes
- `/LibrarianDashboard`: Library overview.
- `/LibrarianManageBooks`: Catalog management.
- `/LibrarianBorrowReturn`: Manual entry for physical book transactions.

## Route Protection
Access control is enforced via the `<ProtectedRoute>` component in `Router.tsx`. This wrapper validates the user session and enforces role-based access before rendering the requested page. Unauthorized users or those with insufficient permissions are redirected appropriately (e.g., to the login page).

## Navigation Patterns
- **Sidebar Navigation:** Centralized navigation logic that uses `useLocation` to highlight the active route.
- **Programmatic Navigation:** Extensive use of `useNavigate` for redirects after form submissions or session expiry.
