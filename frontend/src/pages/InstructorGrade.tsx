// External UI library imports
import { Box, CircularProgress } from "@mui/material";
import { useTheme } from "@mui/material/styles";

// React and router hooks
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Auth Context
import { useAuth } from "../context/AuthContext";
import { useSchoolYear } from "../context/SchoolYearContext";

// Lucide Icons
import { Search, Grid3x3, List, BookOpen, GraduationCap, Calendar, ChevronRight } from "lucide-react";

// Internal component imports
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

// Hooks
import { useInstructorCourses } from "../hooks/useQueries";

// Type definition for course structure
type Course = {
 course_id: number;
 course_title: string;
 course_code: string;
 description: string;
 school_year: string;
};

export default function InstructorGrade() {
 // Imports
 const theme = useTheme();
 const navigate = useNavigate();
 const location = useLocation();
 const { user, loading: authLoading } = useAuth();
 const { selectedSchoolYear, setSelectedSchoolYear, schoolYears } = useSchoolYear();

 // Queries
 const { data: courses = [], isLoading: coursesLoading } = useInstructorCourses(selectedSchoolYear);

 // State Declarations
 const [search, setSearch] = useState("");
 const [view, setView] = useState<"grid" | "list">("grid");
 const [isSidebarOpen, setIsSidebarOpen] = useState(false);

 // Current Path
 const currentPath = location.pathname;

 // Toggle Sidebar Handler
 const handleSidebarToggle = () => {
  setIsSidebarOpen(!isSidebarOpen);
 };

 // Fetch User Session and Courses
 useEffect(() => {
  if (authLoading) return;

  if (!user || user.user_type !== "Instructor") {
   navigate("/");
   return;
  }
 }, [user, authLoading, navigate]);

 // Filtered Courses based on search input
 const filteredCourses = courses.filter((course: Course) => {
  const matchesSearch =
   course.course_title.toLowerCase().includes(search.toLowerCase()) ||
   course.course_code.toLowerCase().includes(search.toLowerCase());

  const matchesSemester =
   selectedSchoolYear === "All" || course.school_year === selectedSchoolYear;

  return matchesSearch && matchesSemester;
 });

 // Loading Spinner UI
 if (authLoading || coursesLoading)
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

 return (
  <Box
   sx={{
    height: "100vh",
    overflowY: "auto",
    backgroundColor: theme.palette.background.default,
   }}
  >
   {/* Sidebar for navigation */}
   <Sidebar
    userRole={"instructor"}
    currentPath={currentPath}
    open={isSidebarOpen}
    onClose={handleSidebarToggle}
   />

   {/* Top navigation bar */}
   <Navbar handleSidebarToggle={handleSidebarToggle} />

   <div className="min-h-screen pt-8 p-4 mt-6 md:-mt-2 md:ml-52">
    {/* Page heading */}
    {user && (
     <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
       <GraduationCap className="w-6 h-6 text-[#0a1a3b]" />
       <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0a1a3b] via-[#0f2e6b] to-[#0a1a3b] bg-clip-text text-transparent">
        Score Activities
       </h1>
      </div>
      <p className="text-1xl">
       Select a course to view and grade student activities
      </p>
     </div>
    )}

    {/* Main content container */}
    <div className="bg-white rounded-2xl shadow-lg p-6">
     {/* Search bar and view toggle controls */}
     <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
      {/* Search Input */}
      <div className="relative flex-1">
       <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
       <input
        type="text"
        placeholder="Search courses..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors duration-200"
       />
      </div>

       {/* Course semester filter - Custom Styled */}
       <div className="relative min-w-[200px]">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
        <select
         value={selectedSchoolYear}
         onChange={(e) => setSelectedSchoolYear(e.target.value)}
         className="w-full pl-10 pr-10 py-2.5 border-2 border-gray-200 rounded-lg bg-white focus:border-blue-500 focus:outline-none transition-colors duration-200 appearance-none cursor-pointer text-sm font-semibold text-gray-700"
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

      {/* View Toggle Buttons */}
      <div className="hidden sm:flex bg-gray-100 rounded-xl p-1">
       <button
        onClick={() => setView("grid")}
        className={`p-2.5 rounded-lg transition-all duration-200 ${
         view === "grid"
          ? "bg-white shadow-md text-blue-600"
          : "text-gray-500 hover:text-gray-700"
        }`}
       >
        <Grid3x3 className="w-5 h-5" />
       </button>
       <button
        onClick={() => setView("list")}
        className={`p-2.5 rounded-lg transition-all duration-200 ${
         view === "list"
          ? "bg-white shadow-md text-blue-600"
          : "text-gray-500 hover:text-gray-700"
        }`}
       >
        <List className="w-5 h-5" />
       </button>
      </div>
     </div>

     {/* Course listing - rendered in grid or list view */}
     <div
      className={
       view === "grid"
        ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
        : "flex flex-col gap-4"
      }
     >
      {filteredCourses.length > 0 ? (
       filteredCourses.map((course: Course) => (
        <div
         key={course.course_id}
         onClick={() => navigate(`./Course/${course.course_id}`)}
         className="group bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl p-5 cursor-pointer transition-all duration-300 hover:shadow-xl hover:border-blue-500 hover:-translate-y-1"
        >
         {/* Icon and Title */}
         <div className="flex items-start gap-3 mb-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg group-hover:scale-110 transition-transform duration-300">
           <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
           <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors duration-200 line-clamp-2">
            {course.course_title}
           </h3>
           <p className="text-sm font-medium text-gray-500 mt-0.5">
            {course.course_code}
           </p>
          </div>
         </div>

         {/* Course description */}
         <p className="text-sm text-gray-600 line-clamp-3 mb-3">
          {course.description}
         </p>

         {/* School Year Badge */}
         <div className="flex items-center justify-between">
          <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
           {course.school_year}
          </span>
          <span className="text-blue-600 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200">
           View →
          </span>
         </div>
        </div>
       ))
      ) : (
       <div className="col-span-full text-center py-16">
        <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-600 mb-2">
         No courses found
        </h3>
        <p className="text-gray-500">
         Try adjusting your search or filter criteria
        </p>
       </div>
      )}
     </div>
    </div>
   </div>
  </Box>
 );
}
