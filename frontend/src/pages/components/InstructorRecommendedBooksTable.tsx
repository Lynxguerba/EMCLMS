import React, { useEffect, useState } from "react";
import { Box, CircularProgress } from "@mui/material";
import axios from "axios";
import { Download, BookOpen, User, Building2, Calendar, Hash, Library } from "lucide-react";
import { getFileUrl, forceDownload } from "../../utils/fileUtils";

// Define props interface
interface InstructorRecommendedBooksTableProps {
  courseId: number;
}

interface Book {
  no: number;
  title: string;
  author: string;
  publisher: string;
  copyright: string;
  isbn: string;
  copy: string;
  bookshelf__name: string;
  file_path?: string;
}

// Table component
const InstructorRecommendedBooksTable: React.FC<
  InstructorRecommendedBooksTableProps
> = ({ courseId }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/api/instructor/get/recommended-books/${courseId}/`,
        {
          withCredentials: true,
        }
      )
      .then((res) => {
        setBooks(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching books:", err);
        setLoading(false);
      });
  }, [courseId]);

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          py: 4,
        }}
      >
        <CircularProgress size="2rem" />
      </Box>
    );
  }

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <BookOpen className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">No recommended books</p>
        <p className="text-sm">You haven't added any books yet</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <p className="text-gray-600 mb-4 text-sm">
        These are the books you recommended for this course
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {books.map((book) => (
          <div
            key={book.no}
            className="group rounded-xl border-2 border-gray-200 bg-white p-5 transition-all duration-300 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100"
          >
            {/* Book Icon and Title */}
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-orange-400 to-pink-600 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-1">
                  {book.title}
                </h3>
              </div>
            </div>

            {/* Book Details */}
            <div className="space-y-2 mb-4">
              {/* Author */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{book.author}</span>
              </div>

              {/* Publisher */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{book.publisher}</span>
              </div>

              {/* Copyright */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>{book.copyright}</span>
              </div>

              {/* ISBN */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Hash className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="font-mono text-xs">{book.isbn}</span>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <div className="flex items-center gap-2">
                {/* Bookshelf Badge */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                  <Library className="w-3 h-3" />
                  <span>{book.bookshelf__name}</span>
                </div>

                {/* Copy Badge */}
                <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                  Copy: {book.copy}
                </span>
              </div>

              {/* Download Button */}
              {book.file_path && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const fileUrl = getFileUrl(book.file_path);
                    const fileName = book.file_path?.split("/").pop() || "download";
                    forceDownload(fileUrl, fileName);
                  }}
                  className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 text-white hover:shadow-lg hover:scale-110 transition-all duration-300"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InstructorRecommendedBooksTable;