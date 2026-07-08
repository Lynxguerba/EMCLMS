// React and routing
import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

// Auth Context
import { useAuth } from "../context/AuthContext";

// MUI components
import { Box, Collapse, IconButton, CircularProgress } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { LineChart } from "@mui/x-charts/LineChart";

// Custom components
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// Hooks
import { useStudentPerformanceForInstructor } from "../hooks/useQueries";
import { PerformanceSkeleton } from "./components/Skeletons";

// Lucide Icons
import {
 TrendingUp,
 ChevronDown,
 ChevronUp,
 BarChart3,
 BookOpen,
 Award,
 ArrowLeft,
} from "lucide-react";

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

export default function InstructorStudentPerformance() {
 const { studentId } = useParams<{ studentId: string }>();
 const theme = useTheme();
 const location = useLocation();
 const navigate = useNavigate();
 const currentPath = location.pathname;
 const { user, loading: authLoading } = useAuth();

 const [isSidebarOpen, setIsSidebarOpen] = useState(false);
 const [openCourses, setOpenCourses] = useState<Record<number, boolean>>({});

 // Query
 const { data: performanceData, isLoading: dataLoading, error } = useStudentPerformanceForInstructor(studentId || "");
 const courses: CourseData[] = performanceData?.courses || [];

 useEffect(() => {
  if (authLoading) return;

  if (!user || user.user_type !== "Instructor") {
   navigate("/");
   return;
  }
 }, [user, authLoading, navigate]);

 // Toggle sidebar open/close
 const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);

 // Toggle course expand/collapse
 const handleCourseToggle = (id: number) =>
  setOpenCourses((prev) => ({ ...prev, [id]: !prev[id] }));

 // Calculate average score for a course
 const calculateAverage = (activities: Activity[]) => {
  if (activities.length === 0) return 0;
  const sum = activities.reduce((acc, a) => acc + a.normalized_score, 0);
  return (sum / activities.length).toFixed(1);
 };

 if (authLoading) {
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
 }

 if (error) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <p className="text-red-500 font-bold">Error loading performance data</p>
            <button onClick={() => navigate(-1)} className="mt-4 flex items-center gap-2 text-blue-600 hover:underline">
                <ArrowLeft className="w-4 h-4" /> Go Back
            </button>
        </Box>
    )
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
    userRole="instructor"
    currentPath={currentPath}
    open={isSidebarOpen}
    onClose={handleSidebarToggle}
   />
   <Navbar handleSidebarToggle={handleSidebarToggle} />

   <div className="min-h-screen pt-8 p-4 mt-6 md:-mt-2 md:ml-52">
    {/* Page Header */}
    <div className="mb-8">
     <button 
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
     >
        <ArrowLeft className="w-4 h-4" /> Back to Students
     </button>
     <div className="flex items-center gap-3 mb-2">
      <TrendingUp className="w-6 h-6  text-[#0a1a3b]" />
      <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0a1a3b] via-[#0f2e6b] to-[#0a1a3b] bg-clip-text text-transparent">
       Student Performance Analytics
      </h1>
     </div>
     <p className="text-1xl">
      Viewing performance for <span className="font-bold text-[#0a1a3b]">{performanceData?.student_name || "Student"}</span>
     </p>
    </div>

    {/* Overall Performance Card */}
    {!dataLoading && courses.length > 0 && (
      <div className="mb-8 max-w-md">
       <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-600 to-blue-700 p-6 shadow-xl transform transition-all duration-300 hover:scale-105">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
        <div className="relative z-10">
         <div className="flex items-center gap-4 mb-4">
          <Award className="w-8 h-8 text-white bg-white/20 p-1.5 rounded-xl shadow-lg ring-1 ring-white/30" />
          <p className="text-white text-base font-bold uppercase tracking-wider">
           Academic Performance Avg
          </p>
         </div>
         <div className="flex items-baseline gap-2">
          <p className="text-5xl font-bold text-white">
           {performanceData?.overall_average || 0}%
          </p>
          <p className="text-blue-200 text-sm opacity-80">
           cumulative
          </p>
         </div>
         <p className="text-blue-100 text-xs mt-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400"></span>
          Based on {courses.length} enrolled {courses.length === 1 ? 'course' : 'courses'}
         </p>
        </div>
       </div>
      </div>
    )}

    {/* Main Content Card */}
    <div className="rounded-2xl shadow-xl bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6">
     {/* Course Count */}
     <div className="mb-6 flex items-center gap-2 text-sm text-gray-600">
      <BarChart3 className="w-4 h-4" />
      <span>
       {courses.length} {courses.length === 1 ? "course" : "courses"}{" "}
       tracked
      </span>
     </div>

     {/* Courses Grid */}
     {dataLoading ? (
       <PerformanceSkeleton />
     ) : courses.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
       <BarChart3 className="w-16 h-16 mb-4 opacity-50" />
       <p className="text-lg font-medium">No performance data yet</p>
       <p className="text-sm">
        Student has not completed any activities yet
       </p>
      </div>
     ) : (
      <div className="grid grid-cols-1 gap-6">
       {courses.map((course) => {
        const isOpen = openCourses[course.course_id] || false;
        const avgScore = calculateAverage(course.activities);

        const categories = course.activities.map(
         (_a, index) => `Activity ${index + 1}`
        );
        const dataPoints = course.activities.map(
         (a) => a.normalized_score
        );

        return (
         <div
          key={course.course_id}
          className="group rounded-xl border-2 border-gray-200 bg-white transition-all duration-300 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100 overflow-hidden"
         >
          {/* Course Header */}
          <div
           onClick={() => handleCourseToggle(course.course_id)}
           className="cursor-pointer p-5 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all"
          >
           <div className="flex items-start gap-4">
            {/* Course Icon */}
            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
             <BookOpen className="w-7 h-7 text-white" />
            </div>

            {/* Course Info */}
            <div className="flex-1 min-w-0">
             <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
              {course.course_title}
             </h3>
             <span className="inline-block px-2 py-0.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full mb-2">
              {course.course_code}
             </span>

             {/* Stats */}
             <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-2">
               <BarChart3 className="w-4 h-4 text-gray-500" />
               <span className="text-sm text-gray-600">
                {course.activities.length}{" "}
                {course.activities.length === 1
                 ? "activity"
                 : "activities"}
               </span>
              </div>
              <div className="flex items-center gap-2">
               <TrendingUp className="w-4 h-4 text-green-500" />
               <span className="text-sm font-semibold text-gray-900">
                Avg: {avgScore}%
               </span>
              </div>
             </div>
            </div>

            {/* Expand Button */}
            <IconButton
             size="small"
             onClick={(e) => {
              e.stopPropagation();
              handleCourseToggle(course.course_id);
             }}
             sx={{
              color: "gray.600",
              "&:hover": { color: "blue.600" },
             }}
            >
             {isOpen ? (
              <ChevronUp className="w-5 h-5" />
             ) : (
              <ChevronDown className="w-5 h-5" />
             )}
            </IconButton>
           </div>
          </div>

          {/* Collapsible Chart Section */}
          <Collapse in={isOpen}>
           <div
            className="p-5 bg-white border-t-2 border-gray-100"
            onClick={(e) => e.stopPropagation()}
           >
            <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
             <TrendingUp className="w-4 h-4" />
             Performance Trend
            </h4>

            {course.activities.length > 0 ? (
             <div className="bg-gray-50 rounded-lg p-4">
              <LineChart
               series={[
                {
                 data: dataPoints,
                 curve: "catmullRom",
                 label: "Score (%)",
                 color: theme.palette.primary.main,
                },
               ]}
               xAxis={[
                {
                 data: categories,
                 scaleType: "point",
                },
               ]}
               yAxis={[
                {
                 min: 0,
                 max: 100,
                },
               ]}
               height={300}
               margin={{
                top: 20,
                right: 20,
                bottom: 40,
                left: 40,
               }}
              />

              {/* Activity Details */}
              <div className="mt-4 space-y-2">
               <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Activity Breakdown
               </h5>
               <div className="max-h-48 overflow-y-auto space-y-2">
                {course.activities.map((activity, index) => (
                 <div
                  key={activity.content_id}
                  className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                 >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                   <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold flex items-center justify-center">
                    {index + 1}
                   </span>
                   <span className="text-sm text-gray-700 truncate">
                    {activity.content_title}
                   </span>
                  </div>
                  <span
                   className={`flex-shrink-0 ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                    activity.normalized_score >= 90
                     ? "bg-green-100 text-green-700"
                     : activity.normalized_score >= 75
                     ? "bg-blue-100 text-blue-700"
                     : activity.normalized_score >= 60
                     ? "bg-yellow-100 text-yellow-700"
                     : "bg-red-100 text-red-700"
                   }`}
                  >
                   {activity.normalized_score.toFixed(1)}%
                  </span>
                 </div>
                ))}
               </div>
              </div>
             </div>
            ) : (
             <div className="text-center py-8 text-gray-400">
              <p className="text-sm">No activities yet</p>
             </div>
            )}
           </div>
          </Collapse>
         </div>
        );
       })}
      </div>
     )}
    </div>
   </div>
    <div className="md:ml-52">
     <Footer />
    </div>
   </Box>
  );
}
