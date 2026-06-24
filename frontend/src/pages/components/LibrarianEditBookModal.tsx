import {
  X,
  BookPlus,
  Type,
  User,
  Building2,
  Calendar,
  Hash,
  Copy,
  BookOpen,
  AlertCircle,
  Save,
  Trash2,
  Upload as UploadIcon,
  FileText,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { Book } from "../../types/book";

interface LibrarianEditBookModalProps {
  open: boolean;
  onClose: () => void;
  bookData: Book;
  onSave: (
    updatedBook: Book,
    newFile: File | null,
    deleteFile: boolean,
    onProgress?: (progress: number) => void
  ) => Promise<void>;
}

export default function LibrarianEditBookModal({
  open,
  onClose,
  bookData,
  onSave,
}: LibrarianEditBookModalProps) {
  const [editedBook, setEditedBook] = useState<Book>(bookData);
  const [bookshelves, setBookshelves] = useState<
    { bookshelf_id: number; name: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExistingFileDeleted, setIsExistingFileDeleted] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  } | null>(null);

  const [touched, setTouched] = useState({
    title: false,
    author: false,
    copyright: false,
    copy: false,
    bookshelf: false,
  });

  useEffect(() => {
    setEditedBook(bookData);
    setSelectedFile(null);
    setIsExistingFileDeleted(false);
  }, [bookData, open]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "application/pdf": [".pdf"],
    },
  });

  useEffect(() => {
    if (open) {
      const fetchBookshelves = async () => {
        try {
          const res = await axios.get(
            `${import.meta.env.VITE_API_BASE_URL}/api/librarian/get/all-rows/?table=bookshelf`,
            { withCredentials: true }
          );
          setBookshelves(res.data);
        } catch (error) {
          console.error("Failed to fetch bookshelves:", error);
          setSnackbar({
            open: true,
            message: "Failed to load bookshelves.",
            severity: "error",
          });
        }
      };
      fetchBookshelves();
    }
  }, [open]);

  const isNumeric = (value: string) => /^\d*$/.test(value);

  const isFormValid = () => {
    const titleValid = editedBook.title?.trim() !== "";
    const authorValid = editedBook.author?.trim() !== "";
    const bookshelfValid = editedBook.bookshelf__name?.trim() !== "";
    const copyrightStr = editedBook.copyright?.toString() || "";
    const copyrightValid = copyrightStr.trim() === "" || isNumeric(copyrightStr);
    const copyStr = editedBook.copy?.toString() || "";
    const copyValid = copyStr.trim() !== "" && isNumeric(copyStr);

    return titleValid && authorValid && bookshelfValid && copyrightValid && copyValid;
  };

  const handleBlur = (field: "title" | "author" | "copyright" | "copy" | "bookshelf") => {
    setTouched({ ...touched, [field]: true });
  };

  const handleChange = (field: keyof Book, value: string) => {
    setEditedBook((prevBook) => ({
      ...prevBook,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setUploadProgress(0);
    try {
      await onSave(
        editedBook,
        selectedFile,
        isExistingFileDeleted,
        (progress) => setUploadProgress(progress)
      );
      setSnackbar({
        open: true,
        message: "Book updated successfully!",
        severity: "success",
      });
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to update book.",
        severity: "error",
      });
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveNewFile = () => {
    setSelectedFile(null);
  };

  const handleRemoveExistingFile = () => {
    setIsExistingFileDeleted(true);
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 flex items-center justify-between border-b border-gray-200">
            <div className="flex items-center gap-2">
              <BookPlus className="w-5 h-5 text-gray-800" />
              <h2 className="text-lg font-bold text-gray-800">Edit Book</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-600 hover:bg-gray-200 rounded-lg p-1.5 transition-all duration-200 hover:rotate-90"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <form className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Warning message */}
            <div className="mb-4 flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800">
                Please ensure all book information is accurate before saving changes.
              </p>
            </div>

            <div className="space-y-3">
              {/* Title Field */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Type className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={editedBook.title || ""}
                    onChange={(e) => handleChange("title", e.target.value)}
                    onBlur={() => handleBlur("title")}
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter book title"
                  />
                </div>
                {touched.title && editedBook.title?.trim() === "" && (
                  <p className="text-xs text-red-600 mt-1">Title is required.</p>
                )}
              </div>

              {/* Author Field */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Author <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={editedBook.author || ""}
                    onChange={(e) => handleChange("author", e.target.value)}
                    onBlur={() => handleBlur("author")}
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter author name"
                  />
                </div>
                {touched.author && editedBook.author?.trim() === "" && (
                  <p className="text-xs text-red-600 mt-1">Author is required.</p>
                )}
              </div>

              {/* Publisher Field */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Publisher
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={editedBook.publisher || ""}
                    onChange={(e) => handleChange("publisher", e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter publisher (optional)"
                  />
                </div>
              </div>

              {/* Copyright Field */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Copyright Year
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={editedBook.copyright || ""}
                    onChange={(e) => handleChange("copyright", e.target.value)}
                    onBlur={() => handleBlur("copyright")}
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="e.g., 2024 (optional)"
                  />
                </div>
                {touched.copyright && editedBook.copyright && editedBook.copyright.toString().trim() !== "" && !isNumeric(editedBook.copyright.toString()) && (
                  <p className="text-xs text-red-600 mt-1">
                    Copyright must contain numbers only.
                  </p>
                )}
              </div>

              {/* ISBN Field */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  ISBN
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Hash className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={editedBook.isbn || ""}
                    onChange={(e) => handleChange("isbn", e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter ISBN (optional)"
                  />
                </div>
              </div>

              {/* File Upload Section */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Book File
                </label>
                
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all relative overflow-hidden ${
                    loading
                      ? "border-blue-300 bg-blue-50/30 cursor-wait"
                      : isDragActive
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                  }`}
                >
                  <input {...getInputProps()} disabled={loading} />
                  
                  {loading ? (
                    <div className="flex flex-col items-center gap-3 w-full py-2 animate-[fadeIn_0.3s_ease-out]">
                      <div className="flex items-center justify-between w-full mb-1 px-1">
                        <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                          uploadProgress === 100 ? "text-purple-600" : "text-blue-700"
                        }`}>
                          <div className={`w-2 h-2 rounded-full animate-pulse ${
                            uploadProgress === 100 ? "bg-purple-500" : "bg-blue-500"
                          }`}></div>
                          {uploadProgress === 100 ? "Processing..." : "Uploading Changes..."}
                        </span>
                        <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                          uploadProgress === 100 ? "text-purple-700 bg-purple-100" : "text-blue-700 bg-blue-100"
                        }`}>
                          {uploadProgress}%
                        </span>
                      </div>
                      <div className={`w-full h-2.5 bg-gray-200/50 rounded-full overflow-hidden border shadow-inner relative ${
                        uploadProgress === 100 ? "border-purple-100" : "border-blue-100"
                      }`}>
                        <div
                          className={`h-full bg-gradient-to-r rounded-full transition-all duration-500 ease-out relative shadow-[0_0_10px_rgba(59,130,246,0.3)] ${
                            uploadProgress === 100 
                              ? "from-purple-500 via-fuchsia-500 to-pink-500" 
                              : "from-blue-400 via-indigo-500 to-purple-600"
                          }`}
                          style={{ width: `${Math.max(uploadProgress, 5)}%` }}
                        >
                          <div className="absolute inset-0 w-full h-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium">
                        {uploadProgress === 100 
                          ? "Finalizing updates..." 
                          : "Syncing your content updates..."}
                      </p>
                    </div>
                  ) : (
                    <>
                      <UploadIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      {isDragActive ? (
                        <p className="text-sm text-blue-600 font-medium">
                          Drop your PDF here...
                        </p>
                      ) : (
                        <div>
                          <p className="text-sm text-gray-700 font-medium mb-1">
                            Drag & drop a PDF file here, or click to select
                          </p>
                          <p className="text-xs text-gray-500">
                            Strictly PDF only
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* File Status (only show when not loading) */}
                {!loading && (
                  <div className="mt-3 space-y-2">
                    {/* Existing File */}
                    {bookData.file_path && !isExistingFileDeleted && !selectedFile && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {bookData.file_path.split("/").pop()}
                            </p>
                            <p className="text-xs text-gray-500">Existing file</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveExistingFile}
                          className="flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium ml-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      </div>
                    )}

                    {/* New Selected File */}
                    {selectedFile && (
                      <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {selectedFile.name}
                            </p>
                            <p className="text-xs text-blue-600">
                              New file ({(selectedFile.size / 1024).toFixed(1)} KB)
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveNewFile}
                          className="flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium ml-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Copy Field */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Copy Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Copy className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={editedBook.copy?.toString() || ""}
                    onChange={(e) => handleChange("copy", e.target.value)}
                    onBlur={() => handleBlur("copy")}
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="e.g., 1, 2, 3"
                  />
                </div>
                {touched.copy && (editedBook.copy === undefined || editedBook.copy === null || editedBook.copy.toString().trim() === "") && (
                  <p className="text-xs text-red-600 mt-1">Copy is required.</p>
                )}
                {touched.copy && editedBook.copy && editedBook.copy.toString().trim() !== "" && !isNumeric(editedBook.copy.toString()) && (
                  <p className="text-xs text-red-600 mt-1">
                    Copy must contain numbers only.
                  </p>
                )}
              </div>

              {/* Bookshelf Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Bookshelf <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BookOpen className="h-4 w-4 text-gray-400" />
                  </div>
                  <select
                    value={editedBook.bookshelf__name || ""}
                    onChange={(e) => handleChange("bookshelf__name", e.target.value)}
                    onBlur={() => handleBlur("bookshelf")}
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white"
                  >
                    <option value="">Select bookshelf</option>
                    {bookshelves.map((bs) => (
                      <option key={bs.bookshelf_id} value={bs.name}>
                        {bs.name}
                      </option>
                    ))}
                  </select>
                </div>
                {touched.bookshelf && editedBook.bookshelf__name?.trim() === "" && (
                  <p className="text-xs text-red-600 mt-1">Bookshelf is required.</p>
                )}
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-all duration-200 font-medium hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isFormValid() || loading}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Snackbar */}
      {snackbar?.open && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] animate-in slide-in-from-top duration-300">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
              snackbar.severity === "success"
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-medium">{snackbar.message}</p>
            <button
              onClick={() => setSnackbar(null)}
              className="ml-2 hover:bg-white/20 rounded p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
