// MUI components (minimal usage now)
import { Box, CircularProgress, Avatar } from "@mui/material";

// React hooks
import { useEffect, useState, useMemo } from "react";

// Routing and HTTP client
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAdminAllUsers } from "../hooks/useQueries";
import { User } from "../types/user";
import { getProfilePictureUrl } from "../utils/imageUtils";
import axios from "axios";

// Local components
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AdminCreateUserModal from "./components/AdminCreateUserModal";
import AdminBulkUserUploadModal from "./components/AdminBulkUserUploadModal";
import AdminUserDeleteModal from "./components/AdminUserDeleteModal";
import AdminUserViewModal from "./components/AdminUserViewModal";
import AdminUserEditModal from "./components/AdminUserEditModal";
import { TableRowSkeleton } from "./components/Skeletons";
import CustomSelect from "../components/CustomSelect";
import TableItemsPerPage from "../components/TableItemsPerPage";

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

// Lucide icons
import {
 Search,
 UserPlus,
 Trash2,
 ChevronLeft,
 ChevronRight,
 Users,
 Eye,
 Edit,
 Upload,
 Filter,
 GraduationCap,
 XCircle,
 LogIn,
} from "lucide-react";

// Helper function to get initials
const getInitials = (firstName?: string, lastName?: string): string => {
 if (!firstName && !lastName) {
  return "U"; // Default to 'U' for unknown if both are empty
 }
 const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : "";
 const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : "";
 return `${firstInitial}${lastInitial}`;
};

// Helper function to get border color based on user type
const getBorderColor = (userType?: string): string => {
 switch (userType) {
  case "Superadmin":
   return "border-rose-500";
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

export default function AdminManageUsers() {
 const navigate = useNavigate();
 const { user: currentUser, loading: authLoading } = useAuth();
 const [isSidebarOpen, setIsSidebarOpen] = useState(false);
 const { data: users = [], isLoading: loading, refetch } = useAdminAllUsers();
 const [searchQuery, setSearchQuery] = useState("");
 const [userTypeFilter, setUserTypeFilter] = useState<string>("All Types");
 const [programFilter, setProgramFilter] = useState<string>("All Programs");
 const [open, setOpen] = useState(false);
 const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
 const [deleteModalOpen, setDeleteModalOpen] = useState(false);
 const [viewModalOpen, setViewModalOpen] = useState(false);
 const [editModalOpen, setEditModalOpen] = useState(false);
 const [selectedUser, setSelectedUser] = useState<User | null>(null);
 const [snackbarOpen, setSnackbarOpen] = useState(false);
 const [snackbarMessage, setSnackbarMessage] = useState("");
 const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
  "success"
 );

 // Tooltip state
 const [hoveredButton, setHoveredButton] = useState<string | null>(null);

 // Pagination state
 const [currentPage, setCurrentPage] = useState(1);
 const [itemsPerPage, setItemsPerPage] = useState(10);

 const handleViewClick = (user: User) => {
  setSelectedUser(user);
  setViewModalOpen(true);
 };

 const handleEditClick = (user: User) => {
  setSelectedUser(user);
  setEditModalOpen(true);
 };

 const handleDeleteClick = (user: User) => {
  setSelectedUser(user);
  setDeleteModalOpen(true);
 };

 const handleUserUpdated = () => {
  setSnackbarMessage("User updated successfully!");
  setSnackbarSeverity("success");
  setSnackbarOpen(true);
  refetch();
 };

 const handleUserDeleted = () => {
  refetch().then(() => {
    setSnackbarMessage("User deleted successfully");
    setSnackbarSeverity("success");
    setSnackbarOpen(true);
  });
 };

 const handleDeleteError = (message: string) => {
  setSnackbarMessage(message);
  setSnackbarSeverity("error");
  setSnackbarOpen(true);
 };

 const handleImpersonate = async (user: User) => {
  try {
   const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL}/api/impersonate-user/`,
    { user_id: user.user_id },
    { withCredentials: true }
   );
   if (response.data.user) {
    // Force a full page reload to reset the entire app state with the new user
    if (!(window as any).__isRedirectingToLogin) {
     (window as any).__isRedirectingToLogin = true;
     window.location.replace("/");
    }
   }
  } catch (error: any) {
   setSnackbarMessage(error.response?.data?.error || "Failed to impersonate user");
   setSnackbarSeverity("error");
   setSnackbarOpen(true);
  }
 };

 const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);

 const handleSaveNewUser = (_newUser: User) => {
  refetch();
 };

 const formatLastOnline = (timestamp: string | null | undefined): string => {
  if (!timestamp) return "—";

  try {
   const date = parseISO(timestamp);
   const now = new Date();
   const minutes = differenceInMinutes(now, date);

   if (minutes <= 5) return "Online";

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

  useEffect(() => {
   if (authLoading) return;
 
   if (!currentUser || (currentUser.user_type !== "Administrator" && currentUser.user_type !== "Superadmin")) {
    navigate("/");
    return;
   }
  }, [currentUser, authLoading, navigate]);

 // Derive unique programs for filter
 const uniquePrograms = useMemo(() => {
  const programs = users
   .map((u) => u.program)
   .filter((p): p is string => !!p && p !== "");
  return ["All Programs", ...Array.from(new Set(programs))];
 }, [users]);

 // Search filter
 const filteredUsers = useMemo(() => {
  return users.filter((user) => {
   const searchLower = searchQuery.toLowerCase();
   const matchesSearch =
    (user.first_name?.toLowerCase() || "").includes(searchLower) ||
    (user.last_name?.toLowerCase() || "").includes(searchLower) ||
    (user.email?.toLowerCase() || "").includes(searchLower) ||
    (user.user_type?.toLowerCase() || "").includes(searchLower) ||
    (user.program?.toLowerCase() || "").includes(searchLower);

   const matchesType =
    userTypeFilter === "All Types" || user.user_type === userTypeFilter;
   const matchesProgram =
    programFilter === "All Programs" || user.program === programFilter;

   return matchesSearch && matchesType && matchesProgram;
  });
 }, [searchQuery, userTypeFilter, programFilter, users]);

 // Reset to page 1 when search query or filters change
 useEffect(() => {
  setCurrentPage(1);
 }, [searchQuery, userTypeFilter, programFilter]);

 // Pagination calculations
 const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
 const startIndex = (currentPage - 1) * itemsPerPage;
 const endIndex = startIndex + itemsPerPage;
 const currentUsers = filteredUsers.slice(startIndex, endIndex);

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

   <div className="min-h-screen p-4 mt-6 md:-mt-2 bg-gradient-to-br from-gray-50 to-gray-100">
    <Sidebar
     userRole={currentUser?.user_type === "Superadmin" ? "superadmin" : "admin"}
     currentPath={"/AdminSettings"}
     open={isSidebarOpen}
     onClose={handleSidebarToggle}
    />
    <Navbar handleSidebarToggle={handleSidebarToggle} />

    <div className="min-h-screen pt-8 p-4 mt-6 md:-mt-2  md:ml-52">
     {/* Header - matching Dashboard style */}
     <div className="mb-6 grid items-center gap-2">
      <div className="flex gap-3 items-center">
       <Users className="w-6 h-6 text-[#0a1a3b]" />
       <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0a1a3b] via-[#0f2e6b] to-[#0a1a3b] bg-clip-text text-transparent">
        Manage Users
       </h1>
      </div>
      <p className="text-1xl">
       Create, view, and manage all users in the system.
      </p>
     </div>

     {/* Search and Filters Section */}
     <div className="mb-6 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
       <div className="flex flex-col md:flex-row flex-1 gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md group">
         <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 w-4 h-4 transition-colors" />
         <input
          type="text"
          placeholder="Search name, email, type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 bg-gray-50/50 hover:bg-white"
         />
        </div>

        <div className="flex flex-wrap items-center gap-3">
         {/* User Type Filter */}
         <CustomSelect
          value={userTypeFilter}
          onChange={setUserTypeFilter}
          options={["All Types", "Administrator", "Instructor", "Librarian", "Student"]}
          icon={Filter}
          placeholder="All User Types"
         />

         {/* Program Filter */}
         <CustomSelect
          value={programFilter}
          onChange={setProgramFilter}
          options={uniquePrograms}
          icon={GraduationCap}
          placeholder="All Programs"
         />

         {/* Clear Filters */}
         {(searchQuery !== "" ||
          userTypeFilter !== "All Types" ||
          programFilter !== "All Programs") && (
          <button
           onClick={() => {
            setSearchQuery("");
            setUserTypeFilter("All Types");
            setProgramFilter("All Programs");
           }}
           className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 font-medium hover:bg-red-50 rounded-lg transition-all"
          >
           <XCircle className="w-4 h-4" />
           Clear Filters
          </button>
         )}
        </div>
       </div>

       <div className="flex gap-2 shrink-0">
        <button
         onClick={() => setBulkUploadOpen(true)}
         className="relative overflow-hidden group flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
         <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
         <Upload className="w-4 h-4" />
         Bulk Upload
        </button>
        <button
         onClick={() => setOpen(true)}
         className="relative overflow-hidden group flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-sm"
        >
         <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
         <UserPlus className="w-4 h-4" />
         Create New User
        </button>
       </div>
      </div>
     </div>


     {/* Users Table */}
     <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
       <table className="w-full">
        <thead>
         <tr className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <th className="px-4 py-3 text-left text-xs font-semibold">
           Profile
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
           Program
          </th>
          <th className="px-4 py-3 text-left text-xs font-semibold">
           Last Online
          </th>
          <th className="px-4 py-3 text-center text-xs font-semibold">
           Actions
          </th>
         </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
         {loading ? (
          <TableRowSkeleton columns={8} />
         ) : currentUsers.length === 0 ? (
          <tr>
           <td
            colSpan={8}
            className="px-4 py-8 text-center text-sm text-gray-500"
           >
            No users found
           </td>
          </tr>
         ) : (
          currentUsers.map((user) => {
           let showDelete = false;
           if (user.last_online) {
            const date = parseISO(user.last_online);
            const yearsDiff = differenceInYears(new Date(), date);
            showDelete = yearsDiff >= 3;
           }

           const borderColorClass = getBorderColor(
            user.user_type || ""
           );

           return (
            <tr
             key={user.user_id}
             className="hover:bg-gray-50 transition-colors"
            >
             <td className="px-4 py-3">
              <div className="relative inline-block">
               <Avatar
                src={getProfilePictureUrl(user.profile_picture)}
                alt={`${user.first_name} ${user.last_name}`}
                className={`border-2 ${borderColorClass}`}
                sx={{ width: 40, height: 40 }}
               >
                {getInitials(user.first_name, user.last_name)}
               </Avatar>
               {formatLastOnline(user.last_online) ===
                "Online" && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse"></span>
               )}
              </div>
             </td>
             <td className="px-4 py-3 text-sm text-gray-900">
              {user.first_name}
             </td>
             <td className="px-4 py-3 text-sm text-gray-900">
              {user.last_name}
             </td>
             <td className="px-4 py-3 text-sm text-gray-700">
              {user.email}
             </td>
             <td className="px-4 py-3">
              <span
               className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                user.user_type === "Superadmin"
                 ? "bg-rose-100 text-rose-800"
                 : user.user_type === "Administrator"
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
             </td>
             <td className="px-4 py-3 text-sm text-gray-700">
              {user.program || "—"}
             </td>
             <td
              className={`px-4 py-3 text-sm ${
               formatLastOnline(user.last_online) === "Online"
                ? "text-green-600 font-bold"
                : "text-gray-700"
              }`}
             >
              {formatLastOnline(user.last_online)}
             </td>
             <td className="px-4 py-3">
              <div className="flex items-center justify-center gap-2">
               {/* View Button */}
               <div className="relative">
                <button
                 onClick={() => handleViewClick(user)}
                 onMouseEnter={() =>
                  setHoveredButton(`view-${user.user_id}`)
                 }
                 onMouseLeave={() => setHoveredButton(null)}
                 className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                 <Eye className="w-4 h-4" />
                </button>
                {hoveredButton === `view-${user.user_id}` && (
                 <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
                  View
                 </div>
                )}
               </div>

               {/* Edit Button */}
               <div className="relative">
                {(user.user_id === currentUser?.user_id || currentUser?.user_type === "Superadmin" || (user.user_type !== "Superadmin" && user.user_type !== "Administrator")) && (
                 <button
                  onClick={() => handleEditClick(user)}
                  onMouseEnter={() =>
                   setHoveredButton(`edit-${user.user_id}`)
                  }
                  onMouseLeave={() => setHoveredButton(null)}
                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                 >
                  <Edit className="w-4 h-4" />
                 </button>
                )}
                {hoveredButton === `edit-${user.user_id}` && (
                 <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
                  Edit
                 </div>
                )}
               </div>

                {/* Delete Button - Only show if last online > 3 years AND allowed */}
               {showDelete && (currentUser?.user_type === "Superadmin" || (user.user_type !== "Superadmin" && user.user_type !== "Administrator")) && (
                <div className="relative">
                 <button
                  onMouseEnter={() =>
                   setHoveredButton(`delete-${user.user_id}`)
                  }
                  onMouseLeave={() => setHoveredButton(null)}
                  onClick={() => handleDeleteClick(user)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                 >
                  <Trash2 className="w-4 h-4" />
                 </button>
                 {hoveredButton ===
                  `delete-${user.user_id}` && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
                   Delete
                  </div>
                 )}
                </div>
               )}

               {/* Login As Button - Only for Superadmin */}
               {currentUser?.user_type === "Superadmin" && user.user_id !== currentUser?.user_id && (
                <div className="relative">
                 <button
                  onClick={() => handleImpersonate(user)}
                  onMouseEnter={() =>
                   setHoveredButton(`impersonate-${user.user_id}`)
                  }
                  onMouseLeave={() => setHoveredButton(null)}
                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                 >
                  <LogIn className="w-4 h-4" />
                 </button>
                 {hoveredButton === `impersonate-${user.user_id}` && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
                   Login As
                  </div>
                 )}
                </div>
               )}
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
      {filteredUsers.length > 0 && (
       <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
         <div className="text-xs text-gray-700">
          Showing {startIndex + 1} to{" "}
          {Math.min(endIndex, filteredUsers.length)} of{" "}
          {filteredUsers.length} users
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

   <AdminCreateUserModal
    open={open}
    onClose={() => setOpen(false)}
    onSaveUser={handleSaveNewUser}
    users={users}
   />

   <AdminBulkUserUploadModal
    open={bulkUploadOpen}
    onClose={() => setBulkUploadOpen(false)}
    onSuccess={() => {
      refetch();
      setSnackbarMessage("Bulk upload completed successfully!");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    }}
   />

   <AdminUserDeleteModal
    open={deleteModalOpen}
    onClose={() => setDeleteModalOpen(false)}
    user={selectedUser}
    onSuccess={handleUserDeleted}
    onError={handleDeleteError}
   />

   <AdminUserViewModal
    open={viewModalOpen}
    onClose={() => setViewModalOpen(false)}
    user={selectedUser}
   />

   <AdminUserEditModal
    open={editModalOpen}
    onClose={() => setEditModalOpen(false)}
    user={selectedUser}
    onSuccess={handleUserUpdated}
    onError={handleDeleteError}
   />
      <div className="md:ml-52">
     <Footer />
    </div>
   </>
  );
}
