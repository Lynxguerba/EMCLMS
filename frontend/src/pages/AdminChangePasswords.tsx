import { Box, CircularProgress, Avatar } from "@mui/material";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getProfilePictureUrl } from "../utils/imageUtils";

// Auth Context
import { useAuth } from "../context/AuthContext";
import { useAdminPasswordResets, useResetUserPassword } from "../hooks/useQueries";

// Internal component imports
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import PasswordResetModal from "./components/AdminPasswordResetModal";
import { TableRowSkeleton } from "./components/Skeletons";
import TableItemsPerPage from "../components/TableItemsPerPage";
import CustomSelect from "../components/CustomSelect";

import { User } from "../types/user";
import { PasswordReset } from "../types/passwordreset";

// Lucide icons
import {
 KeyRound,
 Search,
 ChevronLeft,
 ChevronRight,
 CheckCircle,
 Clock,
 Users,
 Filter,
 XCircle,
} from "lucide-react";

// Helper function to get initials
const getInitials = (firstName?: string, lastName?: string): string => {
 if (!firstName && !lastName) {
  return "U";
 }
 const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : "";
 const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : "";
 return `${firstInitial}${lastInitial}`;
};

// Helper function to get border color based on user type
const getBorderColor = (userType?: string): string => {
 switch (userType) {
  case "Administrator":
   return "border-purple-500";
  case "Instructor":
   return "border-blue-500";
  case "Librarian":
   return "border-yellow-500";
  default:
   return "border-green-500"; // Student
 }
};

export default function AdminChangePasswords() {
 const navigate = useNavigate();
 const { user, loading: authLoading } = useAuth();
 const { data: rows = [], isLoading: loading, refetch } = useAdminPasswordResets();
 const resetPasswordMutation = useResetUserPassword();

 // UI state
 const [isSidebarOpen, setIsSidebarOpen] = useState(false);

 // Data state
 const [searchQuery, setSearchQuery] = useState("");
 const [userTypeFilter, setUserTypeFilter] = useState("All Types");
 const [statusFilter, setStatusFilter] = useState("All Status");

 // Modal state
 const [openResetModal, setOpenResetModal] = useState(false);
 const [selectedUser, setSelectedUser] = useState<
  (User & PasswordReset) | null
 >(null);

 // Snackbar state
 const [snackbarOpen, setSnackbarOpen] = useState(false);
 const [snackbarMessage, setSnackbarMessage] = useState("");
 const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
  "success"
 );

 // Pagination state
 const [currentPage, setCurrentPage] = useState(1);
 const [itemsPerPage, setItemsPerPage] = useState(10);

 // Toggles the sidebar
 const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);

 // Clear all filters
 const handleClearFilters = () => {
  setSearchQuery("");
  setUserTypeFilter("All Types");
  setStatusFilter("All Status");
 };

 const isFiltered =
  searchQuery !== "" ||
  userTypeFilter !== "All Types" ||
  statusFilter !== "All Status";

 // Opens the password reset modal for a selected user
 const handleOpenResetModal = (user: User & PasswordReset) => {
  setSelectedUser(user);
  setOpenResetModal(true);
 };

 // Closes the password reset modal
 const handleCloseResetModal = () => {
  setOpenResetModal(false);
  setSelectedUser(null);
 };

 // inside handleResetPasswordConfirm
 const handleResetPasswordConfirm = async (
  userId: number,
  newPassword1: string,
  newPassword2: string
 ) => {
  try {
    await resetPasswordMutation.mutateAsync({
      user_id: userId,
      new_password1: newPassword1,
      new_password2: newPassword2,
    });

    setSnackbarMessage("Password reset successfully!");
    setSnackbarSeverity("success");
    setSnackbarOpen(true);
    refetch();
    handleCloseResetModal();
  } catch (err: any) {
    console.error("Password reset failed", err);
    setSnackbarMessage("Password reset failed. Please try again.");
    setSnackbarSeverity("error");
    setSnackbarOpen(true);
  }
 };

 // Verify session on mount
 useEffect(() => {
  if (authLoading) return;

  if (!user || (user.user_type !== "Administrator" && user.user_type !== "Superadmin")) {
   navigate("/");
   return;
  }
 }, [user, authLoading, navigate]);

 // Search and filter logic
 const filteredRows = useMemo(() => {
  return rows.filter((row) => {
   const searchLower = searchQuery.toLowerCase();
   const matchesSearch =
    (row.first_name?.toLowerCase() || "").includes(searchLower) ||
    (row.last_name?.toLowerCase() || "").includes(searchLower) ||
    (row.email?.toLowerCase() || "").includes(searchLower) ||
    (row.user_type?.toLowerCase() || "").includes(searchLower);

   const matchesUserType =
    userTypeFilter === "All Types" || row.user_type === userTypeFilter;

   const matchesStatus =
    statusFilter === "All Status" || row.status === statusFilter;

   return matchesSearch && matchesUserType && matchesStatus;
  });
 }, [searchQuery, rows, userTypeFilter, statusFilter]);

 // Reset to page 1 when search query or filters change
 useEffect(() => {
  setCurrentPage(1);
 }, [searchQuery, userTypeFilter, statusFilter]);

 // Pagination calculations
 const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
 const startIndex = (currentPage - 1) * itemsPerPage;
 const endIndex = startIndex + itemsPerPage;
 const currentRows = filteredRows.slice(startIndex, endIndex);

 // Show loading indicator while verifying session
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
  <>
   {/* Snackbar */}
   {snackbarOpen && (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
     <div
      className={`px-6 py-4 rounded-lg shadow-lg ${
       snackbarSeverity === "success"
        ? "bg-green-500 text-white"
        : "bg-red-500 text-white"
      }`}
     >
      <div className="flex items-center gap-2">
       <span>{snackbarMessage}</span>
       <button
        onClick={() => setSnackbarOpen(false)}
        className="ml-4 text-xl hover:opacity-80"
       >
        ×
       </button>
      </div>
     </div>
    </div>
   )}

   <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
    <Sidebar
     userRole={user?.user_type === "Superadmin" ? "superadmin" : "admin"}
     currentPath="/AdminSettings"
     open={isSidebarOpen}
     onClose={handleSidebarToggle}
    />
    <Navbar handleSidebarToggle={handleSidebarToggle} />

    <div className="min-h-screen pt-8 p-4 mt-6 md:-mt-2 md:ml-52">
     {/* Header */}
     <div className="mb-6 grid items-center gap-2">
      <div className="flex gap-3 items-center">
       <KeyRound className="w-6 h-6 text-[#0a1a3b]" />
       <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0a1a3b] via-[#0f2e6b] to-[#0a1a3b] bg-clip-text text-transparent">
        Reset Passwords
       </h1>
      </div>
      <p className="text-1xl">
       Manage and reset user passwords for security purposes.
      </p>
     </div>

     {/* Search and Filters Section */}
     <div className="mb-6 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
       {/* Search Input */}
       <div className="relative flex-1 max-w-md group">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 w-4 h-4 transition-colors" />
        <input
         type="text"
         placeholder="Search by name, email, or user type..."
         value={searchQuery}
         onChange={(e) => setSearchQuery(e.target.value)}
         className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 bg-gray-50/50 hover:bg-white"
        />
       </div>

       <div className="flex flex-wrap items-center gap-3">
        <CustomSelect
         value={userTypeFilter}
         onChange={setUserTypeFilter}
         options={[
          "All Types",
          "Student",
          "Instructor",
          "Administrator",
          "Librarian",
         ]}
         icon={Users}
         placeholder="All Types"
         className="w-full md:w-48"
        />

        <CustomSelect
         value={statusFilter}
         onChange={setStatusFilter}
         options={
          user?.user_type === "Superadmin"
            ? ["All Status", "Pending", "Completed", "No Request"]
            : ["All Status", "Pending", "Completed"]
         }
         icon={Filter}
         placeholder="All Status"
         className="w-full md:w-48"
        />

        {isFiltered && (
         <button
          onClick={handleClearFilters}
          className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 font-medium hover:bg-red-50 rounded-lg transition-all"
         >
          <XCircle className="w-4 h-4" />
          Clear Filters
         </button>
        )}
       </div>
      </div>
     </div>

     {/* Password Reset Table */}
     <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
       <table className="w-full">
        <thead>
         <tr className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <th className="px-4 py-3 text-left text-xs font-semibold">
           Profile
          </th>
          <th className="px-4 py-3 text-left text-xs font-semibold">
           User ID
          </th>
          <th className="px-4 py-3 text-left text-xs font-semibold">
           First Name
          </th>
          <th className="px-4 py-3 text-left text-xs font-semibold">
           Last Name
          </th>
          <th className="px-4 py-3 text-left text-xs font-semibold">
           Email
          </th>
          <th className="px-4 py-3 text-left text-xs font-semibold">
           User Type
          </th>
          <th className="px-4 py-3 text-left text-xs font-semibold">
           Status
          </th>
          <th className="px-4 py-3 text-center text-xs font-semibold">
           Actions
          </th>
         </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
         {loading ? (
          <TableRowSkeleton columns={8} />
         ) : currentRows.length === 0 ? (
          <tr>
           <td
            colSpan={8}
            className="px-4 py-8 text-center text-sm text-gray-500"
           >
            No password reset requests found
           </td>
          </tr>
         ) : (
          currentRows.map((row) => {
           const canReset = user?.user_type === "Superadmin" || row.status === "Pending";
           const borderColorClass = getBorderColor(
            row.user_type || ""
           );

           return (
            <tr
             key={row.password_reset_id || row.user_id}
             className="hover:bg-gray-50 transition-colors"
            >
             <td className="px-4 py-3">
              <Avatar
               src={getProfilePictureUrl(row.profile_picture)}
               alt={`${row.first_name} ${row.last_name}`}
               className={`border-2 ${borderColorClass}`}
               sx={{ width: 40, height: 40 }}
              >
               {getInitials(row.first_name, row.last_name)}
              </Avatar>
             </td>
             <td className="px-4 py-3 text-sm text-gray-900">
              {row.user_id}
             </td>
             <td className="px-4 py-3 text-sm text-gray-900">
              {row.first_name}
             </td>
             <td className="px-4 py-3 text-sm text-gray-900">
              {row.last_name}
             </td>
             <td className="px-4 py-3 text-sm text-gray-700">
              {row.email}
             </td>
             <td className="px-4 py-3">
              <span
               className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                row.user_type === "Administrator"
                 ? "bg-purple-100 text-purple-800"
                 : row.user_type === "Instructor"
                 ? "bg-blue-100 text-blue-800"
                 : row.user_type === "Librarian"
                 ? "bg-yellow-100 text-yellow-800"
                 : "bg-green-100 text-green-800"
               }`}
              >
               {row.user_type}
              </span>
             </td>
             <td className="px-4 py-3">
              <span
               className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                row.status === "Completed"
                 ? "bg-green-100 text-green-800"
                 : row.status === "Pending"
                 ? "bg-orange-100 text-orange-800"
                 : "bg-gray-100 text-gray-800"
               }`}
              >
               {row.status === "Completed" && <CheckCircle className="w-3 h-3" />}
               {row.status === "Pending" && <Clock className="w-3 h-3" />}
               {row.status}
              </span>
             </td>
             <td className="px-4 py-3">
              <div className="flex items-center justify-center">
               <button
                onClick={() => handleOpenResetModal(row)}
                disabled={!canReset}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                 !canReset
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md"
                }`}
               >
                {!canReset ? "Completed" : "Reset Password"}
               </button>
              </div>
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
          {filteredRows.length} requests
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

   {selectedUser && (
    <PasswordResetModal
     open={openResetModal}
     onClose={handleCloseResetModal}
     user={selectedUser}
     onResetConfirm={handleResetPasswordConfirm}
    />
   )}
      <div className="md:ml-52">
     <Footer />
    </div>
   </>
  );
}
