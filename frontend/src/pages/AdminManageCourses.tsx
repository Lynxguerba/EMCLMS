// MUI components
import { Box, CircularProgress } from "@mui/material";

// React hooks
import { useEffect, useState } from "react";

// React Router navigation
import { useNavigate } from "react-router-dom";

// Auth context
import { useAuth } from "../context/AuthContext";

// Custom components
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AdminCourseDataGrid from "./components/AdminCourseDataGrid";

// Lucide icons
import { BookOpen } from "lucide-react";

export default function AdminManageCourses() {
 const navigate = useNavigate();
 const { user, loading: authLoading } = useAuth();

 // State: track sidebar visibility
 const [isSidebarOpen, setIsSidebarOpen] = useState(false);
 const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);

 // Effect: verify session and user type
 useEffect(() => {
  if (authLoading) return;

  if (!user || (user.user_type !== "Administrator" && user.user_type !== "Superadmin")) {
   navigate("/");
  }
 }, [user, authLoading, navigate]);

 // UI: full-screen loader while checking session
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
    currentPath={"/AdminSettings"}
    open={isSidebarOpen}
    onClose={handleSidebarToggle}
   />
   <Navbar handleSidebarToggle={handleSidebarToggle} />

   <div className="min-h-screen pt-8 p-4 mt-6 md:-mt-2  md:ml-52">
    {/* Header - matching Dashboard style */}
    <div className="mb-6 grid items-center gap-2">
     <div className="flex gap-3 items-center">
      <BookOpen className="w-7 h-7 text-[#0a1a3b]" />
      <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0a1a3b] via-[#0f2e6b] to-[#0a1a3b] bg-clip-text text-transparent">
       Manage Courses
      </h1>
     </div>
     <p className="text-1xl">
      Create, view, and manage all courses in the system.
     </p>
    </div>

    <AdminCourseDataGrid />
   </div>
      <div className="md:ml-52">
     <Footer />
    </div>
   </div>
  );
}
