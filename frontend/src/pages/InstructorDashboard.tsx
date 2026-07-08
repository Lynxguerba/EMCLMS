// React and React Router
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Auth Context
import { useAuth } from "../context/AuthContext";
import { useSchoolYear } from "../context/SchoolYearContext";

// MUI components and styling
import { Box, CircularProgress, LinearProgress, Avatar } from "@mui/material";
import { useTheme } from "@mui/material/styles";

// Charts
import { BarChart, LineChart} from "@mui/x-charts";

// date-fns
import { formatDistanceToNow } from "date-fns";

// Custom components
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import InstructorStudentCourseCollapsibleTable from "./components/InstructorStudentCourseCollapsibleDataGrid";

// Lucide Icons
import {
 BookOpen,
 Users,
 TrendingUp,
 ClipboardList,
 Clock,
 CheckCircle2,
 AlertCircle,
 Activity,
 Calendar,
 Award,
 Target,
 ChevronRight
} from "lucide-react";

// API
import axios from "axios";

// Hooks
import { 
  useInstructorCourseCount, 
  useInstructorStudentCount, 
  useInstructorEnrollmentStats, 
  useInstructorRecentActivity, 
  useInstructorUpcomingDeadlines, 
  useInstructorWeeklyEngagement, 
  useInstructorCoursesWithStudents 
} from "../hooks/useQueries";

// Skeletons
import { 
  MetricCardSkeleton, 
  ProgressListSkeleton, 
  CircularProgressSkeleton, 
  ActivityFeedSkeleton, 
  TableSkeleton 
} from "./components/Skeletons";

interface CourseCompletion {
 course_code: string;
 course_title: string;
 completion_rate: number;
 total_students: number;
 completed_students: number;
}

interface RecentActivity {
 id: number;
 student_name: string;
 action: string;
 course_code: string;
 timestamp: string;
 type: 'submission' | 'completion' | 'enrollment';
}

interface UpcomingDeadline {
 content_id: number;
 content_title: string;
 course_code: string;
 due_date: string;
 submissions_count: number;
 total_students: number;
}

export default function InstructorDashboard() {
 const theme = useTheme();
 const navigate = useNavigate();
 const location = useLocation();
 const { user, loading: authLoading } = useAuth();
 const { selectedSchoolYear, setSelectedSchoolYear, schoolYears } = useSchoolYear();

 const [isSidebarOpen, setIsSidebarOpen] = useState(false);

 // Queries
 const courseCountQuery = useInstructorCourseCount(selectedSchoolYear);
 const studentCountQuery = useInstructorStudentCount(selectedSchoolYear);
 const enrollmentStatsQuery = useInstructorEnrollmentStats(selectedSchoolYear);
 const recentActivityQuery = useInstructorRecentActivity(selectedSchoolYear);
 const upcomingDeadlinesQuery = useInstructorUpcomingDeadlines(selectedSchoolYear);
 const weeklyEngagementQuery = useInstructorWeeklyEngagement(selectedSchoolYear);
 const coursesWithStudentsQuery = useInstructorCoursesWithStudents(selectedSchoolYear);

 // Derived state for course completions
 const [courseCompletions, setCourseCompletions] = useState<CourseCompletion[]>([]);
 const [isCompletionsLoading, setIsCompletionsLoading] = useState(false);

 useEffect(() => {
  if (coursesWithStudentsQuery.data) {
   const fetchData = async () => {
    setIsCompletionsLoading(true);
    try {
     const completions = await Promise.all(
      coursesWithStudentsQuery.data.map(async (course: any) => {
       try {
        const sectionsRes = await axios.get(
         `${import.meta.env.VITE_API_BASE_URL}/api/courses/${course.course_id}/sections/`,
         { withCredentials: true }
        );

        const sections = sectionsRes.data;
        const totalSections = sections.length;
        const completedSections = sections.filter((s: any) => s.is_completed).length;
        const completionRate = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

        return {
         course_code: course.course_code,
         course_title: course.course_title,
         completion_rate: completionRate,
         total_students: course.users.length,
         completed_students: Math.round((completionRate / 100) * course.users.length),
        };
       } catch (err) {
        return {
         course_code: course.course_code,
         course_title: course.course_title,
         completion_rate: 0,
         total_students: course.users.length,
         completed_students: 0,
        };
       }
      })
     );
     setCourseCompletions(completions);
    } catch (error) {
     console.error("Error calculating completions:", error);
    } finally {
     setIsCompletionsLoading(false);
    }
   };
   fetchData();
  }
 }, [coursesWithStudentsQuery.data]);

 const overallCompletion = courseCompletions.length > 0
  ? Math.round(courseCompletions.reduce((sum, c) => sum + c.completion_rate, 0) / courseCompletions.length)
  : 0;

 const currentPath = location.pathname;
 const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);

 // Handle authentication and redirection
 useEffect(() => {
  if (!authLoading && (!user || user.user_type !== "Instructor")) {
   navigate("/");
  }
 }, [user, authLoading, navigate]);

 // Show minimal loading for auth
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

 if (!user) return null;

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

   <div className="min-h-screen pt-20 p-4 md:pt-28 md:ml-52">
     {/* Greeting */}
     <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
       <div className="flex items-center gap-3">
        <ClipboardList className="w-4 h-4 md:w-6 md:h-6 text-[#0a1a3b]" />
        <h1 className="text-2xl md:text-2xl font-bold bg-gradient-to-r from-[#0a1a3b] via-[#0f2e6b] to-[#0a1a3b] bg-clip-text text-transparent">
         {`Welcome, ${user.first_name}!`}
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

    {/* Dashboard Layout - Two Column */}
    <div className="flex flex-col md:flex-row gap-6 mb-8">
     {/* Left Column - Metrics */}
     <div className="flex flex-col gap-6 flex-1">
      {courseCountQuery.isLoading ? (
        <MetricCardSkeleton />
      ) : (
        /* Total Courses Card */
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
            <p className="text-5xl font-bold text-white">
             {courseCountQuery.data?.count ?? 0}
            </p>
           </div>
          </div>
         </div>
        </div>
      )}

      {studentCountQuery.isLoading ? (
        <MetricCardSkeleton />
      ) : (
        /* Total Students Enrolled Card */
        <div className="relative overflow-hidden rounded-2xl shadow-xl bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-600 p-6 transform transition-all duration-300 hover:scale-105">
         <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
         <div className="relative z-10">
          <p className="text-indigo-100 text-sm font-semibold uppercase tracking-wide mb-4">
           Students Handled
          </p>
          <div className="flex items-center justify-between">
           <div className="flex items-center gap-4">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm p-4 rounded-xl">
             <Users className="w-8 h-8 text-black" />
            </div>
            <p className="text-5xl font-bold text-white">
             {studentCountQuery.data?.count ?? 0}
            </p>
           </div>
          </div>
         </div>
        </div>
      )}
     </div>

     {/* Right Column - Chart */}
     <div className="flex-[1.5] rounded-2xl shadow-xl bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6">
      <div className="flex items-center gap-3 mb-4">
       <TrendingUp className="w-6 h-6 text-gray-700" />
       <h1 className="text-lg font-bold text-gray-900">
        Enrolled Students per Course
       </h1>
      </div>
      {enrollmentStatsQuery.isLoading ? (
        <div className="h-[200px] flex items-center justify-center bg-gray-50 rounded-xl animate-pulse">
          <div className="w-full h-full flex items-end justify-around p-4">
            <div className="w-8 h-[60%] bg-gray-200 rounded-t"></div>
            <div className="w-8 h-[40%] bg-gray-200 rounded-t"></div>
            <div className="w-8 h-[80%] bg-gray-200 rounded-t"></div>
            <div className="w-8 h-[50%] bg-gray-200 rounded-t"></div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-4">
         <BarChart
          xAxis={[
           {
            data: enrollmentStatsQuery.data?.data.map((d) => d.code) || [],
            scaleType: "band",
            label: "Course Code",
           },
          ]}
          series={[
           {
            data: enrollmentStatsQuery.data?.data.map((d) => d.count) || [],
            label: "Active Enrollments",
            color: "#3b82f6",
           },
          ]}
          sx={{ width: "100%", height: 200 }}
         />
        </div>
      )}
     </div>
    </div>

    {/* Three Cards in One Row - Equal Height */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
     {/* Course Completion Progress */}
     {isCompletionsLoading ? (
       <ProgressListSkeleton title="Course Completion Progress" />
     ) : (
       <div className="rounded-xl shadow-lg bg-white p-5 flex flex-col h-[500px]">
        <div className="flex items-center gap-2 mb-4">
         <Award className="w-5 h-5 text-[#0a1a3b]" />
         <h2 className="text-lg font-bold text-gray-900">Course Completion Progress</h2>
        </div>
        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
         {courseCompletions.map((course) => (
          <div key={course.course_code} className="rounded-lg shadow-md bg-gradient-to-r from-gray-50 to-white p-4 hover:shadow-lg transition-shadow duration-300 border border-gray-100">
           <div className="flex items-center justify-between mb-2">
            <div>
             <h3 className="font-bold text-base text-gray-900">{course.course_code}</h3>
             <p className="text-xs text-gray-600">{course.course_title}</p>
            </div>
            <div className="text-right">
             <p className="text-xl font-bold text-blue-600">{course.completion_rate}%</p>
            </div>
           </div>
           <LinearProgress
            variant="determinate"
            value={course.completion_rate}
            sx={{
             height: 8,
             borderRadius: 4,
             backgroundColor: '#e0e7ff',
             '& .MuiLinearProgress-bar': {
              backgroundColor: course.completion_rate >= 70 ? '#10b981' : course.completion_rate >= 40 ? '#f59e0b' : '#ef4444',
              borderRadius: 4,
             }
            }}
           />
          </div>
         ))}
        </div>
       </div>
     )}

     {/* Overall Completion Rate - Circular Progress */}
     {isCompletionsLoading ? (
       <CircularProgressSkeleton title="Overall Completion Percentage" />
     ) : (
       <div className="rounded-xl shadow-lg bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 p-5 flex flex-col h-[500px] border border-purple-100">
        <div className="flex items-center gap-2 mb-6">
         <Target className="w-5 h-5 text-purple-600" />
         <h2 className="text-lg font-bold text-gray-900">Overall Completion Percentage</h2>
        </div>

        <div className="flex flex-col items-center justify-center flex-1">
         <div className="relative inline-flex items-center justify-center mb-6">
          <CircularProgress
           variant="determinate"
           value={overallCompletion}
           size={280}
           thickness={4}
           sx={{
            color: '#8b5cf6',
            '& .MuiCircularProgress-circle': {
             strokeLinecap: 'round',
            }
           }}
          />
          <CircularProgress
           variant="determinate"
           value={100}
           size={280}
           thickness={4}
           sx={{
            color: 'rgba(139, 92, 246, 0.1)',
            position: 'absolute',
            left: 0,
           }}
          />
          <div className="absolute flex items-center">
           <p className="text-7xl font-extrabold bg-gradient-to-br from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            {overallCompletion}
           </p>
           <p className="text-4xl font-bold bg-gradient-to-br from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            %
           </p>
          </div>
         </div>
         <p className="text-gray-600 text-sm font-medium text-center">
          Average across all courses
         </p>
        </div>
       </div>
     )}

     {/* Upcoming Deadlines */}
     {upcomingDeadlinesQuery.isLoading ? (
       <ProgressListSkeleton title="Upcoming Deadlines" />
     ) : (
       <div className="rounded-xl shadow-lg bg-white p-5 flex flex-col h-[500px]">
        <div className="flex items-center gap-2 mb-4">
         <Calendar className="w-5 h-5 text-red-600" />
         <h2 className="text-lg font-bold text-gray-900">Upcoming Deadlines</h2>
        </div>
        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
         {(upcomingDeadlinesQuery.data as UpcomingDeadline[] || []).map((deadline) => {
          const submissionRate = (deadline.submissions_count / deadline.total_students) * 100;
          const daysLeft = Math.ceil((new Date(deadline.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

          return (
           <div key={deadline.content_id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-400 transition-colors hover:shadow-md">
            <div className="flex items-center gap-3 flex-1">
             <div className={`p-2 rounded-lg ${daysLeft <= 2 ? 'bg-red-100' : daysLeft <= 5 ? 'bg-yellow-100' : 'bg-blue-100'}`}>
              {daysLeft <= 2 ? <AlertCircle className="w-5 h-5 text-red-600" /> : <Calendar className="w-5 h-5 text-blue-600" />}
             </div>
             <div className="flex-1">
              <h3 className="font-bold text-sm text-gray-900">{deadline.content_title}</h3>
              <p className="text-xs text-gray-600">{deadline.course_code} • Due: {new Date(deadline.due_date).toLocaleDateString()}</p>
              <div className="mt-1">
               <p className="text-xs text-gray-500">{deadline.submissions_count}/{deadline.total_students} submissions ({Math.round(submissionRate)}%)</p>
               <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                <div
                 className={`h-1.5 rounded-full ${submissionRate >= 70 ? 'bg-green-500' : submissionRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                 style={{ width: `${submissionRate}%` }}
                ></div>
               </div>
              </div>
             </div>
            </div>
            <div className="text-right ml-2">
             <p className={`text-base font-bold ${daysLeft <= 2 ? 'text-red-600' : daysLeft <= 5 ? 'text-yellow-600' : 'text-blue-600'}`}>
              {daysLeft}d
             </p>
             <p className="text-xs text-gray-500">left</p>
            </div>
           </div>
          );
         })}
        </div>
       </div>
     )}
    </div>

    {/* Weekly Engagement & Recent Activity Row */}
    <div className="flex flex-col lg:flex-row gap-4 mb-6">
     {/* Weekly Engagement Chart */}
     <div className="flex-1 rounded-lg shadow-md bg-white p-5">
      <div className="flex items-center gap-2 mb-3">
       <Activity className="w-5 h-5 text-purple-600" />
       <h2 className="text-lg font-bold text-gray-900">Weekly Engagement</h2>
      </div>
      {weeklyEngagementQuery.isLoading ? (
        <div className="h-[250px] bg-gray-50 rounded animate-pulse"></div>
      ) : (
        <LineChart
         xAxis={[
          {
           data: (weeklyEngagementQuery.data || []).map((_, i) => i),
           scaleType: "point",
           valueFormatter: (v) => weeklyEngagementQuery.data?.[v]?.day || "",
          },
         ]}
         series={[
          {
           data: (weeklyEngagementQuery.data || []).map((d) => d.activities),
           label: "Activities",
           color: "#8b5cf6",
           curve: "natural",
          },
         ]}
         sx={{ width: "100%", height: 250 }}
        />
      )}
     </div>

     {/* Recent Activity Feed */}
     {recentActivityQuery.isLoading ? (
       <ActivityFeedSkeleton title="Recent Activity" />
     ) : (
       <div className="flex-1 rounded-lg shadow-md bg-white p-5">
        <div className="flex items-center gap-2 mb-3">
         <Clock className="w-5 h-5 text-orange-600" />
         <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
        </div>
        <div className="space-y-3 max-h-[250px] overflow-y-auto">
         {(recentActivityQuery.data as RecentActivity[] || []).map((activity) => (
          <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
           <Avatar
            sx={{
             width: 36,
             height: 36,
             bgcolor: activity.type === 'submission' ? '#3b82f6' : activity.type === 'completion' ? '#10b981' : '#8b5cf6',
             fontSize: '0.875rem'
            }}
           >
            {activity.student_name.split(' ').map(n => n[0]).join('')}
           </Avatar>
           <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
             {activity.student_name}
            </p>
            <p className="text-xs text-gray-600">
             {activity.action} - <span className="font-semibold">{activity.course_code}</span>
            </p>
            <p className="text-xs text-gray-400">
             {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
            </p>
           </div>
           {activity.type === 'submission' && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
           {activity.type === 'completion' && <Award className="w-4 h-4 text-blue-500 flex-shrink-0" />}
          </div>
         ))}
        </div>
       </div>
     )}
    </div>

    {/* Course-Student Details Table */}
    {coursesWithStudentsQuery.isLoading ? (
      <TableSkeleton />
    ) : (
      <div className="mb-6 rounded-lg shadow-md bg-white p-0">
       <InstructorStudentCourseCollapsibleTable />
      </div>
    )}

    {/* Footer Spacer */}
    <div className="mt-12 md:mt-16"></div>
   </div>
    <div className="md:ml-52">
     <Footer />
    </div>
   </Box>
  );
}
