// MUI components (minimal usage)
import { Box, CircularProgress } from "@mui/material";

// React hooks
import { useEffect, useState, useMemo } from "react";

// Routing and HTTP client
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useBooks } from "../hooks/useQueries";
import { Book } from "../types/book";
import { getFileUrl } from "../utils/fileUtils";

// Local components
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import LibrarianAddBookModal from "./components/LibrarianAddBookModal";
import LibrarianEditBookModal from "./components/LibrarianEditBookModal";
import LibrarianManageBookshelvesModal from "./components/LibrarianManageBookshelvesModal";
import { TableRowSkeleton } from "./components/Skeletons";
import PDFPreviewModal from "./components/PDFPreviewModal";
import TableItemsPerPage from "../components/TableItemsPerPage";

// Lucide icons
import {
 Search,
 BookPlus,
 Edit,
 ChevronLeft,
 ChevronRight,
 BookOpen,
 Library,
 Eye,
} from "lucide-react";

export default function LibrarianManageBooks() {
 const navigate = useNavigate();
 const { user, loading: authLoading } = useAuth();
 const [isSidebarOpen, setIsSidebarOpen] = useState(false);
 const { data: books = [], isLoading: loading, refetch } = useBooks();
 const [searchQuery, setSearchQuery] = useState("");
 const [isAddModalOpen, setIsAddModalOpen] = useState(false);
 const [isBookshelvesModalOpen, setIsBookshelvesModalOpen] = useState(false);
 const [isEditModalOpen, setIsEditModalOpen] = useState(false);
 const [selectedBook, setSelectedBook] = useState<Book | null>(null);
 const [snackbarOpen, setSnackbarOpen] = useState(false);
 const [snackbarMessage, setSnackbarMessage] = useState("");
 const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success");

 // PDF Preview state
 const [previewOpen, setPreviewOpen] = useState(false);
 const [previewUrl, setPreviewUrl] = useState("");
 const [previewTitle, setPreviewTitle] = useState("");

 // Tooltip state
 const [hoveredButton, setHoveredButton] = useState<string | null>(null);

 // Pagination state
 const [currentPage, setCurrentPage] = useState(1);
 const [itemsPerPage, setItemsPerPage] = useState(10);

 const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);

 const handleOpenAddModal = () => setIsAddModalOpen(true);
 const handleCloseAddModal = () => setIsAddModalOpen(false);

 const handleOpenBookshelvesModal = () => setIsBookshelvesModalOpen(true);
 const handleCloseBookshelvesModal = () => setIsBookshelvesModalOpen(false);

 const handleEditClick = (book: Book) => {
  setSelectedBook(book);
  setIsEditModalOpen(true);
 };

 const handlePreview = (book: Book) => {
  const fileUrl = book.file_path ? getFileUrl(book.file_path) : "";
  if (fileUrl) {
   setPreviewUrl(fileUrl);
   setPreviewTitle(book.title);
   setPreviewOpen(true);
  }
 };

 const handleAddBook = async (newBook: FormData, onProgress?: (progress: number) => void) => {
  try {
   await axios.post(
    `${import.meta.env.VITE_API_BASE_URL}/api/librarian/post/add-new-book/`,
    newBook,
    {
     withCredentials: true,
     headers: { "Content-Type": "multipart/form-data" },
     onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
       const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
       onProgress(progress);
      }
     },
    }
   );

   await refetch();
   setIsAddModalOpen(false);
  } catch (error: any) {
   const message = error.response?.data?.detail || "Failed to add book. Please try again.";
   setSnackbarMessage(message);
   setSnackbarSeverity("error");
   setSnackbarOpen(true);
   console.error("Failed to add book:", error);
   throw error; // Rethrow to allow modal to handle error state
  }
 };

 const handleEditBook = async (updatedBook: Book, newFile: File | null, deleteFile: boolean, onProgress?: (progress: number) => void) => {
  try {
   const formData = new FormData();
   formData.append("title", updatedBook.title);
   formData.append("author", updatedBook.author);
   formData.append("publisher", updatedBook.publisher || "");
   formData.append("copyright", updatedBook.copyright?.toString() || "");
   formData.append("isbn", updatedBook.isbn || "");
   formData.append("copy", updatedBook.copy?.toString() || "");
   formData.append("bookshelf", updatedBook.bookshelf__name || "");
   
   if (newFile) {
    formData.append("file_path", newFile);
   }
   
   if (deleteFile) {
    formData.append("delete_file", "true");
   }

   const res = await axios.put(
    `${import.meta.env.VITE_API_BASE_URL}/api/librarian/put/update-book/${updatedBook.no}/`,
    formData,
    { 
     withCredentials: true,
     headers: { "Content-Type": "multipart/form-data" },
     onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
       const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
       onProgress(progress);
      }
     },
    }
   );

   setSnackbarMessage(res.data.message || "Book updated successfully");
   setSnackbarSeverity("success");
   setSnackbarOpen(true);

   setIsEditModalOpen(false);
   await refetch();
  } catch (error: any) {
   const message = error.response?.data?.detail || "Failed to update book. Please try again.";
   setSnackbarMessage(message);
   setSnackbarSeverity("error");
   setSnackbarOpen(true);
   console.error("Failed to update book:", error);
  }
 };

 useEffect(() => {
  if (authLoading) return;

  if (!user || user.user_type !== "Librarian") {
   navigate("/");
   return;
  }
 }, [user, authLoading, navigate]);

 // Search filter
 const filteredBooks = useMemo(() => {
  return books.filter((book) => {
   const searchLower = searchQuery.toLowerCase();
   return (
    (book.title?.toLowerCase() || "").includes(searchLower) ||
    (book.author?.toLowerCase() || "").includes(searchLower) ||
    (book.publisher?.toLowerCase() || "").includes(searchLower) ||
    (book.isbn?.toLowerCase() || "").includes(searchLower) ||
    (book.bookshelf__name?.toLowerCase() || "").includes(searchLower)
   );
  });
 }, [searchQuery, books]);

 // Reset to page 1 when search query changes
 useEffect(() => {
  setCurrentPage(1);
 }, [searchQuery]);

 // Pagination calculations
 const totalPages = Math.ceil(filteredBooks.length / itemsPerPage);
 const startIndex = (currentPage - 1) * itemsPerPage;
 const endIndex = startIndex + itemsPerPage;
 const currentBooks = filteredBooks.slice(startIndex, endIndex);

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
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] animate-fade-in">
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
     userRole="librarian"
     currentPath={"/LibrarianManageBooks"}
     open={isSidebarOpen}
     onClose={handleSidebarToggle}
    />
    <Navbar handleSidebarToggle={handleSidebarToggle} />

    <div className="min-h-screen pt-8 p-4 mt-6 md:-mt-2 md:ml-52">
     {/* Header */}
     <div className="mb-6 grid items-center gap-2">
      <div className="flex gap-3 items-center">
       <BookOpen className="w-6 h-6 text-[#0a1a3b]" />
       <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0a1a3b] via-[#0f2e6b] to-[#0a1a3b] bg-clip-text text-transparent">
        Manage Books
       </h1>
      </div>
      <p className="text-1xl">
       Add, edit, and manage all books in the library system.
      </p>
     </div>

     {/* Search and Action Buttons */}
     <div className="mb-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
       <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
         type="text"
         placeholder="Search by title, author, ISBN, or bookshelf..."
         value={searchQuery}
         onChange={(e) => setSearchQuery(e.target.value)}
         className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
        />
       </div>
       <div className="flex gap-2">
        <button
         onClick={handleOpenAddModal}
         className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-sm"
        >
         <BookPlus className="w-4 h-4" />
         Add Book
        </button>
        <button
         onClick={handleOpenBookshelvesModal}
         className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
         <Library className="w-4 h-4" />
         Manage Bookshelves
        </button>
       </div>
      </div>
     </div>

     {/* Books Table */}
     <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
       <table className="w-full">
        <thead>
         <tr className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <th className="px-4 py-3 text-left text-xs font-semibold">Title</th>
          <th className="px-4 py-3 text-left text-xs font-semibold">Author</th>
          <th className="px-4 py-3 text-left text-xs font-semibold">Publisher</th>
          <th className="px-4 py-3 text-left text-xs font-semibold">Copyright</th>
          <th className="px-4 py-3 text-left text-xs font-semibold">ISBN</th>
          <th className="px-4 py-3 text-left text-xs font-semibold">Copy</th>
          <th className="px-4 py-3 text-left text-xs font-semibold">Bookshelf</th>
          <th className="px-4 py-3 text-left text-xs font-semibold">Recommendations</th>
          <th className="px-4 py-3 text-center text-xs font-semibold">Actions</th>
         </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
         {loading ? (
          <TableRowSkeleton columns={9} />
         ) : currentBooks.length === 0 ? (
          <tr>
           <td
            colSpan={9}
            className="px-4 py-8 text-center text-sm text-gray-500"
           >
            No books found
           </td>
          </tr>
         ) : (
          currentBooks.map((book) => {
           const fileUrl = book.file_path ? getFileUrl(book.file_path) : null;

           return (
            <tr
             key={book.no}
             className="hover:bg-gray-50 transition-colors"
            >
             <td className="px-4 py-3 text-sm text-gray-900 font-medium">
              {book.title}
             </td>
             <td className="px-4 py-3 text-sm text-gray-700">
              {book.author || "—"}
             </td>
             <td className="px-4 py-3 text-sm text-gray-700">
              {book.publisher || "—"}
             </td>
             <td className="px-4 py-3 text-sm text-gray-700">
              {book.copyright || "—"}
             </td>
             <td className="px-4 py-3 text-sm text-gray-700">
              {book.isbn || "—"}
             </td>
             <td className="px-4 py-3 text-sm text-gray-700">
              {book.copy || "—"}
             </td>
             <td className="px-4 py-3">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
               {book.bookshelf__name || "—"}
              </span>
             </td>
             <td className="px-4 py-3 text-sm text-gray-700 text-center">
              {book.recommendation_count || 0}
             </td>
             <td className="px-4 py-3">
              <div className="flex items-center justify-center gap-2">
               {/* Edit Button */}
               <div className="relative">
                <button
                 onClick={() => handleEditClick(book)}
                 onMouseEnter={() =>
                  setHoveredButton(`edit-${book.no}`)
                 }
                 onMouseLeave={() => setHoveredButton(null)}
                 className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                >
                 <Edit className="w-4 h-4" />
                </button>
                {hoveredButton === `edit-${book.no}` && (
                 <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
                  Edit
                 </div>
                )}
               </div>

               {/* Preview Button */}
               {fileUrl && (
                <div className="relative">
                 <button
                  onClick={() => handlePreview(book)}
                  onMouseEnter={() =>
                   setHoveredButton(`preview-${book.no}`)
                  }
                  onMouseLeave={() => setHoveredButton(null)}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-block"
                 >
                  <Eye className="w-4 h-4" />
                 </button>
                 {hoveredButton === `preview-${book.no}` && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
                   Preview
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
      {filteredBooks.length > 0 && (
       <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
         <div className="text-xs text-gray-700">
          Showing {startIndex + 1} to{" "}
          {Math.min(endIndex, filteredBooks.length)} of{" "}
          {filteredBooks.length} books
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

   {/* Modals */}
   <LibrarianAddBookModal
    open={isAddModalOpen}
    onClose={handleCloseAddModal}
    onAddBook={handleAddBook}
   />

   {selectedBook && (
    <LibrarianEditBookModal
     open={isEditModalOpen}
     onClose={() => setIsEditModalOpen(false)}
     bookData={selectedBook}
     onSave={handleEditBook}
    />
   )}

   <LibrarianManageBookshelvesModal
    open={isBookshelvesModalOpen}
    onClose={handleCloseBookshelvesModal}
   />

   <PDFPreviewModal
    open={previewOpen}
    onClose={() => setPreviewOpen(false)}
    fileUrl={previewUrl}
    title={previewTitle}
   />
      <div className="md:ml-52">
     <Footer />
    </div>
   </>
  );
}
