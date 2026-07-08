// MUI components (minimal usage)
import { Box, CircularProgress } from "@mui/material";

// Auth Context
import { useAuth } from "../context/AuthContext";

// React hooks
import { useEffect, useState } from "react";

// Routing and HTTP client
import { useNavigate } from "react-router-dom";
import { Book } from "../types/book";

// Excel generation
import * as XLSX from "xlsx";

// PDF generation
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Local components
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// Hooks
import { useLibrarianBooksReport } from "../hooks/useQueries";
import { ReportTableSkeleton } from "./components/Skeletons";
import TableItemsPerPage from "../components/TableItemsPerPage";

// Lucide icons
import {
 Search,
 Download,
 ChevronLeft,
 ChevronRight,
 FileText,
} from "lucide-react";

export default function LibrarianReport() {
 const navigate = useNavigate();
 const { user, loading: authLoading } = useAuth();
 const [isSidebarOpen, setIsSidebarOpen] = useState(false);
 
 // Query
 const { data: booksRaw = [], isLoading: booksLoading } = useLibrarianBooksReport();

 const [searchQuery, setSearchQuery] = useState("");
 const [selectedBookshelf, setSelectedBookshelf] = useState<string>("all");
 const [snackbarOpen, setSnackbarOpen] = useState(false);
 const [snackbarMessage, setSnackbarMessage] = useState("");
 const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success");

 // Pagination state
 const [currentPage, setCurrentPage] = useState(1);
 const [itemsPerPage, setItemsPerPage] = useState(10);

 const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);

 // Format books data
 const books: Book[] = booksRaw.map((book: any) => ({
  ...book,
  id: book.no,
  bookshelf__name: book.bookshelf__name,
 }));

 // Search and bookshelf filter
 const filteredBooks = books.filter((book) => {
  const searchLower = searchQuery.toLowerCase();
  const matchesSearch =
   (book.title?.toLowerCase() || "").includes(searchLower) ||
   (book.author?.toLowerCase() || "").includes(searchLower) ||
   (book.publisher?.toLowerCase() || "").includes(searchLower) ||
   (book.isbn?.toLowerCase() || "").includes(searchLower) ||
   (book.bookshelf__name?.toLowerCase() || "").includes(searchLower);

  const matchesBookshelf =
   selectedBookshelf === "all" || book.bookshelf__name === selectedBookshelf;

  return matchesSearch && matchesBookshelf;
 });

 useEffect(() => {
  if (authLoading) return;

  if (!user || user.user_type !== "Librarian") {
   navigate("/");
   return;
  }
 }, [user, authLoading, navigate]);

 // Get unique bookshelves for filter
 const uniqueBookshelves = Array.from(
  new Set(books.map((book) => book.bookshelf__name).filter(Boolean))
 ).sort();

 const downloadExcel = () => {
  try {
   // Determine report title based on filters
   let reportTitle = "Library Report";
   if (selectedBookshelf !== "all") {
    reportTitle += ` - ${selectedBookshelf} Bookshelf`;
   }
   if (searchQuery) {
    reportTitle += ` - Search: "${searchQuery}"`;
   }
   reportTitle += ` (${new Date().toLocaleDateString()})`;

   // Prepare headers
   const headers: string[] = [
    "No",
    "Title",
    "Author",
    "Publisher",
    "Copyright",
    "ISBN",
    "Copy",
    "Bookshelf",
    "Recommendations"
   ];

   // Prepare data rows from filteredBooks (so it respects current search/filter)
   const rows = filteredBooks.map((book, index) => [
    index + 1,
    book.title || "-",
    book.author || "-",
    book.publisher || "-",
    book.copyright || "-",
    book.isbn || "-",
    book.copy || "-",
    book.bookshelf__name || "-",
    book.recommendation_count || 0
   ]);

   // Create worksheet with title row
   const ws = XLSX.utils.aoa_to_sheet([
    [reportTitle], // Title row
    [], // Empty row for spacing
    headers, // Header row
    ...rows // Data rows
   ]);

   // Merge cells for the title row
   ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];

   // Auto-size columns
   const colWidths = headers.map((header, i) => {
    const headerWidth = header.length;
    const maxDataWidth = Math.max(
     ...rows.map(row => String(row[i]).length),
     10
    );
    return { wch: Math.max(headerWidth, maxDataWidth) };
   });
   ws['!cols'] = colWidths;

   // Create workbook
   const wb = XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(wb, ws, "Library Report");

   // Download with dynamic filename
   let filename = "Library_Report";
   if (selectedBookshelf !== "all") {
    filename += `_${selectedBookshelf.replace(/\s+/g, '_')}`;
   }
   filename += `_${new Date().toISOString().split("T")[0]}.xlsx`;
   XLSX.writeFile(wb, filename);

   setSnackbarMessage("Report downloaded successfully");
   setSnackbarSeverity("success");
   setSnackbarOpen(true);
  } catch (error) {
   console.error("Failed to generate report:", error);
   setSnackbarMessage("Failed to generate report. Please try again.");
   setSnackbarSeverity("error");
   setSnackbarOpen(true);
  }
 };

 const downloadPDF = () => {
  try {
   // Determine report title based on filters
   let reportTitle = "Library Report";
   if (selectedBookshelf !== "all") {
    reportTitle += ` - ${selectedBookshelf} Bookshelf`;
   }
   if (searchQuery) {
    reportTitle += ` - Search: "${searchQuery}"`;
   }

   // Create new PDF document (portrait orientation, A4 size)
   const doc = new jsPDF('p', 'mm', 'a4');

   // Load and add logo image
   const img = new Image();
   img.src = '/emc_logo.png';
   
   // Wait for image to load, then generate PDF
   img.onload = () => {
    // Add image (centered, 40mm width, auto height proportional)
    const imgWidth = 40;
    const imgHeight = (img.height * imgWidth) / img.width;
    const pageWidth = doc.internal.pageSize.getWidth();
    const imgX = (pageWidth - imgWidth) / 2;
    doc.addImage(img, 'PNG', imgX, 10, imgWidth, imgHeight);

    // Calculate Y position for title based on image height
    const titleY = 10 + imgHeight + 8;

    // Add title below logo
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(reportTitle, pageWidth / 2, titleY, { align: 'center' });

    // Add date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, titleY + 7, { align: 'center' });

    // Prepare table data
    const tableData = filteredBooks.map((book, index) => [
     index + 1,
     book.title || "-",
     book.author || "-",
     book.publisher || "-",
     book.copyright || "-",
     book.isbn || "-",
     book.copy || "-",
     book.bookshelf__name || "-",
     book.recommendation_count || 0
    ]);

    // Add table
    const tableStartY = titleY + 12;
    autoTable(doc, {
     head: [['No', 'Title', 'Author', 'Publisher', 'Copyright', 'ISBN', 'Copy', 'Bookshelf', 'Rec.']],
     body: tableData,
     startY: tableStartY,
     styles: {
      fontSize: 7,
      cellPadding: 1.5,
     },
     headStyles: {
      fillColor: [37, 99, 235], // Blue color
      textColor: 255,
      fontStyle: 'bold',
     },
     alternateRowStyles: {
      fillColor: [245, 247, 250],
     },
     columnStyles: {
      0: { cellWidth: 8, halign: 'center' }, // No
      1: { cellWidth: 35 }, // Title
      2: { cellWidth: 25 }, // Author
      3: { cellWidth: 25 }, // Publisher
      4: { cellWidth: 15, halign: 'center' }, // Copyright
      5: { cellWidth: 22 }, // ISBN
      6: { cellWidth: 10, halign: 'center' }, // Copy
      7: { cellWidth: 25 }, // Bookshelf
      8: { cellWidth: 10, halign: 'center' }, // Recommendations
     },
     margin: { left: 10, right: 10 },
    });

    // Add footer with page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
     doc.setPage(i);
     doc.setFontSize(8);
     doc.setFont('helvetica', 'normal');
     doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
     );
    }

    // Download with dynamic filename
    let filename = "Library_Report";
    if (selectedBookshelf !== "all") {
     filename += `_${selectedBookshelf.replace(/\s+/g, '_')}`;
    }
    filename += `_${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(filename);

    setSnackbarMessage("PDF report downloaded successfully");
    setSnackbarSeverity("success");
    setSnackbarOpen(true);
   };

   // Handle image load error
   img.onerror = () => {
    console.error("Failed to load logo image");
    setSnackbarMessage("Failed to load logo. Generating PDF without logo.");
    setSnackbarSeverity("error");
    setSnackbarOpen(true);
    
    // Generate PDF without logo
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(reportTitle, pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, 27, { align: 'center' });

    const tableData = filteredBooks.map((book, index) => [
     index + 1,
     book.title || "-",
     book.author || "-",
     book.publisher || "-",
     book.copyright || "-",
     book.isbn || "-",
     book.copy || "-",
     book.bookshelf__name || "-",
     book.recommendation_count || 0
    ]);

    autoTable(doc, {
     head: [['No', 'Title', 'Author', 'Publisher', 'Copyright', 'ISBN', 'Copy', 'Bookshelf', 'Rec.']],
     body: tableData,
     startY: 32,
     styles: {
      fontSize: 7,
      cellPadding: 1.5,
     },
     headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: 'bold',
     },
     alternateRowStyles: {
      fillColor: [245, 247, 250],
     },
     columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 35 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 22 },
      6: { cellWidth: 10, halign: 'center' },
      7: { cellWidth: 25 },
      8: { cellWidth: 10, halign: 'center' },
     },
     margin: { left: 10, right: 10 },
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
     doc.setPage(i);
     doc.setFontSize(8);
     doc.setFont('helvetica', 'normal');
     doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
     );
    }

    let filename = "Library_Report";
    if (selectedBookshelf !== "all") {
     filename += `_${selectedBookshelf.replace(/\s+/g, '_')}`;
    }
    filename += `_${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(filename);
   };

  } catch (error) {
   console.error("Failed to generate PDF:", error);
   setSnackbarMessage("Failed to generate PDF. Please try again.");
   setSnackbarSeverity("error");
   setSnackbarOpen(true);
  }
 };

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
     userRole="librarian"
     currentPath={"/LibrarianReport"}
     open={isSidebarOpen}
     onClose={handleSidebarToggle}
    />
    <Navbar handleSidebarToggle={handleSidebarToggle} />

    <div className="min-h-screen pt-8 p-4 mt-6 md:-mt-2 md:ml-52">
     {/* Header */}
     <div className="mb-6 grid items-center gap-2">
      <div className="flex gap-3 items-center">
       <FileText className="w-6 h-6 text-[#0a1a3b]" />
       <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0a1a3b] via-[#0f2e6b] to-[#0a1a3b] bg-clip-text text-transparent">
        Library Report
       </h1>
      </div>
      <p className="text-1xl">
       View and download comprehensive library content reports.
      </p>
     </div>

     {/* Search and Action Buttons */}
     <div className="mb-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
       <div className="flex flex-col md:flex-row flex-1 gap-3">
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
        
        {/* Bookshelf Filter */}
        <div className="flex items-center gap-2">
         <label htmlFor="bookshelf-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
          Filter by Bookshelf:
         </label>
         <select
          id="bookshelf-filter"
          value={selectedBookshelf}
          onChange={(e) => setSelectedBookshelf(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
         >
          <option value="all">All Bookshelves</option>
          {uniqueBookshelves.map((bookshelf) => (
           <option key={bookshelf} value={bookshelf}>
            {bookshelf}
           </option>
          ))}
         </select>
        </div>
       </div>

       {/* Download Buttons */}
       <div className="flex gap-2">
        <button
         onClick={downloadPDF}
         disabled={filteredBooks.length === 0}
         className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
         <Download className="w-4 h-4" />
         Download PDF
        </button>
        <button
         onClick={downloadExcel}
         disabled={filteredBooks.length === 0}
         className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
         <Download className="w-4 h-4" />
         Download Excel
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
         </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
         {booksLoading ? (
          <tr>
            <td colSpan={8} className="p-0">
              <ReportTableSkeleton />
            </td>
          </tr>
         ) : filteredBooks.length === 0 ? (
          <tr>
           <td
            colSpan={8}
            className="px-4 py-8 text-center text-sm text-gray-500"
           >
            No books found
           </td>
          </tr>
         ) : (
          currentBooks.map((book) => {
           return (
            <tr
             key={book.no}
             className="hover:bg-gray-50 transition-colors"
            >
             <td className="px-4 py-3 text-sm text-gray-900 font-medium">
              {book.title}
             </td>
             <td className="px-4 py-3 text-sm text-gray-700">
              {book.author || "–"}
             </td>
             <td className="px-4 py-3 text-sm text-gray-700">
              {book.publisher || "–"}
             </td>
             <td className="px-4 py-3 text-sm text-gray-700">
              {book.copyright || "–"}
             </td>
             <td className="px-4 py-3 text-sm text-gray-700">
              {book.isbn || "–"}
             </td>
             <td className="px-4 py-3 text-sm text-gray-700">
              {book.copy || "–"}
             </td>
             <td className="px-4 py-3">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
               {book.bookshelf__name || "–"}
              </span>
             </td>
             <td className="px-4 py-3 text-sm text-gray-700 text-center">
              {book.recommendation_count || 0}
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
         </div>        </div>
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
      <div className="md:ml-52">
     <Footer />
    </div>
   </>
  );
}
