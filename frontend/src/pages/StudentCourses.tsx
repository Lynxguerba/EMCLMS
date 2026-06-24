// React and routing imports
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Auth Context
import { useAuth } from "../context/AuthContext";
import { useSchoolYear } from "../context/SchoolYearContext";

// Hooks
import { useStudentCourses } from "../hooks/useQueries";

// MUI components and hooks
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";

// Custom components
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import { CourseCardSkeleton } from "./components/Skeletons";

 import {
  BookOpen,
  Search,
  Grid3x3,
  List,
  CalendarDays,
  Calendar,
 GraduationCap,
 ChevronRight,
} from "lucide-react";

 interface Course {
  course_id: string;
  course_title: string;
  course_code: string;
  description: string;
  instructor: string;
  instructor_fullname: string;
  school_year: string;
  schedules?: { day_of_week: string; start_time: string; end_time: string }[];
}

import WeeklyScheduleGrid, { ScheduleEvent } from "./components/WeeklyScheduleGrid";

export default function StudentCourses() {
 // Theme
 const theme = useTheme();

 // Router
 const location = useLocation();
 const currentPath = location.pathname;
 const navigate = useNavigate();
 const { user, loading: authLoading } = useAuth();
 const { selectedSchoolYear, setSelectedSchoolYear, schoolYears } = useSchoolYear();

 // ===== TanStack Query Hooks =====
 const { data: courses = [], isLoading: coursesLoading } = useStudentCourses(selectedSchoolYear);

 // Sidebar state and logic
 const [isSidebarOpen, setIsSidebarOpen] = useState(false);
 const handleSidebarToggle = () => {
  setIsSidebarOpen(!isSidebarOpen);
 };

 // Courses view state
 const [view, setView] = useState<"grid" | "list" | "calendar">("grid");
 const [search, setSearch] = useState("");

 // Validate session
 useEffect(() => {
  if (authLoading) return;

  if (!user || user.user_type !== "Student") {
   navigate("/");
   return;
  }
 }, [user, authLoading, navigate]);

 // Filtered courses
 const filteredCourses = (courses as Course[]).filter((course) => {
  const matchesSearch = course.course_title
   .toLowerCase()
   .includes(search.toLowerCase());
  const matchesSemester =
   selectedSchoolYear === "All" || course.school_year === selectedSchoolYear;
   return matchesSearch && matchesSemester;
  });

  const calendarEvents: ScheduleEvent[] = filteredCourses.flatMap((course) => {
    if (!course.schedules) return [];
    return course.schedules.map(sch => ({
      ...sch,
      title: course.course_code,
      subtitle: course.course_title,
    }));
  });

  return (
  <Box
   sx={{
    height: "100vh",
    overflowY: "auto",
    backgroundColor: theme.palette.background.default,
   }}
  >
   {/* Sidebar - Always rendered */}
   <Sidebar
    userRole={"student"}
    currentPath={currentPath}
    open={isSidebarOpen}
    onClose={handleSidebarToggle}
   />

   {/* Navbar - Always rendered */}
   <Navbar handleSidebarToggle={handleSidebarToggle} />

   <div className="min-h-screen pt-8 p-4 mt-6 md:-mt-2 md:ml-52">
    {/* Page Header */}
    <div className="mb-8">
     <div className="flex items-center gap-3 mb-2">
      <GraduationCap className="w-6 h-6 text-[#0a1a3b]" />
      <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0a1a3b] via-[#0f2e6b] to-[#0a1a3b] bg-clip-text text-transparent">
       Your Courses
      </h1>
     </div>
     <p className="text-1xl">Explore and manage your enrolled courses</p>
    </div>

    {/* Main Content Area */}
    {authLoading || (coursesLoading && courses.length === 0) ? (
      <div className="rounded-2xl shadow-xl bg-white p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6 animate-pulse">
          <div className="flex-1 h-11 bg-gray-100 rounded-lg"></div>
          <div className="w-full sm:w-48 h-11 bg-gray-100 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      </div>
    ) : (
      <div className="rounded-2xl shadow-xl bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6">
       {/* Search and Filter Bar */}
       <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search Input */}
        <div className="flex-1 relative">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
         <input
          type="text"
          placeholder="Search courses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:outline-none transition-colors"
         />
        </div>

        {/* Semester Filter */}
        <div className="relative min-w-[200px]">
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

        {/* View Toggle */}
        <div className="hidden sm:flex gap-2 bg-gray-100 p-1 rounded-lg">
         <button
          onClick={() => setView("grid")}
          className={`p-2 rounded-md transition-all ${
           view === "grid"
            ? "bg-white shadow-md text-blue-600"
            : "text-gray-500 hover:text-gray-700"
          }`}
         >
          <Grid3x3 className="w-5 h-5" />
         </button>
         <button
          onClick={() => setView("list")}
          className={`p-2 rounded-md transition-all ${
           view === "list"
            ? "bg-white shadow-md text-blue-600"
            : "text-gray-500 hover:text-gray-700"
          }`}
         >
          <List className="w-5 h-5" />
         </button>
         <button
          onClick={() => setView("calendar")}
          className={`p-2 rounded-md transition-all ${
           view === "calendar"
            ? "bg-white shadow-md text-blue-600"
            : "text-gray-500 hover:text-gray-700"
          }`}
         >
          <CalendarDays className="w-5 h-5" />
         </button>
        </div>
       </div>

       {/* Course Count */}
       <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
        <BookOpen className="w-4 h-4" />
        <span>
         {filteredCourses.length}{" "}
         {filteredCourses.length === 1 ? "course" : "courses"} found
        </span>
       </div>

       {/* Courses Grid/List */}
       {filteredCourses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
         <BookOpen className="w-16 h-16 mb-4 opacity-50" />
         <p className="text-lg font-medium">No courses found</p>
         <p className="text-sm">Try adjusting your search or filters</p>
        </div>
       ) : view === "calendar" ? (
        <WeeklyScheduleGrid events={calendarEvents} />
       ) : (
        <div
         className={
          view === "grid"
           ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
           : "flex flex-col gap-4"
         }
        >
         {filteredCourses.map((course) => (
          <div
           key={course.course_id}
           onClick={() => navigate(`/Course/${course.course_id}`)}
           className={`group cursor-pointer rounded-xl border-2 border-gray-200 bg-white p-5 transition-all duration-300 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100 ${
            view === "list" ? "flex items-center gap-4" : ""
           }`}
          >
           {/* Course Icon */}
           <div
            className={`flex-shrink-0 ${
             view === "list" ? "w-16 h-16" : "w-14 h-14 mb-4"
            } rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
           >
            <BookOpen className="w-8 h-8 text-white" />
           </div>

           {/* Course Content */}
           <div className="flex-1 min-w-0">
            {/* Course Title and Code */}
            <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-2">
             {course.course_title}
            </h3>
            <span className="inline-block px-2 py-0.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full mb-2">
             {course.course_code}
            </span>

            {/* Instructor Name */}
            <p className="text-xs font-medium text-gray-500 mb-2">
             Instructor: {course.instructor_fullname}
            </p>

            {/* Course Description */}
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
             {course.description || "No description available"}
            </p>

            {/* School Year Badge */}
            <div className="flex items-center justify-between">
             <span className="text-xs text-gray-500 font-medium">
              {course.school_year}
             </span>
             <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
           </div>
          </div>
         ))}
        </div>
       )}
      </div>
    )}
   </div>
  </Box>
 );
}
