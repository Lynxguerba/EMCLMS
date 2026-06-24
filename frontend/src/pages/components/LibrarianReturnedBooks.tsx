import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import axios from "axios";
import {
  Search,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  History,
} from "lucide-react";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import TableItemsPerPage from "../../components/TableItemsPerPage";

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
}

export default function LibrarianReturnedBooks() {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);

  // State management
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<BorrowRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

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

  // Fetch Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const recordsRes = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/librarian/get/borrow-records/`,
        { withCredentials: true }
      );
      const data: BorrowRecord[] = recordsRes.data;
      // Filter only returned records
      const returnedRecords = data.filter((r) => r.status === "returned");
      setRecords(returnedRecords);
      setFilteredRecords(returnedRecords);
    } catch (error) {
      console.error("Error fetching data:", error);
      showSnackbar("Failed to fetch data", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Search
  useEffect(() => {
    let filtered = records.filter((record) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        record.book_title.toLowerCase().includes(searchLower) ||
        record.user_name.toLowerCase().includes(searchLower) ||
        record.user_id.toLowerCase().includes(searchLower) ||
        record.book_isbn.toLowerCase().includes(searchLower)
      );
    });

    setFilteredRecords(filtered);
    setCurrentPage(1);
  }, [searchQuery, records]);

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRecords = filteredRecords.slice(startIndex, endIndex);

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
              <History className="w-6 h-6 text-[#0a1a3b]" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0a1a3b] via-[#0f2e6b] to-[#0a1a3b] bg-clip-text text-transparent">
                Returned Books History
              </h1>
            </div>
            <p className="text-gray-600">
              View historical records of all returned books.
            </p>
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
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => navigate("/LibrarianBorrowReturn")}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to Borrow & Return
                </button>
              </div>
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-green-600 to-teal-600 text-white">
                    <th className="px-4 py-3 text-left text-xs font-semibold">
                      Book Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold">
                      ISBN
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold">
                      Borrower
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold">
                      Borrow Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold">
                      Return Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold">
                      Librarian
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm">
                        Loading records...
                      </td>
                    </tr>
                  ) : currentRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-sm text-gray-500"
                      >
                        No returned books found
                      </td>
                    </tr>
                  ) : (
                    currentRecords.map((record) => (
                      <tr
                        key={record.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          {record.book_title}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {record.book_isbn}
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
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {record.borrow_date}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {record.return_date}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {record.librarian_name}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3" />
                            Returned
                          </span>
                        </td>
                      </tr>
                    ))
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
      </Box>
    </>
  );
}
