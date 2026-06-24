// React and hooks
import { useEffect, useState } from "react";

// React Router
import { useLocation, useNavigate } from "react-router-dom";

// Auth Context
import { useAuth } from "../context/AuthContext";
import { useSchoolYear } from "../context/SchoolYearContext";

// TanStack Query Hooks
import {
  useAdminCourseCount,
  useAdminStudentCount,
  useAdminInstructorCount,
  useAdminProgramData,
  useAdminCourseEnrollments,
  useAdminCourseCompletion,
  useAdminAllUsers,
  useAdminFacultyLogs,
  useAdminStudentLogs,
} from "../hooks/useQueries";

// Skeletons
import {
  MetricCardSkeleton,
  ChartCardSkeleton,
  ProgressListSkeleton,
  CircularProgressSkeleton,
  ActivityFeedSkeleton,
} from "./components/Skeletons";

// MUI components
import { useTheme } from "@mui/material/styles";
import { Box, Avatar } from "@mui/material";

// Charts
import { BarChart, PieChart } from "@mui/x-charts";

// Custom components
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

// Lucide Icons
import {
 BookOpen,
 Users,
 GraduationCap,
 ArrowRight,
 TrendingUp,
 BarChart3,
 PieChart as Piechart1,
 UserPlus,
 Activity,
 Calendar,
 Backpack,
 Briefcase,
 History,
 ChevronRight,
} from "lucide-react";

import {
 differenceInMinutes,
 differenceInHours,
 differenceInDays,
 differenceInWeeks,
 differenceInMonths,
 differenceInYears,
 parseISO,
} from "date-fns";

import { getProfilePictureUrl } from "../utils/imageUtils";

// Define types
interface LogEntry {
 id: string;
 timestamp: string;
 message: string;
 instructor?: string;
 student?: string;
 instructor_id?: string;
 student_id?: string;
 type: "faculty" | "student";
}

interface ActivityItem {
 id: string;
 type: "faculty" | "student";
 message: string;
 time: string;
 person: string;
 personId?: string;
 icon: any;
 color: string;
 bgColor: string;
}

export default function AdminDashboard() {
 // Helper function to format timestamp
 const formatTimestamp = (timestamp: string | null | undefined): string => {
  if (!timestamp) return "—";

  try {
   const date = parseISO(timestamp);
   const now = new Date();
   const minutes = differenceInMinutes(now, date);
   
   if (minutes < 60) return `${minutes} min${minutes !== 1 ? "s" : ""} ago`;
   const hours = differenceInHours(now, date);
   if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
   const days = differenceInDays(now, date);
   if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`;
   const weeks = differenceInWeeks(now, date);
   if (weeks < 4) return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
   const months = differenceInMonths(now, date);
   if (months < 12) return `${months} month${months !== 1 ? "s" : ""} ago`;
   const years = differenceInYears(now, date);
   return `${years} year${years !== 1 ? "s" : ""} ago`;
  } catch (error) {
   return "—";
  }
 };

  // React and Routing Hooks
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { user, loading: authLoading } = useAuth();
  const { selectedSchoolYear, setSelectedSchoolYear, schoolYears } = useSchoolYear();

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);

  // TanStack Queries
  const { data: courseCountData, isLoading: courseCountLoading } = useAdminCourseCount(selectedSchoolYear);
  const { data: studentCountData, isLoading: studentCountLoading } = useAdminStudentCount(selectedSchoolYear);
  const { data: instructorCountData, isLoading: instructorCountLoading } = useAdminInstructorCount(selectedSchoolYear);
  const { data: programDataResponse, isLoading: programDataLoading } = useAdminProgramData(selectedSchoolYear);
  const { data: chartData, isLoading: chartDataLoading } = useAdminCourseEnrollments(selectedSchoolYear);
  const { data: courseCompletionData, isLoading: completionDataLoading } = useAdminCourseCompletion(selectedSchoolYear);
  const { data: allUsers, isLoading: usersLoading } = useAdminAllUsers();
  const { data: facultyLogs, isLoading: facultyLogsLoading } = useAdminFacultyLogs();
  const { data: studentLogs, isLoading: studentLogsLoading } = useAdminStudentLogs();

  // Process and memoize derived data
  const courseCount = courseCountData?.count || 0;
  const studentCount = studentCountData?.count || 0;
  const instructorCount = instructorCountData?.count || 0;
  const programData = programDataResponse?.programs || [];
  
  const lastOnlineUser = Array.isArray(allUsers)
    ? [...allUsers]
        .filter((u: any) => u.last_online)
        .sort((a: any, b: any) => new Date(b.last_online).getTime() - new Date(a.last_online).getTime())
        .slice(0, 6)
    : [];

  const recentActivities: ActivityItem[] = (() => {
    if (!facultyLogs || !studentLogs) return [];
    
    const tempFacultyLogs: LogEntry[] = Array.isArray(facultyLogs) ? facultyLogs.map((log: any) => ({
      id: log.id ? `faculty-${log.id}` : `faculty-${Math.random()}`,
      timestamp: log.timestamp,
      message: log.message || "",
      instructor: log.instructor || "Unknown Faculty",
      instructor_id: log.instructor_id,
      type: "faculty",
    })) : [];

    const tempStudentLogs: LogEntry[] = Array.isArray(studentLogs) ? studentLogs.map((log: any) => ({
      id: log.id ? `student-${log.id}` : `student-${Math.random()}`,
      timestamp: log.timestamp,
      message: log.message || "",
      student: log.student || "Unknown Student",
      student_id: log.student_id,
      type: "student",
    })) : [];

    const allLogs = [...tempFacultyLogs, ...tempStudentLogs].sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });

    return allLogs.slice(0, 5).map((log) => ({
      id: log.id,
      type: log.type as "faculty" | "student",
      message: log.message || "No activity message",
      person: log.type === "faculty" ? log.instructor || "Unknown Faculty" : log.student || "Unknown Student",
      personId: log.type === "faculty" ? String(log.instructor_id || "") : String(log.student_id || ""),
      time: formatTimestamp(log.timestamp),
      icon: log.type === "faculty" ? Users : UserPlus,
      color: log.type === "faculty" ? "text-blue-600" : "text-green-600",
      bgColor: log.type === "faculty" ? "bg-blue-50" : "bg-green-50",
    }));
  })();

  const activitiesLoading = facultyLogsLoading || studentLogsLoading;

  // Authentication Check
  useEffect(() => {
    if (!authLoading && (!user || (user.user_type !== "Administrator" && user.user_type !== "Superadmin"))) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  if (authLoading) return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <MetricCardSkeleton />
    </Box>
  );

 const pieChartColors = [
  "#5973ff",
  "#ff6666",
  "#36a2eb",
  "#ffcd56",
  "#4bc0c0",
 ];

 return (
  <Box
   sx={{
    height: "100vh",
    overflowY: "auto",
    backgroundColor: theme.palette.background.default,
   }}
  >
   <Sidebar
    userRole={user?.user_type === "Superadmin" ? "superadmin" : "admin"}
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
        <BarChart3 className="w-6 h-6 text-[#0a1a3b]" />
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0a1a3b] via-[#0f2e6b] to-[#0a1a3b] bg-clip-text text-transparent">
         Dashboard
        </h1>
       </div>
       <p className="text-1xl text-gray-600 mt-1">
        Supporting Theological Formation Through Digital Administration
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
     {/* Total Courses Card */}
     {courseCountLoading ? (
       <MetricCardSkeleton />
     ) : (
       <div className="relative overflow-hidden rounded-2xl shadow-xl bg-gradient-to-br from-blue-400 via-cyan-500 to-blue-600 p-6 transform transition-all duration-300 hover:scale-105">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
        <div className="relative z-10">
         <p className="text-blue-100 text-sm font-semibold uppercase tracking-wide mb-4">
          Total Courses
         </p>
         <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
           <div className="bg-white bg-opacity-20 backdrop-blur-sm p-4 rounded-xl">
            <BookOpen className="w-8 h-8 text-black" />
           </div>
           <p className="text-5xl font-bold text-white">{courseCount}</p>
          </div>
         </div>
        </div>
       </div>
     )}

     {/* Total Instructors Card */}
     {instructorCountLoading ? (
       <MetricCardSkeleton />
     ) : (
       <div className="relative overflow-hidden rounded-2xl shadow-xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 p-6 transform transition-all duration-300 hover:scale-105">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
        <div className="relative z-10">
         <p className="text-sky-100 text-sm font-semibold uppercase tracking-wide mb-4">
          Total Instructors
         </p>
         <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
           <div className="bg-white bg-opacity-20 backdrop-blur-sm p-4 rounded-xl">
            <Users className="w-8 h-8 text-black" />
           </div>
           <p className="text-5xl font-bold text-white">
            {instructorCount}
           </p>
          </div>
         </div>
        </div>
       </div>
     )}

     {/* Total Students Card */}
     {studentCountLoading ? (
       <MetricCardSkeleton />
     ) : (
       <div className="relative overflow-hidden rounded-2xl shadow-xl bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-600 p-6 transform transition-all duration-300 hover:scale-105">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
        <div className="relative z-10">
         <p className="text-indigo-100 text-sm font-semibold uppercase tracking-wide mb-4">
          Total Students
         </p>
         <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
           <div className="bg-white bg-opacity-20 backdrop-blur-sm p-4 rounded-xl">
            <GraduationCap className="w-8 h-8 text-black" />
           </div>
           <p className="text-5xl font-bold text-white">
            {studentCount}
           </p>
          </div>
         </div>
        </div>
       </div>
     )}
    </div>

    {/* Course Completion and Student Distribution */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
     {/* Course Completion Card */}
     {completionDataLoading ? (
       <ProgressListSkeleton title="Course Completion" />
     ) : (
       <div className="rounded-2xl shadow-xl bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6">
        <div className="flex justify-between items-center mb-6">
         <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-900" />
          <h2 className="text-lg font-bold text-gray-900">
           Course Completion
          </h2>
         </div>

         <button
          onClick={() => navigate("/AdminManageCourses")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-900 to-blue-700 text-white font-semibold shadow-md shadow-blue-900/20 hover:from-blue-800 hover:to-blue-600 hover:shadow-blue-800/30 active:scale-95 transform hover:scale-[1.02] transition-all duration-200 relative overflow-hidden group"
         >
          <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
          <span className=" text-sm relative z-10 flex items-center gap-2">
           View
           <ArrowRight className="w-4 h-4" />
          </span>
         </button>
        </div>

        <div className="bg-white rounded-xl p-5 space-y-5 max-h-80 overflow-y-auto">
         {courseCompletionData && courseCompletionData.length > 0 ? (
          courseCompletionData.map((course, index) => (
           <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
             <p className="text-sm font-semibold text-gray-700 truncate flex-1">
              {course.course_title}
             </p>
             <span className="ml-3 text-sm font-bold text-teal-600 bg-teal-50 px-3 py-1 rounded-full">
              {course.completion_percentage}%
             </span>
            </div>
            <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
             <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full transition-all duration-500"
              style={{
               width: `${course.completion_percentage}%`,
              }}
             ></div>
            </div>
           </div>
          ))
         ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
           <BookOpen className="w-12 h-12 mb-3 opacity-50" />
           <p className="text-center">No courses close to completion.</p>
          </div>
         )}
        </div>
       </div>
     )}

     {/* Overall Student Percentage Card */}
     {programDataLoading ? (
       <CircularProgressSkeleton title="Overall Student Distribution" />
     ) : (
       <div className="rounded-2xl shadow-xl bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6">
        <div className="flex items-center gap-2">
         <Piechart1 className="w-5 h-5 text-blue-900" />
         <h2 className="text-lg font-bold text-gray-900">
          Overall Student Distribution
         </h2>
        </div>
        <div className="bg-white rounded-xl p-4 flex items-center justify-center">
         <PieChart
          series={[
           {
            data: programData.map((d, index) => ({
             id: index,
             value: d.count,
             label: d.program,
             color: pieChartColors[index % pieChartColors.length],
            })),
            innerRadius: 30,
            outerRadius: 125,
            paddingAngle: 1,
            cornerRadius: 7,
            highlightScope: { fade: "global", highlight: "item" },
            faded: {
             innerRadius: 30,
             additionalRadius: -30,
             color: "gray",
            },
           },
          ]}
          width={300}
          height={250}
         />
        </div>
       </div>
     )}
    </div>

    {/* Activity Feed */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
     {/* Recent Activities */}
     {activitiesLoading ? (
       <div className="lg:col-span-2">
         <ActivityFeedSkeleton title="Recent Activities" />
       </div>
     ) : (
       <div className="lg:col-span-2 rounded-2xl shadow-xl bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6 h-full">
        <div className="flex items-center gap-2 mb-6">
         <Activity className="w-5 h-5 text-blue-900" />
         <h2 className="text-lg font-bold text-gray-900">
          Recent Activities
         </h2>
        </div>

        {/* Display activities */}
        <div className="bg-white rounded-xl p-4 space-y-3">
         {recentActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
           <Activity className="w-12 h-12 mb-3 opacity-50" />
           <p className="text-center">No recent activities</p>
          </div>
         ) : (
          recentActivities.map((activity) => {
           return (
            <div
             key={activity.id}
             className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-all duration-200 border border-gray-100 hover:shadow-md"
            >
             {/* Icon Indicator */}
             <div
              className={`p-3 rounded-xl ${
               activity.type === "faculty"
                ? "bg-blue-100"
                : "bg-green-100"
              }`}
             >
              {activity.type === "faculty" ? (
               <Briefcase className="w-6 h-6 text-blue-600" />
              ) : (
               <Backpack className="w-6 h-6 text-green-600" />
              )}
             </div>

             {/* Activity Details */}
             <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
               <p className="text-sm font-bold text-gray-900">
                {activity.person}
               </p>
               <p className="text-sm text-gray-700 leading-relaxed">
                {activity.message}
               </p>
              </div>

              {/* Timestamp */}
              <div className="flex items-center gap-1 text-xs text-gray-500">
               <Calendar className="w-3 h-3" />
               <span>{activity.time}</span>
              </div>
             </div>
            </div>
           );
          })
         )}
        </div>
       </div>
     )}

     {/* Last Online User*/}
     <div className="space-y-6 h-full">
      {usersLoading ? (
        <ActivityFeedSkeleton title="Last Online Users" />
      ) : (
        <div className="rounded-2xl shadow-xl bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6 h-full flex flex-col">
         <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-blue-900" />
          <h2 className="text-lg font-bold text-gray-900">
           Last Online Users
          </h2>
         </div>

         <div className="space-y-3 flex-1">
          {lastOnlineUser.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <Users className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm text-center">No recent activity</p>
           </div>
          ) : (
           lastOnlineUser.map((user) => (
            <div
             key={user.user_id}
             className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
             <div className="flex items-center gap-3">
              <div className="relative">
               <Avatar
                src={getProfilePictureUrl(user.profile_picture)}
                alt={`${user.first_name} ${user.last_name}`}
                sx={{ width: 40, height: 40 }}
               >
                {(user.first_name?.charAt(0) || "") +
                 (user.last_name?.charAt(0) || "")}
               </Avatar>
              </div>
              <div>
               <p className="text-sm font-semibold text-gray-900">
                {user.first_name} {user.last_name}
               </p>
               <p className="text-xs text-gray-500">
                {formatTimestamp(user.last_online)}
               </p>
              </div>
             </div>
             <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
               user.user_type === "Administrator"
                ? "bg-purple-100 text-purple-800"
                : user.user_type === "Instructor"
                ? "bg-blue-100 text-blue-800"
                : user.user_type === "Librarian"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-green-100 text-green-800"
              }`}
             >
              {user.user_type}
             </span>
            </div>
           ))
          )}
         </div>
        </div>
      )}
     </div>
    </div>

    {/* Students Enrolled Chart */}
    {chartDataLoading ? (
      <ChartCardSkeleton title="Students Enrolled Per Course" />
    ) : (
      <div className="mb-8 rounded-2xl shadow-xl bg-gradient-to-br from-blue-500 via-cyan-600 to-indigo-700 p-6">
       <div className="flex items-center gap-3 mb-4">
        <TrendingUp className="w-6 h-6 text-white" />
        <h2 className="text-1xl font-bold text-white">
         Students Enrolled Per Course
        </h2>
       </div>
       <div className="bg-white rounded-xl p-4">
        <BarChart
         xAxis={[
          {
           data: (chartData || []).map((d: any) => d.course_code),
           scaleType: "band",
           label: "Course Code",
          },
         ]}
         series={[
          {
           data: (chartData || []).map((d: any) => d.count),
           label: "Active Enrollments",
           color: "#3b82f6",
          },
         ]}
         sx={{ width: "100%", height: 300 }}
        />
       </div>
      </div>
    )}
   </div>
  </Box>
 );
}
