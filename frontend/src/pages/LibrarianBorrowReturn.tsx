import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Box, CircularProgress } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Search,
  BookUp,
  BookDown,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  BookOpen,
} from "lucide-react";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import TableItemsPerPage from "../components/TableItemsPerPage";
import { 
  useLibrarianBorrowRecords, 
  useLibrarianBookRequests,
  useBorrowBook,
  useReturnBook,
  useCheckUser,
  useCheckBook
} from "../hooks/useQueries";
import { TableSkeleton } from "./components/Skeletons";

// Types
interface BorrowRecord {
  id: number;
  book_title: string;
  book_isbn: string;
  user_name: string;
  user_id: string;
  user_type: string;
  borrow_date: string;
  due_date: string;
  return_date: string | null;
  status: "borrowed" | "returned" | "overdue";
  fine_amount: number;
  librarian_name: string;
  book_condition: string;
  notes: string;
}

export default function LibrarianBorrowReturn() {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.user_type !== "Librarian") {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  const currentPath = location.pathname;

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);

  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Queries & Mutations
  const { data: records = [], isLoading: isLoadingRecords } = useLibrarianBorrowRecords();
  const { data: bookRequests = [], isLoading: isLoadingRequests } = useLibrarianBookRequests();

  const loading = isLoadingRecords || isLoadingRequests;

  // Modal states
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isReturnedBooksModalOpen, setIsReturnedBooksModalOpen] =
    useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BorrowRecord | null>(
    null
  );

  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbar({ open: true, message, severity });
    setTimeout(() => setSnackbar({ ...snackbar, open: false }), 3000);
  };

  // Search and filter
  const filteredRecords = useMemo(() => {
    let filtered = (records as BorrowRecord[]).filter((record) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        (record.book_title?.toLowerCase() ?? "").includes(searchLower) ||
        (record.user_name?.toLowerCase() ?? "").includes(searchLower) ||
        (record.user_id?.toLowerCase() ?? "").includes(searchLower) ||
        (record.book_isbn?.toLowerCase() ?? "").includes(searchLower);

      const matchesStatus =
        statusFilter === "all" || record.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Sort: Borrowed/Overdue first, then Returned. Then by date Newest First (Descending).
    return [...filtered].sort((a, b) => {
      const aIsReturned = a.status?.toLowerCase() === "returned";
      const bIsReturned = b.status?.toLowerCase() === "returned";

      if (aIsReturned && !bIsReturned) return 1;
      if (!aIsReturned && bIsReturned) return -1;

      return (
        new Date(b.borrow_date).getTime() - new Date(a.borrow_date).getTime()
      );
    });
  }, [records, searchQuery, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRecords = filteredRecords.slice(startIndex, endIndex);

  // Handlers
  const handleReturnBook = (record: BorrowRecord) => {
    setSelectedRecord(record);
    setIsReturnModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      borrowed: { bg: "bg-blue-100", text: "text-blue-800", icon: Clock },
      returned: {
        bg: "bg-green-100",
        text: "text-green-800",
        icon: CheckCircle,
      },
      overdue: { bg: "bg-red-100", text: "text-red-800", icon: AlertCircle },
    };
    const config = configs[status as keyof typeof configs] || configs.borrowed;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
      >
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const calculateDaysRemaining = (
    dueDate: string,
    returnDate: string | null
  ) => {
    const due = new Date(dueDate);
    const today = returnDate ? new Date(returnDate) : new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const activeRequestsCount = (bookRequests as any[]).filter(
    (r) => r.status === "Pending" || r.status === "Approved"
  ).length;

  if (authLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress size="2rem" />
      </Box>
    );
  }

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
                  onClick={() => setSnackbar({ ...snackbar, open: false })}
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
              <BookUp className="w-6 h-6 text-[#0a1a3b]" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0a1a3b] via-[#0f2e6b] to-[#0a1a3b] bg-clip-text text-transparent">
                Borrow & Return Management
              </h1>
            </div>
            <p className="text-gray-600">
              Process book borrowing and returns, track due dates and manage
              fines.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-12"></div>
                </div>
              ))
            ) : (
              <>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Currently Borrowed</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {records.filter((r: any) => r.status === "borrowed").length}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Overdue Books</p>
                      <p className="text-2xl font-bold text-red-600">
                        {records.filter((r: any) => r.status === "overdue").length}
                      </p>
                    </div>
                    <div className="p-3 bg-red-100 rounded-lg">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Returned Today</p>
                      <p className="text-2xl font-bold text-green-600">
                        {
                          records.filter(
                            (r: any) =>
                              r.status === "returned" &&
                              r.return_date ===
                                new Date().toISOString().split("T")[0]
                          ).length
                        }
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pending Requests</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {activeRequestsCount}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <BookOpen className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Search and Actions */}
          <div className="mb-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by book title, user name, or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all appearance-none bg-white"
                  >
                    <option value="all">All Status</option>
                    <option value="borrowed">Borrowed</option>
                    <option value="overdue">Overdue</option>
                    <option value="returned">Returned</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setIsBorrowModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                >
                  <BookUp className="w-4 h-4" />
                  Borrow Book
                </button>
                <button
                  onClick={() => navigate("/LibrarianBookRequests")}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
                >
                  <BookOpen className="w-4 h-4" />
                  Pending Requests
                </button>
                <button
                  onClick={() => setIsReturnedBooksModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  Returned Books
                </button>
              </div>
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                    <th className="px-4 py-3 text-left text-xs font-semibold">
                      Book
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold">
                      Borrower
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold">
                      User Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold">
                      Borrow Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold">
                      Due Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold">
                      Days Left
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
                  {isLoadingRecords ? (
                    <tr>
                      <td colSpan={8} className="p-0">
                        <TableSkeleton columns={8} rows={10} />
                      </td>
                    </tr>
                  ) : currentRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-8 text-center text-sm text-gray-500"
                      >
                        No records found
                      </td>
                    </tr>
                  ) : (
                    currentRecords.map((record) => {
                      const daysLeft = calculateDaysRemaining(
                        record.due_date,
                        record.return_date
                      );

                      return (
                        <tr
                          key={record.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="text-sm text-gray-900 font-medium">
                                {record.book_title}
                              </span>
                              <span className="text-xs text-gray-500">
                                {record.book_isbn}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="text-sm text-gray-900 font-medium">
                                {record.user_name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {record.user_id}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              <User className="w-3 h-3" />
                              {record.user_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {new Date(record.borrow_date).toLocaleDateString(
                              undefined,
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {new Date(record.due_date).toLocaleDateString(
                              undefined,
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {record.status !== "returned" && (
                              <span
                                className={`text-sm font-medium ${
                                  daysLeft < 0
                                    ? "text-red-600"
                                    : daysLeft <= 3
                                    ? "text-orange-600"
                                    : "text-gray-700"
                                }`}
                              >
                                {daysLeft < 0
                                  ? `${Math.abs(daysLeft)} days late`
                                  : `${daysLeft} days`}
                              </span>
                            )}
                            {record.status === "returned" && (
                              <span className="text-sm text-gray-500">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {getStatusBadge(record.status)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center">
                              {record.status !== "returned" && (
                                <button
                                  onClick={() => handleReturnBook(record)}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  <BookDown className="w-3 h-3" />
                                  Return
                                </button>
                              )}
                              {record.status === "returned" && (
                                <span className="text-xs text-gray-400">
                                  Completed
                                </span>
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
            {filteredRecords.length > 0 && (
              <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-xs text-gray-700">
                    Showing {startIndex + 1} to{" "}
                    {Math.min(endIndex, filteredRecords.length)} of{" "}
                    {filteredRecords.length} records
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
                  </div>                </div>
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
      </Box>

      {/* Borrow Modal */}
      {isBorrowModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setIsBorrowModalOpen(false)}
          />
          <BorrowBookModal
            onClose={() => setIsBorrowModalOpen(false)}
            onSuccess={(message) => {
              showSnackbar(message, "success");
              setIsBorrowModalOpen(false);
            }}
          />
        </>
      )}

      {/* Return Modal */}
      {isReturnModalOpen && selectedRecord && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => {
              setIsReturnModalOpen(false);
              setSelectedRecord(null);
            }}
          />
          <ReturnBookModal
            record={selectedRecord}
            onClose={() => {
              setIsReturnModalOpen(false);
              setSelectedRecord(null);
            }}
            onSuccess={(message) => {
              showSnackbar(message, "success");
              setIsReturnModalOpen(false);
              setSelectedRecord(null);
            }}
          />
        </>
      )}

      {/* Returned Books Modal */}
      {isReturnedBooksModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setIsReturnedBooksModalOpen(false)}
          />
          <ReturnedBooksModal
            records={records}
            onClose={() => setIsReturnedBooksModalOpen(false)}
          />
        </>
      )}
    </>
  );
}

// Borrow Book Modal Component
function BorrowBookModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [searchUser, setSearchUser] = useState("");
  const [searchBook, setSearchBook] = useState("");
  const [loanDays, setLoanDays] = useState(14);
  const [error, setError] = useState("");

  const { data: selectedUser, isFetching: isFetchingUser } = useCheckUser(searchUser);
  const { data: selectedBook, isFetching: isFetchingBook } = useCheckBook(searchBook);
  const borrowMutation = useBorrowBook();

  const handleSubmit = async () => {
    if (!selectedUser || !selectedBook) {
      setError("Please select both a user and a book");
      return;
    }
    
    borrowMutation.mutate(
      {
        user_id: selectedUser.id,
        book_isbn: selectedBook.isbn,
        days: loanDays,
      },
      {
        onSuccess: () => {
          onSuccess(`Book "${selectedBook.title}" borrowed by ${selectedUser.name} successfully`);
          onClose();
        },
        onError: (err: any) => {
          setError(err.response?.data?.error || "Failed to borrow book");
        }
      }
    );
  };

  const isFormValid = selectedUser && selectedBook;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-2">
            <BookUp className="w-5 h-5 text-gray-800" />
            <h2 className="text-lg font-bold text-gray-800">Borrow Book</h2>
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
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {/* User Selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                User ID <span className="text-red-500">*</span>
              </label>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Enter User ID..."
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                {isFetchingUser && <CircularProgress size={20} className="mt-2" />}
              </div>
              {selectedUser && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">
                    {selectedUser.name}
                  </p>
                  <p className="text-xs text-gray-600">
                    {selectedUser.id} • {selectedUser.type}
                  </p>
                  <p className="text-xs text-gray-600">
                    Currently borrowed: {selectedUser.borrowed_count} books
                  </p>
                </div>
              )}
            </div>

            {/* Book Selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Book ISBN <span className="text-red-500">*</span>
              </label>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BookOpen className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Enter Book ISBN..."
                    value={searchBook}
                    onChange={(e) => setSearchBook(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                {isFetchingBook && <CircularProgress size={20} className="mt-2" />}
              </div>
              {selectedBook && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">
                    {selectedBook.title}
                  </p>
                  <p className="text-xs text-gray-600">
                    {selectedBook.author}
                  </p>
                  <p className="text-xs text-gray-600">
                    ISBN: {selectedBook.isbn} • Available:{" "}
                    {selectedBook.available_copies}
                  </p>
                </div>
              )}
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
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white"
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
            disabled={!isFormValid || borrowMutation.isPending}
            className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {borrowMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <BookUp className="w-4 h-4" />
                Confirm Borrow
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Return Book Modal Component
function ReturnBookModal({
  record,
  onClose,
  onSuccess,
}: {
  record: BorrowRecord;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [condition, setCondition] = useState("good");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const returnMutation = useReturnBook();

  const calculateDaysRemaining = (dueDate: string, returnDate: string | null) => {
    const due = new Date(dueDate);
    const today = returnDate ? new Date(returnDate) : new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysLate = Math.max(0, -calculateDaysRemaining(record.due_date, null));

  const handleSubmit = async () => {
    returnMutation.mutate(
      { recordId: record.id, condition, notes },
      {
        onSuccess: () => {
          onSuccess(`Book "${record.book_title}" returned successfully`);
          onClose();
        },
        onError: (err: any) => {
          setError(err.response?.data?.error || "Failed to return book");
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-2">
            <BookDown className="w-5 h-5 text-gray-800" />
            <h2 className="text-lg font-bold text-gray-800">Return Book</h2>
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
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {/* Book Info */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Book Information
              </label>
              <div className="bg-gray-50 p-3 rounded-lg space-y-2 border border-gray-200">
                <div>
                  <p className="text-xs text-gray-600">Title</p>
                  <p className="text-sm font-medium text-gray-900">
                    {record.book_title}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-gray-600">ISBN</p>
                    <p className="text-sm font-medium text-gray-900">
                      {record.book_isbn}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">User ID</p>
                    <p className="text-sm font-medium text-gray-900">
                      {record.user_id}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Borrow Date</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(record.borrow_date).toLocaleDateString(
                        undefined,
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Due Date</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(record.due_date).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Late Notice */}
            {daysLate > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-red-900">
                      Overdue Return
                    </p>
                    <p className="text-xs text-red-700">
                      This book is {daysLate} days late
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Book Condition */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Book Condition <span className="text-red-500">*</span>
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white"
              >
                <option value="excellent">Excellent - Like new</option>
                <option value="good">Good - Normal wear</option>
                <option value="fair">Fair - Noticeable wear</option>
                <option value="poor">Poor - Damaged</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes about the return..."
                rows={3}
                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition-all"
              />
            </div>

            {/* Return Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-gray-900 mb-2">
                Return Summary
              </h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Return Date:</span>
                  <span className="font-medium text-gray-900">
                    {new Date().toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Days Borrowed:</span>
                  <span className="font-medium text-gray-900">
                    {Math.ceil(
                      (new Date().getTime() -
                        new Date(record.borrow_date).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )}{" "}
                    days
                  </span>
                </div>
                {daysLate > 0 && (
                  <div className="flex justify-between text-red-600 pt-2 border-t border-blue-200">
                    <span className="font-semibold">Days Late:</span>
                    <span className="font-semibold">{daysLate} days</span>
                  </div>
                )}
              </div>
            </div>
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
            disabled={returnMutation.isPending}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {returnMutation.isPending ? "Processing..." : (
              <>
                <BookDown className="w-4 h-4" />
                Process Return
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Returned Books Modal Component
function ReturnedBooksModal({
  records,
  onClose,
}: {
  records: any[];
  onClose: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const returnedRecords = (records as BorrowRecord[]).filter(
    (r) =>
      r.status === "returned" &&
      ((r.book_title?.toLowerCase() ?? "").includes(searchTerm.toLowerCase()) ||
        (r.user_name?.toLowerCase() ?? "").includes(searchTerm.toLowerCase()) ||
        (r.book_isbn?.toLowerCase() ?? "").includes(searchTerm.toLowerCase()))
  );

  const calculateDaysDifference = (
    dueDate: string,
    returnDate: string | null
  ) => {
    if (!returnDate) return 0;
    const due = new Date(dueDate);
    const returned = new Date(returnDate);
    const diffTime = returned.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 flex items-center justify-between border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-gray-800" />
            <h2 className="text-lg font-bold text-gray-800">
              Returned Books History
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:bg-gray-200 rounded-lg p-1.5 transition-all duration-200 hover:rotate-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search returned books..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        {/* Content */}
        <div className="overflow-auto flex-1">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold w-[22%]">
                  Book
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold w-[18%]">
                  Borrower
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold w-[12%]">
                  Due Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold w-[12%]">
                  Returned On
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold w-[13%]">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold w-[11%]">
                  Condition
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold w-[12%]">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {returnedRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    No returned books found
                  </td>
                </tr>
              ) : (
                returnedRecords.map((record) => {
                  const daysDiff = calculateDaysDifference(
                    record.due_date,
                    record.return_date
                  );
                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">
                            {record.book_title}
                          </span>
                          <span className="text-xs text-gray-500">
                            {record.book_isbn}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">
                            {record.user_name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {record.user_id}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(record.due_date).toLocaleDateString(
                          undefined,
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {record.return_date
                          ? new Date(record.return_date).toLocaleDateString(
                              undefined,
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        {daysDiff > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {daysDiff} days late
                          </span>
                        ) : daysDiff === 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            On time
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {Math.abs(daysDiff)} days early
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                            record.book_condition === "excellent"
                              ? "bg-green-100 text-green-800"
                              : record.book_condition === "good"
                              ? "bg-blue-100 text-blue-800"
                              : record.book_condition === "fair"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {record.book_condition || "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 italic">
                        {record.notes || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
          <span className="text-xs text-gray-600">
            Total returned: {returnedRecords.length}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
        <div className="md:ml-52">
     <Footer />
    </div>
   </div>
  );
}
