import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getProfilePictureUrl } from "../utils/imageUtils";

// Auth Context
import { useAuth } from "../context/AuthContext";
import { useAdminStudentLogs, useAdminAllUsers } from "../hooks/useQueries";

// MUI components
import { Box, CircularProgress, Avatar } from "@mui/material";

// Custom components
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import { TableRowSkeleton } from "./components/Skeletons";
import TableItemsPerPage from "../components/TableItemsPerPage";

// Lucide icons
import { FileText, Search, ChevronLeft, ChevronRight } from "lucide-react";

// Date utilities
import {
 differenceInMinutes,
 differenceInHours,
 differenceInDays,
 differenceInWeeks,
 differenceInMonths,
 differenceInYears,
 parseISO,
} from "date-fns";

// Helper function to get initials
const getInitials = (firstName?: string, lastName?: string): string => {
 if (!firstName && !lastName) {
  return "S"; // Default to 'S' for Student
 }
 const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : "";
 const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : "";
 return `${firstInitial}${lastInitial}`;
};

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
   } catch {
   return "—";
  }
 };
 
 interface User {
  user_id: string;
  first_name?: string;
  last_name?: string;
  profile_picture_url?: string;
  profile_picture?: string;
  email?: string;
  user_type?: string;
 }

 interface LogEntry {
  id: string;
  timestamp: string;
  student: string;
  message: string;
  student_id?: string;
 }
 
 export default function AdminStudentLogs() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
 
  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);
 
  // Data fetching with TanStack Query
  const { data: users = [], isLoading: usersLoading } = useAdminAllUsers();
  const { data: rows = [], isLoading: logsLoading } = useAdminStudentLogs();
  
  const loading = usersLoading || logsLoading;
 
  // Table state
  const [searchQuery, setSearchQuery] = useState("");
 
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
 
  // Helper function to get user details by student name or ID
  const getUserByStudent = useCallback((
   studentName: string,
   studentId?: string
  ): User | null => {
   if (studentId) {
    const userById = users.find((u) => u.user_id === studentId);
    if (userById) return userById;
   }
 
   // Try to match by name
   const userByName = users.find((u) => {
    const fullName = `${u.first_name || ""} ${u.last_name || ""}`.trim();
    return fullName === studentName;
   });
 
   return userByName || null;
  }, [users]);
 
  useEffect(() => {
   if (authLoading) return;
 
   if (!user || (user.user_type !== "Administrator" && user.user_type !== "Superadmin")) {
    navigate("/");
    return;
   }
  }, [user, authLoading, navigate]);
 
  // Search filter
  const filteredRows = useMemo(() => {
   return rows.filter((log: LogEntry) => {
    const searchLower = searchQuery.toLowerCase();
    const userMatch = getUserByStudent(log.student, log.student_id);
    return (
     (log.student?.toLowerCase() || "").includes(searchLower) ||
     (log.message?.toLowerCase() || "").includes(searchLower) ||
     (userMatch?.first_name?.toLowerCase() || "").includes(searchLower) ||
     (userMatch?.last_name?.toLowerCase() || "").includes(searchLower)
    );
   });
  }, [searchQuery, rows, getUserByStudent]);
  // Reset to page 1 when search query changes
 useEffect(() => {
  setCurrentPage(1);
 }, [searchQuery]);

 // Pagination calculations
 const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
 const startIndex = (currentPage - 1) * itemsPerPage;
 const endIndex = startIndex + itemsPerPage;
 const currentLogs = filteredRows.slice(startIndex, endIndex);

 // Show full-page loading spinner ONLY for initial auth check
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

 // Render layout with navbar, sidebar, and student logs table
 return (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
   <Sidebar
    userRole={user?.user_type === "Superadmin" ? "superadmin" : "admin"}
    currentPath={"/AdminLogs"}
    open={isSidebarOpen}
    onClose={handleSidebarToggle}
   />
   <Navbar handleSidebarToggle={handleSidebarToggle} />

   <div className="min-h-screen pt-8 p-4 mt-6 md:-mt-2 md:ml-52">
    {/* Header - matching Dashboard style */}
    <div className="mb-6 grid items-center gap-2">
     <div className="flex gap-3 items-center">
      <FileText className="w-6 h-6 text-[#0a1a3b]" />
      <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0a1a3b] via-[#0f2e6b] to-[#0a1a3b] bg-clip-text text-transparent">
       Student Logs
      </h1>
     </div>
     <p className="text-1xl">
      View and monitor all student activity logs in the system.
     </p>
    </div>

    {/* Search Bar */}
    <div className="mb-5">
     <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="relative flex-1 max-w-md">
       <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
       <input
        type="text"
        placeholder="Search by student name or message..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
       />
      </div>
     </div>
    </div>

    {/* Logs Table */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
     <div className="overflow-x-auto">
      <table className="w-full">
       <thead>
        <tr className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
         <th className="px-4 py-3 text-left text-xs font-semibold">
          Profile
         </th>
         <th className="px-4 py-3 text-left text-xs font-semibold">
          Student
         </th>
         <th className="px-4 py-3 text-left text-xs font-semibold">
          Timestamp
         </th>
         <th className="px-4 py-3 text-left text-xs font-semibold">
          Log Message
         </th>
        </tr>
       </thead>
       <tbody className="divide-y divide-gray-200">
        {loading ? (
         <TableRowSkeleton columns={4} />
        ) : currentLogs.length === 0 ? (
         <tr>
          <td
           colSpan={4}
           className="px-4 py-8 text-center text-sm text-gray-500"
          >
           No logs found
          </td>
         </tr>
        ) : (
         currentLogs.map((log) => {
          const userMatch = getUserByStudent(log.student, log.student_id);

          return (
           <tr
            key={log.id}
            className="hover:bg-gray-50 transition-colors"
           >
            <td className="px-4 py-3">
             <Avatar
              src={getProfilePictureUrl(userMatch?.profile_picture)}
              alt={log.student}
              className="border-2 border-green-500"
              sx={{ width: 40, height: 40 }}
             >
              {getInitials(userMatch?.first_name, userMatch?.last_name)}
             </Avatar>
            </td>
            <td className="px-4 py-3 text-sm text-gray-900 font-medium">
             {log.student || "—"}
            </td>
            <td className="px-4 py-3 text-sm text-gray-700">
             {formatTimestamp(log.timestamp)}
            </td>
            <td className="px-4 py-3 text-sm text-gray-700">
             {log.message || "—"}
            </td>
           </tr>
          );
         })
        )}
       </tbody>
      </table>
     </div>

     {/* Pagination */}
     {filteredRows.length > 0 && (
      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
       <div className="flex items-center gap-4">
        <div className="text-xs text-gray-700">
         Showing {startIndex + 1} to{" "}
         {Math.min(endIndex, filteredRows.length)} of{" "}
         {filteredRows.length} logs
        </div>
        <div className="flex items-center gap-2">
         <span className="text-xs text-gray-500">Show</span>
         <TableItemsPerPage
           value={itemsPerPage}
           onChange={(size) => {
             setItemsPerPage(size);
             setCurrentPage(1);
           }}
           options={[8, 10, 15]}
         />
        </div>
       </div>
       <div className="flex items-center gap-2">
        <button
         onClick={() =>
          setCurrentPage((prev) => Math.max(prev - 1, 1))
         }
         disabled={currentPage === 1}
         className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
         <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-3 py-1.5 text-xs font-medium text-gray-700">
         Page {currentPage} of {totalPages}
        </span>
        <button
         onClick={() =>
          setCurrentPage((prev) => Math.min(prev + 1, totalPages))
         }
         disabled={currentPage === totalPages}
         className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
         <ChevronRight className="w-4 h-4" />
        </button>
       </div>
      </div>
     )}
    </div>
   </div>
  </div>
 );
}
