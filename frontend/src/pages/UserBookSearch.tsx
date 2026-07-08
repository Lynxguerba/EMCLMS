import React, { useEffect, useState, useMemo } from "react";
import { Box } from "@mui/material";
import { useLocation } from "react-router-dom";
// import DownloadIcon from "@mui/icons-material/Download";
// import UploadIcon from "@mui/icons-material/Upload";
// import SearchIcon from "@mui/icons-material/Search";
// import ClearIcon from "@mui/icons-material/Clear";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { CircularProgress as Loader } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { CircularProgress } from "@mui/material";

// Lucide Icons
import {
 BookOpen,
 User,
 Building2,
 Calendar,
 Hash,
 Copy,
 BookMarked,
 Search as SearchLucide,
 Upload as UploadLucide,
 Download,
 X,
 Clock,
} from "lucide-react";

// Components
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { getFileUrl, forceDownload } from "../utils/fileUtils";
import BorrowRequestModal from "./components/BorrowRequestModal";
import { 
  useUserBookRequests, 
  useUserBorrowRecords, 
  useSemanticBookSearch 
} from "../hooks/useQueries";

// Interface for book data
interface BookData {
 id: number;
 title: string;
 author: string;
 publisher: string;
 copyright: number;
 isbn: string;
 copy: number;
 bookshelf__name: string;
 file_path?: string;
 similarity_score?: number;
}

const UserBookSearch: React.FC = () => {
 const location = useLocation();
 const theme = useTheme();
 const { user, loading: authLoading } = useAuth();

 // Layout State
 const [isSidebarOpen, setIsSidebarOpen] = useState(false);

 // React state management
 const [searchQuery, setSearchQuery] = useState<string>("");
 const [isSearched, setIsSearched] = useState<boolean>(false);
 const [showResults, setShowResults] = useState<boolean>(false);

 // OCR upload handling
 const [uploading, setUploading] = useState<boolean>(false);
 const [isDragActive, setIsDragActive] = useState<boolean>(false);

 // Hardcoded page text
 const shortText = "Discover and explore our library collection.";

 // Sidebar Logic
 const currentPath = location.pathname;
 const handleSidebarToggle = () => {
  setIsSidebarOpen(!isSidebarOpen);
 };

  // Static book data
  const [rows, setRows] = useState<BookData[]>([]);
  const [hiddenBooks, setHiddenBooks] = useState<BookData[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookData | null>(null);
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);

  // Queries
  const { data: requests = [] } = useUserBookRequests();
  const { data: borrows = [] } = useUserBorrowRecords();
  
  const searchResult = useSemanticBookSearch(searchQuery, { enabled: false });

  const pendingRequestIds = useMemo(() => {
    const ids = new Set<number>();
    requests.forEach((req: any) => {
      if (req.status === "Pending" && req.book_id) {
        ids.add(req.book_id);
      }
    });
    return ids;
  }, [requests]);

  const activeBorrowIds = useMemo(() => {
    const ids = new Set<number>();
    requests.forEach((req: any) => {
      if (req.status === "Approved" && req.book_id) {
        ids.add(req.book_id);
      }
    });
    borrows.forEach((rec: any) => {
      if ((rec.status === "Borrowed" || rec.status === "Overdue") && rec.book_id) {
        ids.add(rec.book_id);
      }
    });
    return ids;
  }, [requests, borrows]);

  const handleOpenBorrowModal = (book: BookData) => {
    if (activeBorrowIds.has(book.id)) return;
    setSelectedBook(book);
    setIsBorrowModalOpen(true);
  };

  const handleCloseBorrowModal = () => {
    setIsBorrowModalOpen(false);
    setSelectedBook(null);
  };

  const recordBookAccess = async (bookId: number) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/books/${bookId}/record-access/`);
    } catch (error) {
      console.error("Failed to record book access:", error);
    }
  };

 // Handles search animation and result display
 const handleSearch = async () => {
  if (!searchQuery.trim()) return;
  
  setShowResults(false);
  setIsSearched(true);
  
  const { data } = await searchResult.refetch();

  if (data?.results) {
    const results = data.results;
    const formattedResults = results.map((book: any) => ({
     id: book.id,
     title: book.title,
     author: book.author,
     publisher: book.publisher,
     copyright: book.copyright,
     isbn: book.isbn,
     copy: book.copy,
     bookshelf__name: book.bookshelf__name,
     file_path: book.file_path,
     similarity_score: book.similarity,
    }));

    const highRelevance = formattedResults.filter(
      (book: BookData) => (book.similarity_score || 0) > 70,
    );
    const lowRelevance = formattedResults.filter(
      (book: BookData) => (book.similarity_score || 0) <= 70,
    );

    setRows(highRelevance);
    setHiddenBooks(lowRelevance);
    setShowResults(true);
  }
 };

 // Triggers search on Enter key press
 const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
  if (event.key === "Enter") {
   handleSearch();
  }
 };

 // File drop handler for OCR upload
 const onDrop = async (acceptedFiles: File[]) => {
  if (acceptedFiles.length === 0) return;
  const file = acceptedFiles[0];

  const formData = new FormData();
  formData.append("file", file);

    try {
      setUploading(true);
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/ocr/upload/`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

   if (response.data?.text) {
    setSearchQuery(response.data.text.trim());
   } else {
    console.warn("OCR returned no text");
   }
  } catch (error) {
   console.error("OCR upload failed:", error);
  } finally {
   setUploading(false);
  }
 };

 // Dropzone setup
 const {
  getRootProps,
  getInputProps,
  open,
  isDragActive: dropzoneActive,
 } = useDropzone({
  onDrop,
  accept: { "image/*": [] },
  noClick: true,
  noKeyboard: true,
  onDragEnter: () => setIsDragActive(true),
  onDragLeave: () => setIsDragActive(false),
  onDropAccepted: () => setIsDragActive(false),
  onDropRejected: () => setIsDragActive(false),
 });

 // Global drag handling for full-page overlay without flicker
 useEffect(() => {
  let dragCounter = 0;

  const handleDragEnter = (e: DragEvent) => {
   e.preventDefault();
   dragCounter++;
   setIsDragActive(true);
  };

  const handleDragLeave = (e: DragEvent) => {
   e.preventDefault();
   dragCounter--;
   if (dragCounter <= 0) {
    setIsDragActive(false);
   }
  };

  const handleDrop = (e: DragEvent) => {
   e.preventDefault();
   dragCounter = 0;
   setIsDragActive(false);

   if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    const files = Array.from(e.dataTransfer.files);
    onDrop(files as File[]);
    e.dataTransfer.clearData();
   }
  };

  window.addEventListener("dragenter", handleDragEnter);
  window.addEventListener("dragleave", handleDragLeave);
  window.addEventListener("drop", handleDrop);

  return () => {
   window.removeEventListener("dragenter", handleDragEnter);
   window.removeEventListener("dragleave", handleDragLeave);
   window.removeEventListener("drop", handleDrop);
  };
 }, []);

 // Global overlay cue when dragging
 const DragOverlay = () => (
  <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
   <div className="text-center">
    <UploadLucide className="w-16 h-16 text-white mx-auto mb-4 animate-bounce" />
    <p className="text-2xl font-semibold text-white">
     Drop image to scan with OCR
    </p>
   </div>
  </div>
 );

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
  <Box
   sx={{
    height: "100vh",
    overflowY: "auto",
    backgroundColor: theme.palette.background.default,
   }}
  >
   <Sidebar
    userRole={(user?.user_type?.toLowerCase() as any) || "student"}
    currentPath={currentPath}
    open={isSidebarOpen}
    onClose={handleSidebarToggle}
   />

   <Navbar handleSidebarToggle={handleSidebarToggle} />

      {/* Main Content Area */}
      <div className="min-h-screen pt-10 p-4 sm:ml-48 md:ml-52">
        {/* Main Content Card */}
        <div className="p-6">
          {/* Search Section */}
          <div
            className={`transition-all duration-500 ${isSearched ? "mb-6" : "py-20"
              }`}
          >
            {/* Heading - Only show when not searched */}
            {!isSearched && (
              <div className="text-center mb-8 animate-in fade-in slide-in-from-top duration-500">
                <h2 className="text-2xl font-light text-gray-700">
                  {shortText}
                </h2>
              </div>
            )}

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-600 rounded-full blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                <div className="relative flex items-center gap-1 bg-white rounded-full shadow-lg border-2 border-gray-200 hover:border-blue-300 focus-within:border-blue-400 transition-all p-2">
                  <SearchLucide className="flex-shrink-0 w-5 h-5 text-gray-400 ml-2 sm:ml-3" />
                  <input
                    type="text"
                    placeholder="Search for books..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1 min-w-0 bg-transparent border-none outline-none text-gray-700 text-base px-2 py-2"
                  />

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div {...getRootProps()}>
                      <input {...getInputProps()} />
                      <div className="relative group">
                        <button
                          onClick={open}
                          disabled={uploading}
                          className="p-2 rounded-full hover:bg-blue-50 transition-colors disabled:opacity-50 relative z-10"
                        >
                          {uploading ? (
                            <Loader size={20} className="text-blue-500" />
                          ) : (
                            <UploadLucide className="w-5 h-5 text-blue-500" />
                          )}
                        </button>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out transform scale-75 group-hover:scale-100 origin-bottom">
                          Upload image for OCR
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    </div>

          {searchQuery && (
           <button
            onClick={() => {
             setSearchQuery("");
             setIsSearched(false);
             setShowResults(false);
            }}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            title="Clear search"
           >
            <X className="w-5 h-5 text-gray-500" />
           </button>
          )}
         </div>
        </div>
       </div>

       {/* Search Button - Only show when not searched */}
       {!isSearched && (
        <div className="flex justify-center mt-6 animate-in fade-in slide-in-from-bottom duration-500 delay-150">
         <button
          onClick={handleSearch}
          disabled={!searchQuery.trim()}
          className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
         >
          Search Books
         </button>
        </div>
       )}
      </div>
     </div>

     {/* Results Section */}
     {isSearched && (
      <div>
       {/* Results Count */}
       {showResults && rows.length > 0 && (
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
         <BookOpen className="w-4 h-4" />
         <span>
          About {rows.length} result{rows.length !== 1 ? "s" : ""}
         </span>
        </div>
       )}

       {/* Loading Skeletons */}
       {searchResult.isFetching && (
        <div className="grid grid-cols-1 gap-4">
         {[...Array(5)].map((_, i) => (
          <div
           key={i}
           className="rounded-xl border-2 border-gray-200 bg-white p-5 animate-pulse"
          >
           <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gray-200 rounded-xl"></div>
            <div className="flex-1 space-y-3">
             <div className="h-6 bg-gray-200 rounded w-3/4"></div>
             <div className="h-4 bg-gray-200 rounded w-1/2"></div>
             <div className="flex gap-2">
              <div className="h-6 bg-gray-200 rounded w-20"></div>
              <div className="h-6 bg-gray-200 rounded w-24"></div>
              <div className="h-6 bg-gray-200 rounded w-16"></div>
             </div>
            </div>
           </div>
          </div>
         ))}
        </div>
       )}

              {/* Search Results */}
              {showResults && !searchResult.isFetching && (
                <div>
                  {rows.length === 0 && hiddenBooks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                      <BookOpen className="w-16 h-16 mb-4 opacity-50" />
                      <p className="text-lg font-medium">No books found</p>
                      <p className="text-sm">
                        Try searching with different keywords
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-4">
                        {rows.map((book, index) => (
                          <div
                            key={book.id}
                            onClick={() => {
                              recordBookAccess(book.id);
                              if (!activeBorrowIds.has(book.id)) {
                                handleOpenBorrowModal(book);
                              }
                            }}
                            className={`group rounded-xl border-2 bg-white transition-all duration-300 ${
                              activeBorrowIds.has(book.id) 
                                ? "border-gray-200 opacity-75 cursor-not-allowed" 
                                : "border-gray-200 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100 cursor-pointer"
                            }`}
                          >
                            <div className={`p-5 transition-all ${
                              activeBorrowIds.has(book.id) 
                                ? "bg-gray-50" 
                                : "bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100"
                            }`}>
                              <div className="flex items-start gap-4">
                                {/* Book Rank */}
                                <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center shadow-lg transition-transform duration-300 ${
                                  activeBorrowIds.has(book.id)
                                    ? "bg-gray-400"
                                    : "bg-gradient-to-br from-blue-400 to-indigo-600 group-hover:scale-110"
                                }`}>
                                  <span className="text-xl font-bold text-white">{index + 1}</span>
                                </div>

                {/* Book Info */}
                <div className="flex-1 min-w-0">
                 {/* Title */}
                 <h3 className={`text-lg font-bold mb-2 transition-colors ${
                   activeBorrowIds.has(book.id) ? "text-gray-500" : "text-gray-900 group-hover:text-blue-600"
                 }`}>
                  {book.title}
                  {activeBorrowIds.has(book.id) && (
                    <span className="ml-3 text-xs font-semibold px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full uppercase tracking-wider">
                      Already Borrowed
                    </span>
                  )}
                  {pendingRequestIds.has(book.id) && (
                    <span className="ml-3 text-xs font-semibold px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full uppercase tracking-wider">
                      Request Pending
                    </span>
                  )}
                 </h3>

                 {/* Author & Publisher */}
                 <div className="flex flex-wrap items-center gap-4 mb-3">
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                   <User className="w-4 h-4" />
                   <span>{book.author}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                   <Building2 className="w-4 h-4" />
                   <span>{book.publisher}</span>
                  </div>
                 </div>

                                  {/* Metadata Tags */}
                                  <div className="flex flex-wrap gap-2">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-full">
                                      <Calendar className="w-3 h-3" />©{" "}
                                      {book.copyright}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-full">
                                      <Hash className="w-3 h-3" />
                                      {book.isbn}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-full">
                                      <Copy className="w-3 h-3" />
                                      Copy: {book.copy}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-100 border border-blue-300 rounded-full">
                                      <BookMarked className="w-3 h-3" />
                                      {book.bookshelf__name}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-yellow-700 bg-yellow-100 border border-yellow-300 rounded-full">
                                      <Clock className="w-3 h-3" />
                                      <span>
                                        Similarity Score:{" "}
                                        {book.similarity_score !== undefined
                                          ? `${book.similarity_score.toFixed(2)}%`
                                          : "N/A"}
                                      </span>
                                    </span>
                                  </div>
                                </div>

                                {/* Download Button */}
                                {book.file_path && (
                                  <button
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      if (book.file_path) {
                                        const fileUrl = getFileUrl(book.file_path.startsWith("http") ? book.file_path : `/media/${book.file_path}`);
                                        const fileName = book.file_path.split("/").pop() || "download";
                                        forceDownload(fileUrl, fileName);
                                      }
                                    }}
                                    className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500 hover:bg-blue-600 flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 group/btn"
                                    title="Download book"
                                  >
                                    <Download className="w-5 h-5 text-white group-hover/btn:scale-110 transition-transform" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

           {/* View More Button */}
           {hiddenBooks.length > 0 && (
            <div className="flex justify-center mt-8">
             <button
              onClick={() => {
               setRows((prev) => [...prev, ...hiddenBooks]);
               setHiddenBooks([]);
              }}
              className="px-6 py-2.5 text-sm font-medium text-blue-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow"
             >
              {rows.length === 0
               ? "Show matching results"
               : "View more books"}
             </button>
            </div>
           )}
          </>
         )}
        </div>
       )}
      </div>
     )}
    </div>
   </div>

      {/* Drag overlay */}
      {isDragActive || dropzoneActive ? <DragOverlay /> : null}

      <BorrowRequestModal
        open={isBorrowModalOpen}
        onClose={handleCloseBorrowModal}
        book={selectedBook}
        isPending={selectedBook ? pendingRequestIds.has(selectedBook.id) : false}
      />
        <div className="md:ml-52">
     <Footer />
    </div>
   </Box>
  );
};

export default UserBookSearch;
