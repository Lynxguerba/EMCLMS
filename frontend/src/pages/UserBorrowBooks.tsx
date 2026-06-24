
import { useMemo, useState, useEffect } from "react";
import { Box, CircularProgress } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { useAuth } from "../context/AuthContext";

import {
    BookOpen,
    Calendar,
    Clock,
    Hourglass,
    Library,
    ShieldCheck,
    User,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import { 
  useUserBookRequests, 
  useUserBorrowRecords, 
  useCancelBookRequest 
} from "../hooks/useQueries";

interface BorrowRequest {
    id: string;
    title: string;
    author: string;
    requestDate: string;
    status: "Pending" | "Approved";
}

interface BorrowedBook {
    id: string;
    title: string;
    author: string;
    dueDate: string;
    borrowedOn: string;
    renewalCount: number;
    status: string;
}

const UserBorrowBooks = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const theme = useTheme();
    const { user, loading: authLoading } = useAuth();

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [requestStatusFilter, setRequestStatusFilter] = useState("All");
    const [requestDateFilter, setRequestDateFilter] = useState("");
    
    const [borrowStatusFilter, setBorrowStatusFilter] = useState("All");
    const [borrowDateFilter, setBorrowDateFilter] = useState("");

    const [requestPage, setRequestPage] = useState(1);
    const [borrowPage, setBorrowPage] = useState(1);
    const pageSize = 5;

    const handleSidebarToggle = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const currentPath = location.pathname;

    // Queries
    const { data: borrowRequests = [], isLoading: isLoadingRequests } = useUserBookRequests();
    const { data: borrowedBooks = [], isLoading: isLoadingBorrows } = useUserBorrowRecords();
    const cancelMutation = useCancelBookRequest();

    const isLoading = isLoadingRequests || isLoadingBorrows;

    useEffect(() => {
        if (authLoading) return;
        if (!user || user.user_type !== "Student") {
            navigate("/");
            return;
        }
    }, [user, authLoading, navigate]);

    const formatBackendDateForComparison = (dateStr: string) => {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "";
        return d.toISOString().split('T')[0];
    };

    useEffect(() => {
        setRequestPage(1);
    }, [requestStatusFilter, requestDateFilter]);

    useEffect(() => {
        setBorrowPage(1);
    }, [borrowStatusFilter, borrowDateFilter]);

    const filteredRequests = useMemo(() => {
        return (borrowRequests as BorrowRequest[]).filter((req) => {
            const matchesStatus = requestStatusFilter === "All" || req.status === requestStatusFilter;
            const matchesDate = !requestDateFilter || formatBackendDateForComparison(req.requestDate) === requestDateFilter;
            return matchesStatus && matchesDate;
        });
    }, [borrowRequests, requestStatusFilter, requestDateFilter]);

    const filteredBorrowedBooks = useMemo(() => {
        return (borrowedBooks as BorrowedBook[]).filter((book) => {
            const matchesStatus = borrowStatusFilter === "All" || book.status === borrowStatusFilter;
            const matchesDate = !borrowDateFilter || formatBackendDateForComparison(book.borrowedOn) === borrowDateFilter;
            return matchesStatus && matchesDate;
        });
    }, [borrowedBooks, borrowStatusFilter, borrowDateFilter]);

    // Pagination calculations
    const totalRequestPages = Math.ceil(filteredRequests.length / pageSize);
    const paginatedRequests = filteredRequests.slice((requestPage - 1) * pageSize, requestPage * pageSize);

    const totalBorrowPages = Math.ceil(filteredBorrowedBooks.length / pageSize);
    const paginatedBorrowedBooks = filteredBorrowedBooks.slice((borrowPage - 1) * pageSize, borrowPage * pageSize);

    const handleCancelRequest = async (requestIdStr: string) => {
        if (!window.confirm("Are you sure you want to cancel this borrow request?")) return;

        cancelMutation.mutate(requestIdStr);
    };

    const stats = useMemo(() => {
        const pending = (borrowRequests as BorrowRequest[]).filter((req) => req.status === "Pending").length;
        const active = (borrowedBooks as BorrowedBook[]).filter((book) => book.status === "Borrowed" || book.status === "Overdue").length;
        const overdue = (borrowedBooks as BorrowedBook[]).filter((book) => book.status === "Overdue").length;
        return { pending, overdue, active };
    }, [borrowRequests, borrowedBooks]);

    if (authLoading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
                <CircularProgress size="2rem" />
            </Box>
        );
    }

    return (
        <Box
            sx={{
                height: "100vh",
                overflowY: "auto",
                backgroundColor: theme.palette.background.default,
            }}
        >
            <Sidebar
                userRole="student"
                currentPath={currentPath}
                open={isSidebarOpen}
                onClose={handleSidebarToggle}
            />

            <Navbar handleSidebarToggle={handleSidebarToggle} />

            <div className="min-h-screen pt-8 p-4 mt-6 md:-mt-2 sm:ml-48 md:ml-52">
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Library className="w-6 h-6 text-[#0a1a3b]" />
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0a1a3b] via-[#0f2e6b] to-[#0a1a3b] bg-clip-text text-transparent">
                            Borrow Books
                        </h1>
                    </div>
                    <p className="text-1xl text-gray-600">
                        Track your requests, approvals, and borrowed titles in one place.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
                    {isLoading ? (
                      [...Array(3)].map((_, i) => (
                        <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm animate-pulse">
                          <div className="flex items-center justify-between">
                            <div className="space-y-2">
                              <div className="h-3 bg-gray-200 rounded w-20"></div>
                              <div className="h-8 bg-gray-200 rounded w-12"></div>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-gray-200"></div>
                          </div>
                          <div className="h-4 bg-gray-200 rounded w-3/4 mt-3"></div>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-blue-100/30 p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                                        Pending Requests
                                    </p>
                                    <h3 className="text-2xl font-bold text-gray-900 mt-2">
                                        {stats.pending}
                                    </h3>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <Hourglass className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 mt-3">
                                Requests awaiting librarian approval.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/30 p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                                        Active Borrows
                                    </p>
                                    <h3 className="text-2xl font-bold text-gray-900 mt-2">
                                        {stats.active}
                                    </h3>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                    <ShieldCheck className="w-6 h-6 text-emerald-600" />
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 mt-3">
                                Books currently in your possession.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-amber-100/30 p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                                        Overdue Books
                                    </p>
                                    <h3 className="text-2xl font-bold text-gray-900 mt-2">
                                        {stats.overdue}
                                    </h3>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                    <Clock className="w-6 h-6 text-amber-600" />
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 mt-3">
                                Return these to avoid penalties.
                            </p>
                        </div>
                      </>
                    )}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="rounded-2xl shadow-xl bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-blue-600" />
                                    Request Queue
                                </h2>
                                <p className="text-sm text-gray-500">
                                    Waiting for approval or pickup.
                                </p>
                            </div>
                            <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
                                {filteredRequests.length} results
                            </span>
                        </div>

                        {/* Local Filters for Request Queue */}
                        <div className="mb-4 flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                            <select
                                value={requestStatusFilter}
                                onChange={(e) => setRequestStatusFilter(e.target.value)}
                                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Pending">Pending</option>
                                <option value="Approved">Approved</option>
                            </select>
                            <input
                                type="date"
                                value={requestDateFilter}
                                onChange={(e) => setRequestDateFilter(e.target.value)}
                                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                            />
                            {(requestStatusFilter !== "All" || requestDateFilter) && (
                                <button
                                    onClick={() => {
                                        setRequestStatusFilter("All");
                                        setRequestDateFilter("");
                                    }}
                                    className="text-[10px] text-red-600 hover:text-red-700 font-medium"
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        {isLoadingRequests ? (
                            <div className="space-y-4">
                              {[...Array(3)].map((_, i) => (
                                <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-2 flex-1">
                                      <div className="h-3 bg-gray-200 rounded w-16"></div>
                                      <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                    </div>
                                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                        ) : filteredRequests.length === 0 ? (
                            <div className="text-center py-10 text-gray-500 text-sm">No book requests found.</div>
                        ) : (
                            <>
                                <div className="space-y-4">
                                    {paginatedRequests.map((request) => (
                                        <div
                                            key={request.id}
                                            className="rounded-xl border-2 border-gray-200 bg-white p-4 transition-all duration-300 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                                                        {request.id}
                                                    </p>
                                                    <h3 className="text-lg font-bold text-gray-900 mt-1">
                                                        {request.title}
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                        <User className="w-4 h-4" />
                                                        {request.author}
                                                    </div>
                                                </div>
                                                <span
                                                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${request.status === "Approved"
                                                            ? "text-emerald-700 bg-emerald-100"
                                                            : "text-blue-700 bg-blue-100"
                                                        }`}
                                                >
                                                    {request.status}
                                                </span>
                                            </div>

                                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
                                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4" />
                                                        Requested {request.requestDate}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleCancelRequest(request.id)}
                                                    disabled={cancelMutation.isPending && cancelMutation.variables === request.id}
                                                    className="text-red-600 font-semibold hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all border border-transparent hover:border-red-200 disabled:opacity-50"
                                                >
                                                    {cancelMutation.isPending && cancelMutation.variables === request.id ? "Cancelling..." : "Cancel Request"}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Pagination for Request Queue */}
                                {filteredRequests.length > 0 && (
                                    <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <div className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">
                                            Showing {(requestPage - 1) * pageSize + 1} to{" "}
                                            {Math.min(requestPage * pageSize, filteredRequests.length)} of{" "}
                                            {filteredRequests.length} requests
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setRequestPage((prev) => Math.max(prev - 1, 1))}
                                                disabled={requestPage === 1}
                                                className="p-1.5 rounded-lg border border-gray-200 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                            >
                                                <ChevronLeft className="w-4 h-4 text-gray-600" />
                                            </button>
                                            <span className="text-xs font-bold text-gray-700 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                                                Page {requestPage} of {totalRequestPages}
                                            </span>
                                            <button
                                                onClick={() => setRequestPage((prev) => Math.min(prev + 1, totalRequestPages))}
                                                disabled={requestPage === totalRequestPages || totalRequestPages === 0}
                                                className="p-1.5 rounded-lg border border-gray-200 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                            >
                                                <ChevronRight className="w-4 h-4 text-gray-600" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="rounded-2xl shadow-xl bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-blue-600" />
                                    Borrowed Books
                                </h2>
                                <p className="text-sm text-gray-500">
                                    Due dates and renewals.
                                </p>
                            </div>
                            <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
                                {filteredBorrowedBooks.length} results
                            </span>
                        </div>

                        {/* Local Filters for Borrowed Books */}
                        <div className="mb-4 flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                            <select
                                value={borrowStatusFilter}
                                onChange={(e) => setBorrowStatusFilter(e.target.value)}
                                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Borrowed">Borrowed</option>
                                <option value="Overdue">Overdue</option>
                                <option value="Returned">Returned</option>
                                <option value="Lost">Lost</option>
                            </select>
                            <input
                                type="date"
                                value={borrowDateFilter}
                                onChange={(e) => setBorrowDateFilter(e.target.value)}
                                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                            />
                            {(borrowStatusFilter !== "All" || borrowDateFilter) && (
                                <button
                                    onClick={() => {
                                        setBorrowStatusFilter("All");
                                        setBorrowDateFilter("");
                                    }}
                                    className="text-[10px] text-red-600 hover:text-red-700 font-medium"
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        {isLoadingBorrows ? (
                            <div className="space-y-4">
                              {[...Array(3)].map((_, i) => (
                                <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-2 flex-1">
                                      <div className="h-3 bg-gray-200 rounded w-16"></div>
                                      <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                    </div>
                                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                        ) : filteredBorrowedBooks.length === 0 ? (
                            <div className="text-center py-10 text-gray-500 text-sm">No borrowed books found.</div>
                        ) : (
                            <>
                                <div className="space-y-4">
                                    {paginatedBorrowedBooks.map((book) => (
                                        <div
                                            key={book.id}
                                            className="rounded-xl border-2 border-gray-200 bg-white p-4 transition-all duration-300 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                                                        {book.id}
                                                    </p>
                                                    <h3 className="text-lg font-bold text-gray-900 mt-1">
                                                        {book.title}
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                        <User className="w-4 h-4" />
                                                        {book.author}
                                                    </div>
                                                </div>
                                                <span
                                                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${book.status === "Overdue" || book.status === "Lost"
                                                            ? "text-red-700 bg-red-100"
                                                            : "text-emerald-700 bg-emerald-100"
                                                        }`}
                                                >
                                                    {book.status}
                                                </span>
                                            </div>

                                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4" />
                                                    Borrowed {book.borrowedOn}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4" />
                                                    Due {book.dueDate}
                                                </div>
                                            </div>

                                        </div>
                                    ))}
                                </div>

                                {/* Pagination for Borrowed Books */}
                                {filteredBorrowedBooks.length > 0 && (
                                    <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <div className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">
                                            Showing {(borrowPage - 1) * pageSize + 1} to{" "}
                                            {Math.min(borrowPage * pageSize, filteredBorrowedBooks.length)} of{" "}
                                            {filteredBorrowedBooks.length} books
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setBorrowPage((prev) => Math.max(prev - 1, 1))}
                                                disabled={borrowPage === 1}
                                                className="p-1.5 rounded-lg border border-gray-200 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                            >
                                                <ChevronLeft className="w-4 h-4 text-gray-600" />
                                            </button>
                                            <span className="text-xs font-bold text-gray-700 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                                                Page {borrowPage} of {totalBorrowPages}
                                            </span>
                                            <button
                                                onClick={() => setBorrowPage((prev) => Math.min(prev + 1, totalBorrowPages))}
                                                disabled={borrowPage === totalBorrowPages || totalBorrowPages === 0}
                                                className="p-1.5 rounded-lg border border-gray-200 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                            >
                                                <ChevronRight className="w-4 h-4 text-gray-600" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Box>
    );
};

export default UserBorrowBooks;
