// React and hooks
import { useEffect, useState } from "react";

// React Router
import { useLocation, useNavigate } from "react-router-dom";

// Auth Context
import { useAuth } from "../context/AuthContext";
import { useSchoolYear } from "../context/SchoolYearContext";

// Hooks
import { 
  useStudentCourses, 
  useStudentContents, 
  useStudentSections, 
  useStudentPerformance 
} from "../hooks/useQueries";

// Skeletons
import { 
  MetricCardSkeleton, 
  TimelineSkeleton, 
  CalendarSkeleton, 
  CoursePerformanceSkeleton 
} from "./components/Skeletons";

// MUI components and theming
import { Box, CircularProgress } from "@mui/material";
import { useTheme } from "@mui/material/styles";

// Custom components
import Sidebar from "./components/Sidebar";
import StudentTimeline from "./components/StudentTimeline";
import StudentCustomCalendar from "./components/StudentCustomCalendar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// Lucide Icons
import {
  Calendar,
  ClipboardList,
  BookOpen,
  AlertCircle,
  TrendingUp,
  Award,
  ChevronRight,
} from "lucide-react";

// Interfaces for data structures
interface Content {
 content_id: number;
 section: number;
 content_title: string;
 content_type: "Activity" | "File" | "Announcement";
 due_date?: string;
 order_in_section?: number;
 file_path?: string;
 is_active: boolean;
 content_description?: string;
 grade_status?: "Pending" | "Submitted" | "Graded" | "Late";
}

interface Section {
 section_id: number;
 course: number;
 section_title: string;
 description?: string;
 order_in_course?: number;
}

interface Course {
 course_id: number;
 course_code: string;
 course_title: string;
 description?: string;
 instructor: number;
}

interface Activity {
 content_id: number;
 content_title: string;
 normalized_score: number;
}

interface CourseData {
 course_id: number;
 course_code: string;
 course_title: string;
 activities: Activity[];
}

export default function StudentDashboard() {
 // Hooks
 const theme = useTheme();
 const navigate = useNavigate();
 const location = useLocation();
 const { user, loading: authLoading } = useAuth();
 const { selectedSchoolYear, setSelectedSchoolYear, schoolYears } = useSchoolYear();

 // State
 const [isSidebarOpen, setIsSidebarOpen] = useState(false);

 // Queries
 const coursesQuery = useStudentCourses(selectedSchoolYear);
 const contentsQuery = useStudentContents(selectedSchoolYear);
 const sectionsQuery = useStudentSections(selectedSchoolYear);
 const performanceQuery = useStudentPerformance(selectedSchoolYear);

 // Effects
 useEffect(() => {
  if (authLoading) return;

  if (!user || user.user_type !== "Student") {
   navigate("/");
   return;
  }
 }, [user, authLoading, navigate]);

 // Loading UI for Auth
 if (authLoading)
  return (
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

 // Ensure user exists after auth check
 if (!user) return null;

 const contents = (contentsQuery.data as Content[]) || [];
 const sections = (sectionsQuery.data as Section[]) || [];
 const courses = (coursesQuery.data as Course[]) || [];
 const performanceData = (performanceQuery.data?.courses as CourseData[]) || [];

 // Sidebar logic
 const currentPath = location.pathname;

 const handleSidebarToggle = () => {
  setIsSidebarOpen(!isSidebarOpen);
 };

 // Calculate statistics
 const pendingActivities = contents.filter(
  (c) =>
   c.content_type === "Activity" &&
   (!c.grade_status || c.grade_status === "Pending")
 ).length;

 const overdueActivities = contents.filter((c) => {
  if (c.content_type !== "Activity" || !c.due_date) return false;
  if (c.grade_status && c.grade_status !== "Pending") return false;
  return new Date(c.due_date) < new Date();
 }).length;

 const enrolledCourses = courses.length;

 // Calculate average score for a course
 const calculateAverage = (activities: Activity[]) => {
  if (activities.length === 0) return 0;
  const sum = activities.reduce((acc, a) => acc + a.normalized_score, 0);
  return (sum / activities.length).toFixed(1);
 };

  // Overall average from backend
  const overallAvg = performanceQuery.data?.overall_average || 0;

 // Calendar logic
 function transformContentsForCalendar(contents: Content[]) {
  return contents
   .filter(
    (c) =>
     c.content_type === "Activity" &&
     c.due_date &&
     (!c.grade_status || c.grade_status === "Pending")
   )
   .map((c) => {
    const dueDate = new Date(c.due_date!);
    const isOverdue = dueDate < new Date();

    return {
     title: `${c.content_title}${isOverdue ? " (Overdue)" : ""}`,
     start: c.due_date,
     backgroundColor: isOverdue
      ? theme.palette.error.main
      : theme.palette.secondary.main,
     borderColor: isOverdue
      ? theme.palette.error.main
      : theme.palette.secondary.main,
     textColor: theme.palette.secondary.contrastText,
    };
   });
 }


 return (
  <Box
   sx={{
    height: "100vh",
    overflowY: "auto",
    backgroundColor: theme.palette.background.default,
   }}
  >
   <Sidebar
    userRole={"student"}
    currentPath={currentPath}
    open={isSidebarOpen}
    onClose={handleSidebarToggle}
   />

   <Navbar handleSidebarToggle={handleSidebarToggle} />

   <div className="min-h-screen pt-20 p-4 md:pt-28 md:ml-52">
     {/* Dashboard Title */}
     <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
       <div className="flex items-center gap-3">
        <ClipboardList className="w-4 h-4 md:w-6 md:h-6 text-[#0a1a3b]" />
        <h1 className="text-2xl md:text-2xl font-bold bg-gradient-to-r from-[#0a1a3b] via-[#0f2e6b] to-[#0a1a3b] bg-clip-text text-transparent">
         {user ? `Welcome, ${user.first_name}!` : "Welcome back!"}
        </h1>
       </div>
       <p className="text-1xl text-gray-600 mt-1">
        Track your progress and manage your assignments
       </p>
      </div>

      {/* Page-Specific School Year Filter */}
      <div className="relative min-w-[200px] max-w-xs">
       <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
       <select
        value={selectedSchoolYear}
        onChange={(e) => setSelectedSchoolYear(e.target.value)}
        className="w-full pl-10 pr-10 py-2.5 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:outline-none transition-colors appearance-none bg-white text-sm font-semibold text-gray-700 cursor-pointer"
       >
        <option value="All">All Semesters</option>
        {schoolYears.map((sy) => (
         <option key={sy.school_year_id} value={sy.school_year}>
          {sy.school_year}
         </option>
        ))}
       </select>
       <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none rotate-90" />
      </div>
     </div>

    {/* Dashboard Cards */}
    <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 mb-8">
     {/* Enrolled Courses Card */}
     {coursesQuery.isLoading ? (
       <MetricCardSkeleton />
     ) : (
       <div className="relative overflow-hidden rounded-lg sm:rounded-xl md:rounded-2xl shadow-xl bg-gradient-to-br from-blue-400 via-cyan-500 to-blue-600 p-2 sm:p-4 md:p-6 transform transition-all duration-300 hover:scale-105">
        <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 bg-white opacity-10 rounded-full -mr-8 -mt-8 sm:-mr-12 sm:-mt-12 md:-mr-16 md:-mt-16"></div>
        <div className="relative z-10">
         <p className="text-blue-100 text-[8px] sm:text-xs md:text-sm font-semibold uppercase tracking-wide mb-1 sm:mb-2 md:mb-4">
          Enrolled Courses
         </p>
         <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
           <div className="bg-white bg-opacity-20 backdrop-blur-sm p-1 sm:p-2 md:p-4 rounded-lg md:rounded-xl">
            <BookOpen className="w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 text-black" />
           </div>
           <p className="text-xl sm:text-3xl md:text-5xl font-bold text-white">
            {enrolledCourses}
           </p>
          </div>
         </div>
        </div>
       </div>
     )}

     {/* Pending Activities Card */}
     {contentsQuery.isLoading ? (
       <MetricCardSkeleton />
     ) : (
       <div className="relative overflow-hidden rounded-lg sm:rounded-xl md:rounded-2xl shadow-xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 p-2 sm:p-4 md:p-6 transform transition-all duration-300 hover:scale-105">
        <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 bg-white opacity-10 rounded-full -mr-8 -mt-8 sm:-mr-12 sm:-mt-12 md:-mr-16 md:-mt-16"></div>
        <div className="relative z-10">
         <p className="text-sky-100 text-[8px] sm:text-xs md:text-sm font-semibold uppercase tracking-wide mb-1 sm:mb-2 md:mb-4">
          Pending Activities
         </p>
         <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
           <div className="bg-white bg-opacity-20 backdrop-blur-sm p-1 sm:p-2 md:p-4 rounded-lg md:rounded-xl">
            <ClipboardList className="w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 text-black" />
           </div>
           <p className="text-xl sm:text-3xl md:text-5xl font-bold text-white">
            {pendingActivities}
           </p>
          </div>
         </div>
        </div>
       </div>
     )}

     {/* Overdue Activities Card */}
     {contentsQuery.isLoading ? (
       <MetricCardSkeleton />
     ) : (
       <div className="relative overflow-hidden rounded-lg sm:rounded-xl md:rounded-2xl shadow-xl bg-gradient-to-br from-red-500 via-pink-500 to-rose-600 p-2 sm:p-4 md:p-6 transform transition-all duration-300 hover:scale-105">
        <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 bg-white opacity-10 rounded-full -mr-8 -mt-8 sm:-mr-12 sm:-mt-12 md:-mr-16 md:-mt-16"></div>
        <div className="relative z-10">
         <p className="text-red-100 text-[8px] sm:text-xs md:text-sm font-semibold uppercase tracking-wide mb-1 sm:mb-2 md:mb-4">
          Overdue Activities
         </p>
         <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
           <div className="bg-white bg-opacity-20 backdrop-blur-sm p-1 sm:p-2 md:p-4 rounded-lg md:rounded-xl">
            <AlertCircle className="w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 text-black" />
           </div>
           <p className="text-xl sm:text-3xl md:text-5xl font-bold text-white">
            {overdueActivities}
           </p>
          </div>
         </div>
        </div>
       </div>
     )}
    </div>

    {/* Upcoming Activities and Performance Section */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
     {/* Upcoming Activities - Takes 2 columns */}
     <div className="lg:col-span-2">
      <div className="rounded-2xl shadow-xl bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4 sm:p-6 h-full">
       <div className="flex items-center gap-3 mb-4">
        <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 text-gray-900" />
        <h2 className="text-1xl font-bold text-gray-900">
         Upcoming Activities
        </h2>
       </div>
       <div className="bg-white rounded-xl p-3 sm:p-4">
        {contentsQuery.isLoading || sectionsQuery.isLoading || coursesQuery.isLoading ? (
          <TimelineSkeleton />
        ) : (
          <StudentTimeline
           contents={contents}
           sections={sections}
           courses={courses}
          />
        )}
       </div>
      </div>
     </div>

     {/* Performance Overview - Takes 1 column */}
     <div className="lg:col-span-1">
      <div className="rounded-2xl shadow-xl bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-4 sm:p-6 h-full">
       <div className="flex items-center gap-3 mb-4">
        <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-gray-900" />
        <h2 className="text-1xl font-bold text-gray-900">
         Performance Overview
        </h2>
       </div>

       {performanceQuery.isLoading ? (
         <CoursePerformanceSkeleton />
       ) : performanceData.length === 0 ? (
        <div className="bg-white rounded-xl p-6 flex flex-col items-center justify-center text-center h-64">
         <Award className="w-12 h-12 text-gray-300 mb-3" />
         <p className="text-gray-500 font-medium mb-1">
          No grades yet
         </p>
         <p className="text-sm text-gray-400">
          Complete activities to see your performance
         </p>
        </div>
       ) : (
        <div className="space-y-4">
         {/* Overall Average Card */}
         <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 via-indigo-600 to-purple-700 p-4 shadow-lg">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative z-10">
           <div className="flex items-center gap-2 mb-2">
            <Award className="w-5 h-5 text-purple-200" />
            <p className="text-purple-100 text-xs font-semibold uppercase tracking-wide">
             Overall Average
            </p>
           </div>
           <p className="text-4xl font-bold text-white mb-1">
            {overallAvg}%
           </p>
           <p className="text-purple-200 text-xs">
            Across all courses
           </p>
          </div>
         </div>

         {/* Course Scores */}
         <div className="bg-white rounded-xl p-4 max-h-96 overflow-y-auto">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
           Course Breakdown
          </h3>
          <div className="space-y-3">
           {performanceData.map((course) => {
            const avg = calculateAverage(course.activities);
            const avgNum = parseFloat(String(avg));

            return (
             <div
              key={course.course_id}
              className="group p-3 rounded-lg border-2 border-gray-100 hover:border-purple-200 hover:shadow-md transition-all duration-200"
             >
              <div className="flex items-start justify-between gap-2 mb-2">
               <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900 truncate group-hover:text-purple-700 transition-colors">
                 {course.course_title}
                </h4>
                <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold text-purple-700 bg-purple-100 rounded-full">
                 {course.course_code}
                </span>
               </div>
               <div className="flex-shrink-0">
                <div
                 className={`px-3 py-1 rounded-full text-sm font-bold ${
                  avgNum >= 90
                   ? "bg-green-100 text-green-700"
                   : avgNum >= 75
                   ? "bg-blue-100 text-blue-700"
                   : avgNum >= 60
                   ? "bg-yellow-100 text-yellow-700"
                   : "bg-red-100 text-red-700"
                 }`}
                >
                 {avg}%
                </div>
               </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
               <div
                className={`h-full rounded-full transition-all duration-500 ${
                 avgNum >= 90
                  ? "bg-gradient-to-r from-green-400 to-green-600"
                  : avgNum >= 75
                  ? "bg-gradient-to-r from-blue-400 to-blue-600"
                  : avgNum >= 60
                  ? "bg-gradient-to-r from-yellow-400 to-yellow-600"
                  : "bg-gradient-to-r from-red-400 to-red-600"
                }`}
                style={{ width: `${avgNum}%` }}
               ></div>
              </div>

              <p className="text-xs text-gray-500 mt-2">
               {course.activities.length}{" "}
               {course.activities.length === 1
                ? "activity"
                : "activities"}{" "}
               graded
              </p>
             </div>
            );
           })}
          </div>
         </div>
        </div>
       )}
      </div>
     </div>
    </div>

    {/* Calendar Section */}
    <div className="mb-8">
     <div className="rounded-2xl shadow-xl bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
       <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-gray-900" />
       <h2 className="text-1xl font-bold text-gray-900">
        Activity Calendar
       </h2>
      </div>
      <div className="bg-white rounded-xl p-3 sm:p-4 overflow-x-auto">
       <div className="min-w-[700px]">
        {contentsQuery.isLoading ? (
          <CalendarSkeleton />
        ) : (
          <StudentCustomCalendar
           calendarEvents={transformContentsForCalendar(contents)}
          />
        )}
       </div>
      </div>
     </div>
    </div>
   </div>
    <div className="md:ml-52">
     <Footer />
    </div>
   </Box>
  );
}
