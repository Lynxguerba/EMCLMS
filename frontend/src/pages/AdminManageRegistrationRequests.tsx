// MUI components (minimal usage now)
import { Box, CircularProgress } from "@mui/material";

// React hooks
import { useEffect, useState, useMemo } from "react";

// Routing and HTTP client
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRegistrationRequests, useAdminAllUsers } from "../hooks/useQueries";
import { RegistrationRequest } from "../types/user";

// Local components
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import AdminAcceptRegistrationModal from "./components/AdminAcceptRegistrationModal";
import AdminRejectRegistrationModal from "./components/AdminRejectRegistrationModal";
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
 CheckCircle,
 XCircle,
 ChevronLeft,
 ChevronRight,
 Clock,
 Filter,
} from "lucide-react";

// Dummy data removed as we now use useRegistrationRequests hook

export default function AdminManageRegistrationRequests() {
 const navigate = useNavigate();
 const { user, loading: authLoading } = useAuth();
 const [isSidebarOpen, setIsSidebarOpen] = useState(false);
 const { data: requests = [], isLoading: loading, refetch } = useRegistrationRequests();
 const { data: users = [] } = useAdminAllUsers();
 const [searchQuery, setSearchQuery] = useState("");
 const [statusFilter, setStatusFilter] = useState<string>("All Statuses");
 const [acceptModalOpen, setAcceptModalOpen] = useState(false);
 const [rejectModalOpen, setRejectModalOpen] = useState(false);
 const [selectedRequest, setSelectedRequest] =
  useState<RegistrationRequest | null>(null);
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

 const handleAcceptClick = (request: RegistrationRequest) => {
  setSelectedRequest(request);
  setAcceptModalOpen(true);
 };

 const handleRejectClick = (request: RegistrationRequest) => {
  setSelectedRequest(request);
  setRejectModalOpen(true);
 };

 const handleUserApproved = () => {
  setSnackbarMessage("Registration approved and user created successfully!");
  setSnackbarSeverity("success");
  setSnackbarOpen(true);
  refetch();
 };

 const handleRequestRejected = () => {
  setSnackbarMessage("Registration request rejected successfully");
  setSnackbarSeverity("success");
  setSnackbarOpen(true);
  refetch();
 };

 const handleRejectError = (message: string) => {
  setSnackbarMessage(message);
  setSnackbarSeverity("error");
  setSnackbarOpen(true);
 };

 const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);

 const formatRequestTime = (timestamp: string): string => {
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

 useEffect(() => {
  if (authLoading) return;

  if (!user || (user.user_type !== "Administrator" && user.user_type !== "Superadmin")) {
   navigate("/");
   return;
  }
 }, [user, authLoading, navigate]);

 // Search and status filter
 const filteredRequests = useMemo(() => {
  return requests.filter((request) => {
   const searchLower = searchQuery.toLowerCase();
   const matchesSearch = (request.email?.toLowerCase() || "").includes(searchLower);
   const matchesStatus =
    statusFilter === "All Statuses" ||
    request.status.toLowerCase() === statusFilter.toLowerCase();

   return matchesSearch && matchesStatus;
  });
 }, [searchQuery, statusFilter, requests]);

 // Reset to page 1 when search query or filter changes
 useEffect(() => {
  setCurrentPage(1);
 }, [searchQuery, statusFilter]);

 // Pagination calculations
 const totalPages = Math.max(1, Math.ceil(filteredRequests.length / itemsPerPage));
 const startIndex = (currentPage - 1) * itemsPerPage;
 const endIndex = startIndex + itemsPerPage;
 const currentRequests = filteredRequests.slice(startIndex, endIndex);

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
       <Clock className="w-6 h-6 text-[#0a1a3b]" />
       <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0a1a3b] via-[#0f2e6b] to-[#0a1a3b] bg-clip-text text-transparent">
        Registration Requests
       </h1>
      </div>
      <p className="text-1xl">
       Review, approve, or reject pending registration requests from
       users.
      </p>
     </div>

     {/* Search and Filters Section */}
     <div className="mb-6 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
       <div className="flex flex-col md:flex-row flex-1 gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md group">
         <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 w-4 h-4 transition-colors" />
         <input
          type="text"
          placeholder="Search by email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 bg-gray-50/50 hover:bg-white"
         />
        </div>

        <div className="flex flex-wrap items-center gap-3">
         {/* Status Filter */}
         <CustomSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={["All Statuses", "Pending", "Approved", "Rejected"]}
          icon={Filter}
          placeholder="All Statuses"
         />

         {/* Clear Filters */}
         {(searchQuery !== "" || statusFilter !== "All Statuses") && (
          <button
           onClick={() => {
            setSearchQuery("");
            setStatusFilter("All Statuses");
           }}
           className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 font-medium hover:bg-red-50 rounded-lg transition-all"
          >
           <XCircle className="w-4 h-4" />
           Clear Filters
          </button>
         )}
        </div>
       </div>

       <div className="text-sm text-gray-600 font-medium whitespace-nowrap">
        Total Requests:{" "}
        <span className="text-blue-600">{filteredRequests.length}</span>
       </div>
      </div>
     </div>

     {/* Requests Table */}
     <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
       <table className="w-full">
        <thead>
         <tr className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <th className="px-4 py-3 text-left text-xs font-semibold">
           Full Name
          </th>
          <th className="px-4 py-3 text-left text-xs font-semibold">
           Email
          </th>
          <th className="px-4 py-3 text-left text-xs font-semibold">
           Requested At
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
          <TableRowSkeleton columns={5} />
         ) : currentRequests.length === 0 ? (
          <tr>
           <td
            colSpan={5}
            className="px-4 py-8 text-center text-sm text-gray-500"
           >
            {filteredRequests.length === 0
             ? "No registration requests found"
             : "No requests on this page"}
           </td>
          </tr>
         ) : (
          currentRequests.map((request) => (
           <tr
            key={request.id}
            className="hover:bg-gray-50 transition-colors"
           >
            <td className="px-4 py-3 text-sm text-gray-900 font-medium">
             {request.first_name && request.last_name
              ? `${request.first_name} ${request.last_name}`
              : "—"}
            </td>
            <td className="px-4 py-3 text-sm text-gray-900 font-medium">
             {request.email}
            </td>
            <td className="px-4 py-3 text-sm text-gray-700">
             {formatRequestTime(request.requested_at)}
            </td>
            <td className="px-4 py-3">
             <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
               request.status === "pending"
                ? "bg-yellow-100 text-yellow-800"
                : request.status === "approved"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
              }`}
             >
              {request.status === "pending"
               ? "Pending"
               : request.status === "approved"
               ? "Approved"
               : "Rejected"}
             </span>
            </td>
            <td className="px-4 py-3">
             <div className="flex items-center justify-center gap-2">
              {/* Accept Button */}
              <div className="relative">
               <button
                onClick={() => handleAcceptClick(request)}
                onMouseEnter={() =>
                 setHoveredButton(`accept-${request.id}`)
                }
                onMouseLeave={() => setHoveredButton(null)}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Accept Registration"
               >
                <CheckCircle className="w-4 h-4" />
               </button>
               {hoveredButton === `accept-${request.id}` && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
                 Accept
                </div>
               )}
              </div>

              {/* Reject Button */}
              <div className="relative">
               <button
                onClick={() => handleRejectClick(request)}
                onMouseEnter={() =>
                 setHoveredButton(`reject-${request.id}`)
                }
                onMouseLeave={() => setHoveredButton(null)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Reject Registration"
               >
                <XCircle className="w-4 h-4" />
               </button>
               {hoveredButton === `reject-${request.id}` && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
                 Reject
                </div>
               )}
              </div>
             </div>
            </td>
           </tr>
          ))
         )}
        </tbody>
       </table>
      </div>

      {/* Pagination */}
      {filteredRequests.length > 0 && (
       <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
         <div className="text-xs text-gray-700">
          Showing {startIndex + 1} to{" "}
          {Math.min(endIndex, filteredRequests.length)} of{" "}
          {filteredRequests.length} requests
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

   <AdminAcceptRegistrationModal
    open={acceptModalOpen}
    onClose={() => setAcceptModalOpen(false)}
    onApproveUser={handleUserApproved}
    registrationEmail={selectedRequest?.email}
    firstName={selectedRequest?.first_name}
    lastName={selectedRequest?.last_name}
    users={users}
   />

   <AdminRejectRegistrationModal
    open={rejectModalOpen}
    onClose={() => setRejectModalOpen(false)}
    request={selectedRequest}
    onSuccess={handleRequestRejected}
    onError={handleRejectError}
   />
  </>
 );
}
