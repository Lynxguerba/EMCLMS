import { useMemo, useState, useEffect } from "react";
import { Box, CircularProgress } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { useAuth } from "../context/AuthContext";

import {
    BookCheck,
    BookOpen,
    Calendar,
    Clock,
    HandCoins,
    PackageCheck,
    User,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { useUserBorrowRecords } from "../hooks/useQueries";

interface ReturnItem {
    id: string;
    title: string;
    author: string;
    dueDate: string;
    borrowedOn: string;
    status: string;
}

interface ReturnReceipt {
    id: string;
    title: string;
    returnedOn: string;
    condition: string;
    librarian: string;
}

const UserReturnBooks = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const theme = useTheme();
    const { user, loading: authLoading } = useAuth();

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [returnStatusFilter, setReturnStatusFilter] = useState("All");
    const [returnDateFilter, setReturnDateFilter] = useState("");
    
    const [receiptStatusFilter, setReceiptStatusFilter] = useState("All");
    const [receiptDateFilter, setReceiptDateFilter] = useState("");

    const [returnPage, setReturnPage] = useState(1);
    const [receiptPage, setReceiptPage] = useState(1);
    const pageSize = 5;

    const handleSidebarToggle = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const currentPath = location.pathname;

    // Queries
    const { data: borrowRecords = [], isLoading } = useUserBorrowRecords();

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
        setReturnPage(1);
    }, [returnStatusFilter, returnDateFilter]);

    useEffect(() => {
        setReceiptPage(1);
    }, [receiptStatusFilter, receiptDateFilter]);

    const returnItems: ReturnItem[] = useMemo(
        () => 
            (borrowRecords as any[])
                .filter((r) => r.status === "Borrowed" || r.status === "Overdue" || r.status === "Pending")
                .map((r) => ({
                    id: r.id,
                    title: r.title,
                    author: r.author,
                    dueDate: r.dueDate,
                    borrowedOn: r.borrowedOn,
                    status: r.status === "Borrowed" ? "Due Soon" : r.status,
                }))
                .filter((item) => {
                    const matchesStatus = returnStatusFilter === "All" || item.status === returnStatusFilter;
                    const matchesDate = !returnDateFilter || formatBackendDateForComparison(item.borrowedOn) === returnDateFilter;
                    return matchesStatus && matchesDate;
                }),
        [borrowRecords, returnStatusFilter, returnDateFilter],
    );

    const recentReturns: ReturnReceipt[] = useMemo(
        () => 
            (borrowRecords as any[])
                .filter((r) => r.status === "Returned")
                .map((r) => ({
                    id: r.id,
                    title: r.title,
                    returnedOn: r.returnDate || "N/A",
                    condition: r.condition ? (r.condition.charAt(0).toUpperCase() + r.condition.slice(1)) : "Good",
                    librarian: "Library Staff",
                }))
                .filter((receipt) => {
                    const matchesStatus = receiptStatusFilter === "All" || receipt.condition === receiptStatusFilter;
                    const matchesDate = !receiptDateFilter || formatBackendDateForComparison(receipt.returnedOn) === receiptDateFilter;
                    return matchesStatus && matchesDate;
                }),
        [borrowRecords, receiptStatusFilter, receiptDateFilter],
    );

    const totalReturnPages = Math.ceil(returnItems.length / pageSize);
    const paginatedReturnItems = returnItems.slice((returnPage - 1) * pageSize, returnPage * pageSize);

    const totalReceiptPages = Math.ceil(recentReturns.length / pageSize);
    const paginatedReceipts = recentReturns.slice((receiptPage - 1) * pageSize, receiptPage * pageSize);

    const stats = useMemo(() => {
        const rawReturnItems = (borrowRecords as any[]).filter((r) => r.status === "Borrowed" || r.status === "Overdue" || r.status === "Pending");
        const dueSoon = rawReturnItems.filter((r) => r.status === "Borrowed").length;
        const overdue = rawReturnItems.filter((r) => r.status === "Overdue").length;
        const returned = (borrowRecords as any[]).filter((r) => r.status === "Returned").length;
        return { dueSoon, overdue, returned };
    }, [borrowRecords]);

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
                        <PackageCheck className="w-6 h-6 text-[#0a1a3b]" />
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0a1a3b] via-[#0f2e6b] to-[#0a1a3b] bg-clip-text text-transparent">
                            Return Books
                        </h1>
                    </div>
                    <p className="text-1xl text-gray-600">
                        Prepare returns and track processed books.
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
                                        Due Soon
                                    </p>
                                    <h3 className="text-2xl font-bold text-gray-900 mt-2">
                                        {stats.dueSoon}
                                    </h3>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <Clock className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 mt-3">
                                Schedule a return before the due date.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-amber-100/30 p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                                        Overdue Returns
                                    </p>
                                    <h3 className="text-2xl font-bold text-gray-900 mt-2">
                                        {stats.overdue}
                                    </h3>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                    <HandCoins className="w-6 h-6 text-amber-600" />
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 mt-3">
                                Return now to avoid additional fees.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/30 p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                                        Recently Returned
                                    </p>
                                    <h3 className="text-2xl font-bold text-gray-900 mt-2">
                                        {stats.returned}
                                    </h3>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                    <BookCheck className="w-6 h-6 text-emerald-600" />
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 mt-3">
                                Processed by the library team.
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
                                    <BookOpen className="w-5 h-5 text-blue-600" />
                                    Books to Return
                                </h2>
                                <p className="text-sm text-gray-500">
                                    Confirm current status.
                                </p>
                            </div>
                            <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
                                {returnItems.length} items
                            </span>
                        </div>

                        {/* Local Filters for Books to Return */}
                        <div className="mb-4 flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                            <select
                                value={returnStatusFilter}
                                onChange={(e) => setReturnStatusFilter(e.target.value)}
                                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Due Soon">Due Soon</option>
                                <option value="Overdue">Overdue</option>
                            </select>
                            <input
                                type="date"
                                value={returnDateFilter}
                                onChange={(e) => setReturnDateFilter(e.target.value)}
                                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                            />
                            {(returnStatusFilter !== "All" || returnDateFilter) && (
                                <button
                                    onClick={() => {
                                        setReturnStatusFilter("All");
                                        setReturnDateFilter("");
                                    }}
                                    className="text-[10px] text-red-600 hover:text-red-700 font-medium"
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        <div className="space-y-4">
                            {isLoading ? (
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
                            ) : returnItems.length === 0 ? (
                                <p className="text-center text-gray-500 py-4">No books to return found.</p>
                            ) : (
                                paginatedReturnItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className="rounded-xl border-2 border-gray-200 bg-white p-4 transition-all duration-300 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                                                    {item.id}
                                                </p>
                                                <h3 className="text-lg font-bold text-gray-900 mt-1">
                                                    {item.title}
                                                </h3>
                                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                    <User className="w-4 h-4" />
                                                    {item.author}
                                                </div>
                                            </div>
                                            <span
                                                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${item.status === "Overdue"
                                                        ? "text-red-700 bg-red-100"
                                                        : item.status === "Returned"
                                                            ? "text-emerald-700 bg-emerald-100"
                                                            : "text-blue-700 bg-blue-100"
                                                    }`}
                                            >
                                                {item.status}
                                            </span>
                                        </div>

                                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-600">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                Borrowed {item.borrowedOn}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4" />
                                                Due {item.dueDate}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Pagination for Books to Return */}
                        {returnItems.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">
                                    Showing {(returnPage - 1) * pageSize + 1} to{" "}
                                    {Math.min(returnPage * pageSize, returnItems.length)} of{" "}
                                    {returnItems.length} items
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setReturnPage((prev) => Math.max(prev - 1, 1))}
                                        disabled={returnPage === 1}
                                        className="p-1.5 rounded-lg border border-gray-200 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronLeft className="w-4 h-4 text-gray-600" />
                                    </button>
                                    <span className="text-xs font-bold text-gray-700 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                                        Page {returnPage} of {totalReturnPages}
                                    </span>
                                    <button
                                        onClick={() => setReturnPage((prev) => Math.min(prev + 1, totalReturnPages))}
                                        disabled={returnPage === totalReturnPages || totalReturnPages === 0}
                                        className="p-1.5 rounded-lg border border-gray-200 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronRight className="w-4 h-4 text-gray-600" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="rounded-2xl shadow-xl bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <PackageCheck className="w-5 h-5 text-blue-600" />
                                    Recent Return Receipts
                                </h2>
                                <p className="text-sm text-gray-500">
                                    Confirmed returns from the last 14 days.
                                </p>
                            </div>
                            <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
                                {recentReturns.length} receipts
                            </span>
                        </div>

                        {/* Local Filters for Return Receipts */}
                        <div className="mb-4 flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                            <select
                                value={receiptStatusFilter}
                                onChange={(e) => setReceiptStatusFilter(e.target.value)}
                                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                            >
                                <option value="All">All Conditions</option>
                                <option value="Excellent">Excellent</option>
                                <option value="Good">Good</option>
                                <option value="Fair">Fair</option>
                                <option value="Poor">Poor</option>
                            </select>
                            <input
                                type="date"
                                value={receiptDateFilter}
                                onChange={(e) => setReceiptDateFilter(e.target.value)}
                                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                            />
                            {(receiptStatusFilter !== "All" || receiptDateFilter) && (
                                <button
                                    onClick={() => {
                                        setReceiptStatusFilter("All");
                                        setReceiptDateFilter("");
                                    }}
                                    className="text-[10px] text-red-600 hover:text-red-700 font-medium"
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        <div className="space-y-4">
                            {isLoading ? (
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
                            ) : recentReturns.length === 0 ? (
                                <p className="text-center text-gray-500 py-4">No recent returns found.</p>
                            ) : (
                                paginatedReceipts.map((receipt) => (
                                    <div
                                        key={receipt.id}
                                        className="rounded-xl border-2 border-gray-200 bg-white p-4 transition-all duration-300 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                                                    {receipt.id}
                                                </p>
                                                <h3 className="text-lg font-bold text-gray-900 mt-1">
                                                    {receipt.title}
                                                </h3>
                                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                    <User className="w-4 h-4" />
                                                    Checked by {receipt.librarian}
                                                </div>
                                            </div>
                                            <span
                                                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${receipt.condition === "Poor"
                                                        ? "text-red-700 bg-red-100"
                                                        : receipt.condition === "Fair"
                                                            ? "text-amber-700 bg-amber-100"
                                                            : "text-emerald-700 bg-emerald-100"
                                                    }`}
                                            >
                                                {receipt.condition}
                                            </span>
                                        </div>

                                        <div className="mt-4 flex items-center gap-2 text-xs text-gray-600">
                                            <Calendar className="w-4 h-4" />
                                            Returned {receipt.returnedOn}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Pagination for Return Receipts */}
                        {recentReturns.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">
                                    Showing {(receiptPage - 1) * pageSize + 1} to{" "}
                                    {Math.min(receiptPage * pageSize, recentReturns.length)} of{" "}
                                    {recentReturns.length} receipts
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setReceiptPage((prev) => Math.max(prev - 1, 1))}
                                        disabled={receiptPage === 1}
                                        className="p-1.5 rounded-lg border border-gray-200 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronLeft className="w-4 h-4 text-gray-600" />
                                    </button>
                                    <span className="text-xs font-bold text-gray-700 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                                        Page {receiptPage} of {totalReceiptPages}
                                    </span>
                                    <button
                                        onClick={() => setReceiptPage((prev) => Math.min(prev + 1, totalReceiptPages))}
                                        disabled={receiptPage === totalReceiptPages || totalReceiptPages === 0}
                                        className="p-1.5 rounded-lg border border-gray-200 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronRight className="w-4 h-4 text-gray-600" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="md:ml-52">
     <Footer />
    </div>
   </Box>
  );
};

export default UserReturnBooks;
