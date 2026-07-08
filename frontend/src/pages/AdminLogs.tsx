import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// MUI components
import { Box, CircularProgress } from "@mui/material";

// Custom components
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// Lucide icons
import { FileText, Users, Briefcase, ChevronRight } from "lucide-react";

export default function AdminLogs() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // UI state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);

  // Validate session on mount
  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.user_type !== "Administrator" && user.user_type !== "Superadmin")) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  // Show loader while checking session
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar
        userRole={user?.user_type === "Superadmin" ? "superadmin" : "admin"}
        currentPath="/AdminLogs"
        open={isSidebarOpen}
        onClose={handleSidebarToggle}
      />
      <Navbar handleSidebarToggle={handleSidebarToggle} />

      <div className="min-h-screen pt-8 p-4 mt-6 md:-mt-2 md:ml-52">
        {/* Header - matching Dashboard style */}
        <div className="mb-8 grid items-center gap-2">
          <div className="flex gap-3 items-center">
            <FileText className="w-6 h-6 text-[#0a1a3b]" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0a1a3b] via-[#0f2e6b] to-[#0a1a3b] bg-clip-text text-transparent">
              System Logs
            </h1>
          </div>
          <p className="text-1xl">
            Select a log category to monitor system activity and audit trails.
          </p>
        </div>

        {/* Log Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-12">
          {/* Student Logs Card */}
          <button
            onClick={() => navigate("/AdminStudentLogs")}
            className="group relative overflow-hidden rounded-2xl bg-white p-8 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border border-gray-100 flex flex-col items-center text-center gap-4"
          >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 opacity-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            
            <div className="relative p-5 rounded-2xl bg-green-50 text-green-600 transition-colors group-hover:bg-green-100">
              <Users className="w-12 h-12" />
            </div>
            
            <div className="relative">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Student Logs</h2>
              <p className="text-sm text-gray-500 max-w-[200px]">
                Monitor student submissions, logins, and academic activities.
              </p>
            </div>

            <div className="relative mt-4 flex items-center gap-2 text-green-600 font-semibold text-sm">
              View Student Activities
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </button>

          {/* Faculty Logs Card */}
          <button
            onClick={() => navigate("/AdminFacultyLogs")}
            className="group relative overflow-hidden rounded-2xl bg-white p-8 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border border-gray-100 flex flex-col items-center text-center gap-4"
          >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 opacity-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            
            <div className="relative p-5 rounded-2xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
              <Briefcase className="w-12 h-12" />
            </div>
            
            <div className="relative">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Faculty Logs</h2>
              <p className="text-sm text-gray-500 max-w-[200px]">
                Audit instructor actions, course updates, and grading history.
              </p>
            </div>

            <div className="relative mt-4 flex items-center gap-2 text-blue-600 font-semibold text-sm">
              View Faculty Activities
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </button>
        </div>
      </div>
        <div className="md:ml-52">
     <Footer />
    </div>
   </div>
  );
}
