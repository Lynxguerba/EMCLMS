import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
 Box,
 Dialog,
 DialogContent,
 DialogActions,
 IconButton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
 BookOpen,
 CheckCircle,
 X,
 ChevronLeft,
 ChevronRight,
 AlertTriangle,
 Calendar,
 AlertCircle,
 PackageCheck,
 Clock,
 Search,
 Filter,
 } from "lucide-react";
 import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import TableItemsPerPage from "../components/TableItemsPerPage";
import { 
  useLibrarianBookRequests, 
  useUpdateBookRequestStatus,
  useRejectBookRequest,
  useConfirmBookPickup
} from "../hooks/useQueries";
import { TableSkeleton } from "./components/Skeletons";

interface BookRequest {
 request_id: number;
 user_id: number;
 user_name: string;
 user_email: string;
 user_type: string;
 book_title: string;
 book_author: string;
 book_isbn: string;
 reason: string;
 request_date: string;
 status: "Pending" | "Approved";
}

export default function LibrarianBookRequests() {
 const theme = useTheme();
 const location = useLocation();
 const navigate = useNavigate();
 const { user, loading: authLoading } = useAuth();

 // Queries & Mutations
 const { data: bookRequests = [], isLoading } = useLibrarianBookRequests();
 const updateStatusMutation = useUpdateBookRequestStatus();
 const rejectMutation = useRejectBookRequest();

 useEffect(() => {
  if (authLoading) return;
  if (!user || user.user_type !== "Librarian") {
    navigate("/");
  }
 }, [user, authLoading, navigate]);

 const currentPath = location.pathname;

 const [isSidebarOpen, setIsSidebarOpen] = useState(false);
 const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);

 const [searchQuery, setSearchQuery] = useState("");
 const [statusFilter, setStatusFilter] = useState("All");
 const [userTypeFilter, setUserTypeFilter] = useState("All");

 const [snackbar, setSnackbar] = useState({
  open: false,
  message: "",
  severity: "success" as "success" | "error",
 });

 const [deleteConfirmation, setDeleteConfirmation] = useState<{
  open: boolean;
  id: number | null;
 }>({
  open: false,
  id: null,
 });

 const [pickupModal, setPickupModal] = useState<{
  open: boolean;
  request: BookRequest | null;
 }>({
  open: false,
  request: null,
 });

 // Pagination
 const [currentPage, setCurrentPage] = useState(1);
 const [itemsPerPage, setItemsPerPage] = useState(10);

 // Step 1: Approve for Pickup (Pending -> Approved)
 const handleApproveForPickup = async (request: BookRequest) => {
    updateStatusMutation.mutate(
      { requestId: request.request_id, status: "Approved" },
      {
        onSuccess: () => showSnackbar("Request approved", "success"),
        onError: () => showSnackbar("Failed to update request status", "error")
      }
    );
 };

 // Revert Status (Approved -> Pending)
 const handleRevert = async (request: BookRequest) => {
    updateStatusMutation.mutate(
      { requestId: request.request_id, status: "Pending" },
      {
        onSuccess: () => showSnackbar("Request reverted to pending", "success"),
        onError: () => showSnackbar("Failed to revert request", "error")
      }
    );
 };

 // Step 2: Confirm Pickup (Approved -> Borrowed)
 const handleConfirmPickupClick = (request: BookRequest) => {
  setPickupModal({ open: true, request });
 };

 const handleReject = async (id: number) => {
  rejectMutation.mutate(id, {
    onSuccess: () => showSnackbar("Request rejected successfully", "success"),
    onError: () => showSnackbar("Failed to reject request", "error")
  });
 };


 const handleRejectClick = (id: number) => {
  setDeleteConfirmation({ open: true, id });
 };

 const handleCloseDeleteConfirmation = () => {
  setDeleteConfirmation({ open: false, id: null });
 };

 const handleConfirmReject = async () => {
  if (deleteConfirmation.id !== null) {
   await handleReject(deleteConfirmation.id);
   handleCloseDeleteConfirmation();
  }
 };

 const showSnackbar = (message: string, severity: "success" | "error") => {
  setSnackbar({ open: true, message, severity });
  setTimeout(() => setSnackbar(prev => ({ ...prev, open: false })), 3000);
 };

 // Filter: Show both Pending and Approved, and apply search
 const filteredRequests = (bookRequests as BookRequest[]).filter((r) => {
  const matchesStatus = statusFilter === "All" ? (r.status === "Pending" || r.status === "Approved") : r.status === statusFilter;
  const matchesUserType = userTypeFilter === "All" || r.user_type === userTypeFilter;
  const matchesSearch = 
    r.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.book_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.book_isbn && r.book_isbn.toLowerCase().includes(searchQuery.toLowerCase())) ||
    r.user_email.toLowerCase().includes(searchQuery.toLowerCase());
  
  return matchesStatus && matchesUserType && matchesSearch;
 });

 const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
 const startIndex = (currentPage - 1) * itemsPerPage;
 const endIndex = startIndex + itemsPerPage;
 const currentRecords = filteredRequests.slice(startIndex, endIndex);

 if (authLoading) return null;

 return (
  <>
   <Box
    sx={{
     height: "100vh",
     overflowY: "auto",
     backgroundColor: theme.palette.background.default,
    }}
   >
    <Sidebar
     userRole="librarian"
     currentPath={currentPath}
     open={isSidebarOpen}
     onClose={handleSidebarToggle}
    />
    <Navbar handleSidebarToggle={handleSidebarToggle} />

    {/* Snackbar */}
    {snackbar.open && (
     <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
      <div
       className={`px-6 py-4 rounded-lg shadow-lg ${
        snackbar.severity === "success"
         ? "bg-green-500 text-white"
         : "bg-red-500 text-white"
       }`}
      >
       <div className="flex items-center gap-2">
        <span>{snackbar.message}</span>
        <button
         onClick={() => setSnackbar(prev => ({ ...prev, open: false }))}
         className="ml-4 text-xl hover:opacity-80"
        >
         ×
        </button>
       </div>
      </div>
     </div>
    )}

    <div className="min-h-screen pt-8 p-4 mt-6 md:-mt-2 md:ml-52 bg-gradient-to-br from-gray-50 to-gray-100">
     {/* Header */}
     <div className="mb-6">
      <div className="flex gap-3 items-center mb-2">
       <BookOpen className="w-6 h-6 text-[#0a1a3b]" />
       <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0a1a3b] via-[#0f2e6b] to-[#0a1a3b] bg-clip-text text-transparent">
        Book Requests
       </h1>
      </div>
      <p className="text-gray-600">
       Manage book requests. Approve for pickup, then confirm handover.
      </p>
     </div>

     {/* Filters & Search */}
     <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
      <div className="relative w-full md:max-w-md">
       <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-gray-400" />
       </div>
       <input
        type="text"
        placeholder="Search by student, book title, or ISBN..."
        value={searchQuery}
        onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1); // Reset to first page on search
        }}
        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200 shadow-sm"
       />
      </div>

      <div className="flex flex-wrap gap-3 w-full md:w-auto">
        {/* Status Filter */}
        <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
                value={statusFilter}
                onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                }}
                className="block pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-xl bg-white shadow-sm"
            >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
            </select>
        </div>

        {/* User Type Filter */}
        <div className="flex items-center gap-2">
            <select
                value={userTypeFilter}
                onChange={(e) => {
                    setUserTypeFilter(e.target.value);
                    setCurrentPage(1);
                }}
                className="block pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-xl bg-white shadow-sm"
            >
                <option value="All">All User Types</option>
                <option value="Student">Student</option>
                <option value="Instructor">Instructor</option>
            </select>
        </div>
      </div>
     </div>

     {/* Requests Table */}
     <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {isLoading ? (
        <TableSkeleton columns={6} rows={10} />
      ) : filteredRequests.length === 0 ? (
       <div className="p-8 text-center">
        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">
         {searchQuery ? "No matching book requests found" : "No active book requests"}
        </p>
        <p className="text-xs text-gray-400 mt-1">
         {searchQuery ? "Try adjusting your search terms" : "All requests have been processed"}
        </p>
       </div>
      ) : (
       <>
        <div className="overflow-x-auto">
         <table className="w-full">
          <thead>
           <tr className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
            <th className="px-4 py-3 text-left text-xs font-semibold">
             Student Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold">
             Book Title
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold">
             Reason
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold">
             Request Date
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold">
             Status
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold">
             Actions
            </th>
           </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
           {currentRecords.map((request) => (
            <tr
             key={request.request_id}
             className="hover:bg-gray-50 transition-colors"
            >
             <td className="px-4 py-3">
              <p className="text-sm font-medium text-gray-900">
               {request.user_name}
              </p>
              <p className="text-xs text-gray-500">
                {request.user_email}
              </p>
             </td>
             <td className="px-4 py-3">
              <p className="text-sm font-medium text-gray-900">
               {request.book_title}
              </p>
              <p className="text-xs text-gray-500">
                {request.book_isbn}
              </p>
             </td>
             <td className="px-4 py-3">
              <p className="text-xs text-gray-600 truncate max-w-xs">
               {request.reason || "—"}
              </p>
             </td>
             <td className="px-4 py-3">
              <p className="text-sm text-gray-700">
               {new Date(
                request.request_date
               ).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
               })}
              </p>
             </td>
             <td className="px-4 py-3 text-center">
                {request.status === "Pending" ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                    </span>
                ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Approved
                    </span>
                )}
             </td>
             <td className="px-4 py-3">
              <div className="flex items-center justify-center gap-2">
               {request.status === "Pending" && (
                   <>
                       <button
                        onClick={() => handleApproveForPickup(request)}
                        disabled={updateStatusMutation.isPending}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                       >
                        <CheckCircle className="w-3 h-3" />
                        Approve
                       </button>
                       <button
                        onClick={() => handleRejectClick(request.request_id)}
                        disabled={rejectMutation.isPending}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                       >
                        <X className="w-3 h-3" />
                        Reject
                       </button>
                   </>
               )}
               {request.status === "Approved" && (
                   <>
                       <button
                        onClick={() => handleConfirmPickupClick(request)}
                        disabled={updateStatusMutation.isPending}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                       >
                        <PackageCheck className="w-3 h-3" />
                        Pickup
                       </button>
                       <button
                        onClick={() => handleRevert(request)}
                        disabled={updateStatusMutation.isPending}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-500 text-white text-xs font-semibold rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                       >
                        <Clock className="w-3 h-3" />
                        Revert
                       </button>
                   </>
               )}
              </div>
             </td>
            </tr>
           ))}
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
             setCurrentPage((prev) =>
              Math.min(prev + 1, totalPages)
             )
            }
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
           >
            <ChevronRight className="w-4 h-4" />
           </button>
          </div>
         </div>
        )}
       </>
      )}
     </div>
    </div>
    
    <Dialog
     open={deleteConfirmation.open}
     onClose={handleCloseDeleteConfirmation}
     maxWidth="sm"
     fullWidth
     PaperProps={{
      sx: {
       borderRadius: 3,
       boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
      },
     }}
     BackdropProps={{
      sx: {
       backdropFilter: "blur(8px)",
       backgroundColor: "rgba(0, 0, 0, 0.5)",
      },
     }}
    >
     <div className="bg-gradient-to-r from-red-600 to-orange-700 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
       <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
        <AlertTriangle className="w-6 h-6 text-white" />
       </div>
       <div>
        <h2 className="text-xl font-bold text-white">
         Confirm Rejection
        </h2>
        <p className="text-red-100 text-sm">
         This action cannot be undone
        </p>
       </div>
      </div>
      <IconButton
       onClick={handleCloseDeleteConfirmation}
       sx={{ color: "white" }}
      >
       <X className="w-5 h-5" />
      </IconButton>
     </div>

     <DialogContent className="p-6">
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
       <div className="mt-1">
        <AlertTriangle className="w-5 h-5 text-red-600" />
       </div>
       <div>
        <h3 className="text-sm font-bold text-red-800">
         Warning
        </h3>
        <p className="text-sm text-red-700 mt-1">
         Are you sure you want to reject this book request?
         The student will be notified, and this request
         will be permanently removed from the pending list.
        </p>
       </div>
      </div>
     </DialogContent>

     <DialogActions className="px-6 py-4 bg-gray-50 border-t border-gray-200">
      <button
       onClick={handleCloseDeleteConfirmation}
       disabled={rejectMutation.isPending}
       className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
       Cancel
      </button>
      <button
       onClick={handleConfirmReject}
       disabled={rejectMutation.isPending}
       className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-orange-600 rounded-lg hover:from-red-700 hover:to-orange-700 shadow-md hover:shadow-lg transition-all"
      >
       {rejectMutation.isPending ? "Rejecting..." : "Confirm Reject"}
      </button>
     </DialogActions>
    </Dialog>

    {/* Pickup Confirmation Modal */}
    {pickupModal.open && pickupModal.request && (
     <ConfirmPickupModal
      request={pickupModal.request}
      onClose={() => setPickupModal({ open: false, request: null })}
      onSuccess={(message) => {
       showSnackbar(message, "success");
       setPickupModal({ open: false, request: null });
      }}
     />
    )}
   </Box>
  </>
 );
}

// Confirm Pickup Modal Component (Formerly ApproveRequestModal)
function ConfirmPickupModal({
 request,
 onClose,
 onSuccess,
}: {
 request: BookRequest;
 onClose: () => void;
 onSuccess: (message: string) => void;
}) {
 const [loanDays, setLoanDays] = useState(7);
 const pickupMutation = useConfirmBookPickup();

 const handleSubmit = async () => {
  pickupMutation.mutate(
    { requestId: request.request_id, days: loanDays },
    {
      onSuccess: () => {
        onSuccess("Book pickup confirmed and borrow record created.");
        onClose();
      },
      onError: () => alert("Error confirming pickup")
    }
  );
 };

 return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
   <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
    {/* Header */}
    <div className="bg-gradient-to-r from-green-50 to-green-100 px-4 py-3 flex items-center justify-between border-b border-gray-200">
     <div className="flex items-center gap-2">
      <PackageCheck className="w-5 h-5 text-green-800" />
      <h2 className="text-lg font-bold text-green-800">Confirm Book Pickup</h2>
     </div>
     <button
      onClick={onClose}
      className="text-gray-600 hover:bg-gray-200 rounded-lg p-1.5 transition-all duration-200 hover:rotate-90"
     >
      <X className="w-5 h-5" />
     </button>
    </div>

    {/* Content */}
    <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
     {/* Info message */}
     <div className="mb-4 flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-blue-800">
       Confirming this will create a borrow record and start the loan timer.
      </p>
     </div>

     <div className="space-y-3">
      {/* User Selection (Disabled) */}
      <div>
       <label className="block text-xs font-semibold text-gray-700 mb-1">
        Student
       </label>
       <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm font-medium text-gray-900">
         {request.user_name}
        </p>
        <p className="text-xs text-gray-600">
         {request.user_email}
        </p>
       </div>
      </div>

      {/* Book Selection (Disabled) */}
      <div>
       <label className="block text-xs font-semibold text-gray-700 mb-1">
        Book
       </label>
       <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm font-medium text-gray-900">
         {request.book_title}
        </p>
        <p className="text-xs text-gray-600">
         ISBN: {request.book_isbn}
        </p>
       </div>
      </div>

      {/* Loan Period */}
      <div>
       <label className="block text-xs font-semibold text-gray-700 mb-1">
        Loan Period (Days) <span className="text-red-500">*</span>
       </label>
       <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
         <Calendar className="h-4 w-4 text-gray-400" />
        </div>
        <select
         value={loanDays}
         onChange={(e) => setLoanDays(Number(e.target.value))}
         className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all appearance-none bg-white"
        >
         <option value={7}>7 days (Short-term)</option>
         <option value={14}>14 days (Standard)</option>
         <option value={21}>21 days (Extended)</option>
         <option value={30}>30 days (Faculty)</option>
        </select>
       </div>
      </div>

      {/* Due Date Display */}
      {loanDays && (
       <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2 text-sm">
         <Calendar className="w-4 h-4 text-gray-600" />
         <span className="text-gray-700">Due Date:</span>
         <span className="font-semibold text-gray-900">
          {new Date(
           Date.now() + loanDays * 24 * 60 * 60 * 1000
          ).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
               })}
         </span>
        </div>
       </div>
      )}
     </div>
    </div>

    {/* Footer */}
    <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-t border-gray-200 flex justify-end gap-2">
     <button
      type="button"
      onClick={onClose}
      className="px-5 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-all duration-200 font-medium hover:shadow-md"
     >
      Cancel
     </button>
     <button
      type="button"
      onClick={handleSubmit}
      disabled={pickupMutation.isPending}
      className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
     >
      {pickupMutation.isPending ? (
       <>
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        Processing...
       </>
      ) : (
       <>
        <CheckCircle className="w-4 h-4" />
        Confirm Pickup
       </>
      )}
     </button>
    </div>
   </div>
      <div className="md:ml-52">
     <Footer />
    </div>
   </div>
  );
}
