import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSchoolYear } from "../context/SchoolYearContext";
import { useInstructorCourses } from "../hooks/useQueries";
import { useNavigate, useLocation } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Calendar, BookOpen, ChevronRight } from "lucide-react";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import WeeklyScheduleGrid, { ScheduleEvent } from "./components/WeeklyScheduleGrid";

export default function InstructorSchedule() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { selectedSchoolYear, setSelectedSchoolYear, schoolYears } = useSchoolYear();
  const { data: courses = [], isLoading: coursesLoading } = useInstructorCourses(selectedSchoolYear);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.user_type !== "Instructor") {
      navigate("/");
      return;
    }
  }, [user, authLoading, navigate]);

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const calendarEvents: ScheduleEvent[] = (courses || []).flatMap((course: any) => {
    if (!course.schedules) return [];
    return course.schedules.map((sch: any) => ({
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
      <Sidebar
        userRole={"instructor"}
        currentPath={location.pathname}
        open={isSidebarOpen}
        onClose={handleSidebarToggle}
      />
      <Navbar handleSidebarToggle={handleSidebarToggle} />

      <div className="min-h-screen pt-20 p-4 md:pt-28 md:ml-52">
        {/* Header Title & Filter */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-6 h-6 text-[#0a1a3b]" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0a1a3b] via-[#0f2e6b] to-[#0a1a3b] bg-clip-text text-transparent">
                Teaching Schedule
              </h1>
            </div>
            <p className="text-lg text-gray-600">Overview of your teaching course schedules</p>
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

        {coursesLoading ? (
          <div className="flex justify-center py-20">
            <CircularProgress />
          </div>
        ) : calendarEvents.length === 0 ? (
          <div className="rounded-2xl shadow-xl bg-white p-12 flex flex-col items-center justify-center text-gray-500">
            <BookOpen className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-xl font-medium">No schedules found</p>
            <p className="text-sm">You haven't been assigned any course schedules yet.</p>
          </div>
        ) : (
          <div className="rounded-2xl shadow-xl bg-white p-6">
            <WeeklyScheduleGrid events={calendarEvents} />
          </div>
        )}
      </div>
    <div className="md:ml-52">
     <Footer />
    </div>
   </Box>
  );
}
