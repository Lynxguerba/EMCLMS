import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import ProtectedRoute from "../components/ProtectedRoute";

// Authentication & User Settings
const LoginPage = lazy(() => import("./LoginPage"));
const ProfileSettings = lazy(() => import("./ProfileSettings"));

// Student Components
const StudentDashboard = lazy(() => import("./StudentDashboard"));
const StudentCourses = lazy(() => import("./StudentCourses"));
const StudentCourse = lazy(() => import("./StudentCourse"));
const StudentPerformance = lazy(() => import("./StudentPerformance"));
const StudentAccount = lazy(() => import("./StudentAccount"));
const StudentSchedule = lazy(() => import("./StudentSchedule"));

// Instructor Components
const InstructorDashboard = lazy(() => import("./InstructorDashboard"));
const InstructorCourses = lazy(() => import("./InstructorCourses"));
const InstructorCourse = lazy(() => import("./InstructorCourse"));
const InstructorGrade = lazy(() => import("./InstructorGrade"));
const InstructorGradeCourse = lazy(() => import("./InstructorGradeCourse"));
const InstructorGradeContent = lazy(() => import("./InstructorGradeContent"));
const InstructorReports = lazy(() => import("./InstructorReports"));
const InstructorSchedule = lazy(() => import("./InstructorSchedule"));
const InstructorStudentPerformance = lazy(() => import("./InstructorStudentPerformance"));

// Admin Components
const AdminDashboard = lazy(() => import("./AdminDashboard"));
const AdminSettings = lazy(() => import("./AdminSettings"));
const AdminManageUsers = lazy(() => import("./AdminManageUsers"));
const AdminManageCourses = lazy(() => import("./AdminManageCourses"));
const AdminChangePasswords = lazy(() => import("./AdminChangePasswords"));
const AdminManageRegistrationRequest = lazy(() => import("./AdminManageRegistrationRequests"));
const AdminFacultyLogs = lazy(() => import("./AdminFacultyLogs"));
const AdminStudentLogs = lazy(() => import("./AdminStudentLogs"));
const AdminLogs = lazy(() => import("./AdminLogs"));
const AdminReports = lazy(() => import("./AdminReport"));
const AdminDatabaseManagement = lazy(() => import("./AdminDatabaseManagement"));

// Librarian Components
const LibrarianDashboard = lazy(() => import("./LibrarianDashboard"));
const LibrarianManageBooks = lazy(() => import("./LibrarianManageBooks"));
const LibrarianReport = lazy(() => import("./LibrarianReport"));
const LibrarianBorrowReturn = lazy(() => import("./LibrarianBorrowReturn"));
const LibrarianBookRequests = lazy(() => import("./LibrarianBookRequests"));

// Accounting Components
const AccountingDashboard = lazy(() => import("./AccountingDashboard"));
const AccountingStudents = lazy(() => import("./AccountingStudents"));
const AccountingStudentLedger = lazy(() => import("./AccountingStudentLedger"));
const AccountingFees = lazy(() => import("./AccountingFees"));

// Miscellaneous Components
const NotFoundPage = lazy(() => import("./errors/NotFoundPage"));
const UserBookSearch = lazy(() => import("./UserBookSearch"));
const UserBorrowBooks = lazy(() => import("./UserBorrowBooks"));
const UserReturnBooks = lazy(() => import("./UserReturnBooks"));
const InstructorBookSearch = lazy(() => import("./InstructorBookSearch"));
const InstructorBorrowBooks = lazy(() => import("./InstructorBorrowBooks"));
const InstructorReturnBooks = lazy(() => import("./InstructorReturnBooks"));

const LoadingScreen = () => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
    }}
  >
    <CircularProgress size="2rem" />
  </Box>
);

export default function Router() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Default & Authentication Routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="*" element={<NotFoundPage />} />
        
        {/* Protected Routes for All Authenticated Users */}
        <Route 
          path="/profile-settings" 
          element={
            <ProtectedRoute>
              <ProfileSettings />
            </ProtectedRoute>
          } 
        />

        {/* Student Routes */}
        <Route 
          path="/StudentDashboard" 
          element={
            <ProtectedRoute allowedRoles={["Student"]}>
              <StudentDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/StudentCourses" 
          element={
            <ProtectedRoute allowedRoles={["Student"]}>
              <StudentCourses />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/Course/:course_id" 
          element={
            <ProtectedRoute allowedRoles={["Student"]}>
              <StudentCourse />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/StudentPerformance" 
          element={
            <ProtectedRoute allowedRoles={["Student"]}>
              <StudentPerformance />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/StudentSchedule" 
          element={
            <ProtectedRoute allowedRoles={["Student"]}>
              <StudentSchedule />
            </ProtectedRoute>
          } 
        />

        {/* Instructor Routes */}
        <Route 
          path="/InstructorDashboard" 
          element={
            <ProtectedRoute allowedRoles={["Instructor"]}>
              <InstructorDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/InstructorCourses" 
          element={
            <ProtectedRoute allowedRoles={["Instructor"]}>
              <InstructorCourses />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/InstructorCourses/Course/:courseId"
          element={
            <ProtectedRoute allowedRoles={["Instructor"]}>
              <InstructorCourse />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/InstructorGrade" 
          element={
            <ProtectedRoute allowedRoles={["Instructor"]}>
              <InstructorGrade />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/InstructorGrade/Course/:courseId"
          element={
            <ProtectedRoute allowedRoles={["Instructor"]}>
              <InstructorGradeCourse />
            </ProtectedRoute>
          }
        />
        <Route
          path="/InstructorGrade/Content/:content_id"
          element={
            <ProtectedRoute allowedRoles={["Instructor"]}>
              <InstructorGradeContent />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/InstructorReports" 
          element={
            <ProtectedRoute allowedRoles={["Instructor"]}>
              <InstructorReports />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/InstructorSchedule" 
          element={
            <ProtectedRoute allowedRoles={["Instructor"]}>
              <InstructorSchedule />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/InstructorStudentPerformance/:studentId" 
          element={
            <ProtectedRoute allowedRoles={["Instructor"]}>
              <InstructorStudentPerformance />
            </ProtectedRoute>
          } 
        />

        {/* Admin Routes */}
        <Route 
          path="/AdminDashboard" 
          element={
            <ProtectedRoute allowedRoles={["Administrator", "Superadmin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/AdminSettings" 
          element={
            <ProtectedRoute allowedRoles={["Administrator", "Superadmin"]}>
              <AdminSettings />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/AdminManageUsers" 
          element={
            <ProtectedRoute allowedRoles={["Administrator", "Superadmin"]}>
              <AdminManageUsers />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/AdminManageCourses" 
          element={
            <ProtectedRoute allowedRoles={["Administrator", "Superadmin"]}>
              <AdminManageCourses />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/AdminManageRegistrationRequests"
          element={
            <ProtectedRoute allowedRoles={["Administrator", "Superadmin"]}>
              <AdminManageRegistrationRequest />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/AdminChangePasswords" 
          element={
            <ProtectedRoute allowedRoles={["Administrator", "Superadmin"]}>
              <AdminChangePasswords />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/AdminFacultyLogs" 
          element={
            <ProtectedRoute allowedRoles={["Administrator", "Superadmin"]}>
              <AdminFacultyLogs />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/AdminStudentLogs" 
          element={
            <ProtectedRoute allowedRoles={["Administrator", "Superadmin"]}>
              <AdminStudentLogs />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/AdminLogs" 
          element={
            <ProtectedRoute allowedRoles={["Administrator", "Superadmin"]}>
              <AdminLogs />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/AdminReports" 
          element={
            <ProtectedRoute allowedRoles={["Administrator", "Superadmin"]}>
              <AdminReports />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/AdminDatabase" 
          element={
            <ProtectedRoute allowedRoles={["Administrator", "Superadmin"]}>
              <AdminDatabaseManagement />
            </ProtectedRoute>
          } 
        />

        {/* Librarian Routes */}
        <Route 
          path="/LibrarianDashboard" 
          element={
            <ProtectedRoute allowedRoles={["Librarian"]}>
              <LibrarianDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/LibrarianManageBooks" 
          element={
            <ProtectedRoute allowedRoles={["Librarian"]}>
              <LibrarianManageBooks />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/LibrarianBorrowReturn"
          element={
            <ProtectedRoute allowedRoles={["Librarian"]}>
              <LibrarianBorrowReturn />
            </ProtectedRoute>
          }
        />
        <Route
          path="/LibrarianBookRequests"
          element={
            <ProtectedRoute allowedRoles={["Librarian"]}>
              <LibrarianBookRequests />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/LibrarianReport" 
          element={
            <ProtectedRoute allowedRoles={["Librarian"]}>
              <LibrarianReport />
            </ProtectedRoute>
          } 
        />
        {/* Accounting Routes */}
        <Route 
          path="/AccountingDashboard" 
          element={
            <ProtectedRoute allowedRoles={["Accounting"]}>
              <AccountingDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/AccountingStudents" 
          element={
            <ProtectedRoute allowedRoles={["Accounting"]}>
              <AccountingStudents />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/AccountingStudent/:student_id/ledger" 
          element={
            <ProtectedRoute allowedRoles={["Accounting"]}>
              <AccountingStudentLedger />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/AccountingFees" 
          element={
            <ProtectedRoute allowedRoles={["Accounting"]}>
              <AccountingFees />
            </ProtectedRoute>
          } 
        />

        {/* Student Account Route */}
        <Route 
          path="/MyAccount" 
          element={
            <ProtectedRoute allowedRoles={["Student"]}>
              <StudentAccount />
            </ProtectedRoute>
          } 
        />

        {/* Miscellaneous Routes */}
        <Route 
          path="/BookSearch" 
          element={
            <ProtectedRoute allowedRoles={["Student", "Instructor", "Librarian", "Administrator", "Superadmin"]}>
              <UserBookSearch />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/UserBorrowBooks" 
          element={
            <ProtectedRoute allowedRoles={["Student", "Instructor", "Librarian", "Administrator", "Superadmin"]}>
              <UserBorrowBooks />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/UserReturnBooks" 
          element={
            <ProtectedRoute allowedRoles={["Student", "Instructor", "Librarian", "Administrator", "Superadmin"]}>
              <UserReturnBooks />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/InstructorBookSearch" 
          element={
            <ProtectedRoute allowedRoles={["Instructor"]}>
              <InstructorBookSearch />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/InstructorBorrowBooks" 
          element={
            <ProtectedRoute allowedRoles={["Instructor"]}>
              <InstructorBorrowBooks />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/InstructorReturnBooks" 
          element={
            <ProtectedRoute allowedRoles={["Instructor"]}>
              <InstructorReturnBooks />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Suspense>
  );
}
