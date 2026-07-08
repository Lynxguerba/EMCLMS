// React and routing imports
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

// Auth Context
import { useAuth } from "../context/AuthContext";

// MUI components
import { Box, CircularProgress, Typography } from "@mui/material";

// MUI theming
import { useTheme } from "@mui/material/styles";

// Lucide Icons
import {
  Edit,
  FileText,
  User,
  MessageSquare,
  Award,
  CheckCircle,
  Clock,
  Search,
  X,
  File,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Local components
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { getFileUrl, forceDownload } from "../utils/fileUtils";

// Hooks
import { useInstructorContentGrades, useUpdateGrade } from "../hooks/useQueries";

// Interface defining the structure of a student row in the data grid
interface StudentRow {
  id: number;
  student_id: string;
  first_name: string;
  last_name: string;
  score: number | null;
  feedback: string;
  status: string;
  submission_files: { id: number; file_url: string; uploaded_at: string }[];
  profile_picture?: string;
  submitted_at?: string;
}

function StudentRow(props: {
  student: StudentRow;
  onOpenGradingModal: (student: StudentRow) => void;
  dueDate: string | null;
}) {
  const { student, onOpenGradingModal, dueDate } = props;

  const getStatus = (status: string, submittedAt?: string, dueDate?: string | null) => {
    let finalStatus = status === "Graded" ? "Scored" : status;
    if (finalStatus === "Scored" && submittedAt && dueDate) {
      if (new Date(submittedAt) > new Date(dueDate)) {
        return "Late/Scored";
      }
    }
    return finalStatus;
  };

  const currentStatus = getStatus(student.status, student.submitted_at, dueDate);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Scored":
        return "bg-green-100 text-green-700";
      case "Late/Scored":
        return "bg-red-100 text-red-700";
      case "Late":
        return "bg-orange-100 text-orange-700";
      case "Submitted":
        return "bg-blue-100 text-blue-700";
      case "Not Submitted":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Scored":
      case "Late/Scored":
        return <CheckCircle className="w-4 h-4" />;
      case "Late":
      case "Submitted":
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-200">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-xs">
            {`${student.first_name?.[0] ?? ""}${student.last_name?.[0] ?? ""}`}
          </div>
          <div>
            <div className="font-medium text-gray-800 text-sm">
              {student.first_name} {student.last_name}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 text-gray-700">
          <Award className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-semibold text-sm">
            {student.score !== null ? student.score : "—"}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-start gap-1.5 text-gray-700">
          <MessageSquare className="w-3.5 h-3.5 text-gray-500 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-2 text-sm">
            {student.feedback || "No feedback provided"}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium text-xs ${getStatusColor(
            currentStatus
          )}`}
        >
          {getStatusIcon(currentStatus)}
          {currentStatus}
        </div>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onOpenGradingModal(student)}
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 transform hover:scale-105 font-medium text-sm flex items-center gap-1.5"
          aria-label="grade and review"
        >
          <Edit className="w-3.5 h-3.5" />
          Grade
        </button>
      </td>
    </tr>
  );
}

// File Preview Component with PDF Blob support
// ... (FilePreview component remains the same, I will keep it as is to avoid breaking it)
function FilePreview({ fileUrl }: { fileUrl: string }) {
  const fileName = fileUrl ? fileUrl.split("/").pop() || "" : "";
  const fileExtension = fileName.split(".").pop()?.toLowerCase() || "";

  const isImage = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"].includes(
    fileExtension
  );
  const isPdf = fileExtension === "pdf";
  const isVideo = ["mp4", "webm", "ogg"].includes(fileExtension);
  const isAudio = ["mp3", "wav", "ogg"].includes(fileExtension);
  const isWord = ["doc", "docx"].includes(fileExtension);
  const isOffice = ["ppt", "pptx", "xls", "xlsx"].includes(fileExtension);
  const isText = fileExtension === "txt";

  // PDF/Text Preview state
  const [pdfBlob, setPdfBlob] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  // Preview fetch effect (for PDF and Text)
  useEffect(() => {
    if ((isPdf || isText) && fileUrl) {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
      const isInternal = 
        fileUrl.startsWith("/") || 
        (baseUrl && fileUrl.startsWith(baseUrl)) ||
        fileUrl.includes("localhost:8000") || 
        fileUrl.includes("127.0.0.1:8000");
      
      setPreviewLoading(true);
      setPreviewError(false);
      setTextContent(null);
      setPdfBlob(null);

      if (isInternal) {
        // Use credentials only for internal URLs to avoid CORS issues with external providers.
        // Append a timestamp to prevent caching of 401 responses
        const urlWithCacheBust = `${fileUrl}${fileUrl.includes('?') ? '&' : '?'}t=${new Date().getTime()}`;
        
        fetch(urlWithCacheBust, { credentials: "include" })
          .then((res): Promise<string | Blob> => {
            if (!res.ok) throw new Error(`Failed to load file: ${res.status}`);
            return isText ? res.text() : res.blob();
          })
          .then((data: string | Blob) => {
            if (isText) {
              setTextContent(data as string);
            } else {
              const blobUrl = URL.createObjectURL(data as Blob);
              setPdfBlob(blobUrl);
            }
            setPreviewLoading(false);
          })
          .catch((err) => {
            console.error("Internal fetch failed, falling back to iframe:", err);
            setPdfBlob(null);
            setPreviewError(true);
            setPreviewLoading(false);
          });
      } else {
        // External URL (Cloudinary etc)
        if (isText) {
          fetch(fileUrl)
            .then(res => res.text())
            .then(text => {
              setTextContent(text);
              setPreviewLoading(false);
            })
            .catch(() => {
              setPreviewError(true);
              setPreviewLoading(false);
            });
        } else {
          // For external PDFs, we let the iframe handle it
          setPreviewLoading(false);
        }
      }
    }

    return () => {
      if (pdfBlob) URL.revokeObjectURL(pdfBlob);
    };
  }, [fileUrl, isPdf, isText, pdfBlob]);

  if (!fileUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
        <p className="text-gray-500 text-sm">No file URL available</p>
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
        <img
          src={fileUrl}
          alt="Submission preview"
          className="max-w-full max-h-full object-contain"
        />
      </div>
    );
  }

  if (isText) {
    return (
      <div className="w-full h-full bg-white rounded-lg overflow-hidden relative border border-gray-200 flex flex-col">
        <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500 uppercase">Plain Text Viewer</span>
          <button
            onClick={() => forceDownload(fileUrl, fileName || "download")}
            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
          >
            Download
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {previewLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : previewError ? (
            <p className="text-red-500 text-sm">Failed to load text content.</p>
          ) : (
            <pre className="text-sm font-mono text-gray-800 whitespace-pre-wrap">
              {textContent}
            </pre>
          )}
        </div>
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="w-full h-full bg-gray-50 rounded-lg overflow-hidden relative">
        {/* Loading Spinner Overlay */}
        {previewLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">Loading PDF...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {previewError ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 rounded-lg p-6">
            <File className="w-16 h-16 text-gray-400 mb-4" />
            <p className="text-gray-600 text-sm mb-4">
              Unable to preview PDF in browser
            </p>
            <div className="mb-4 px-3 py-2 bg-gray-100 rounded text-xs font-mono text-gray-500 break-all max-w-full">
              {fileUrl}
            </div>
            <button
              onClick={() => forceDownload(fileUrl, fileName || "download")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Download PDF
            </button>
          </div>
        ) : (
          <iframe
            src={
              pdfBlob ||
              `${fileUrl}${
                fileUrl.includes("?") ? "&" : "?"
              }t=${new Date().getTime()}`
            }
            className="w-full h-full rounded-lg border-0"
            title="PDF Preview"
            onLoad={() => setPreviewLoading(false)}
            onError={(e) => {
              console.error("Iframe failed to load PDF", e);
              setPreviewError(true);
              setPreviewLoading(false);
            }}
          />
        )}
      </div>
    );
  }

  if (isWord || isOffice) {
    const isUrlLocal = fileUrl.includes("localhost") || fileUrl.includes("127.0.0.1");
    
    if (isUrlLocal) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 rounded-lg p-6">
          <FileText className="w-16 h-16 text-blue-500 mb-4" />
          <p className="text-gray-800 font-medium mb-2">Office Document Preview</p>
          <p className="text-gray-600 text-sm text-center mb-6 max-w-md">
            Previewing Office documents on localhost is not supported by the online viewer. 
            This feature will work when the application is deployed to a public URL.
          </p>
          <button
            onClick={() => forceDownload(fileUrl, fileName || "download")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download to View
          </button>
        </div>
      );
    }

    const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
    
    return (
      <div className="w-full h-full bg-white rounded-lg overflow-hidden relative border border-gray-200">
        <iframe
          src={officeUrl}
          className="w-full h-full border-0"
          title="Office Document Preview"
        />
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg">
        <video controls className="max-w-full max-h-full">
          <source src={fileUrl} type={`video/${fileExtension}`} />
          Your browser does not support video playback.
        </video>
      </div>
    );
  }

  if (isAudio) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <audio controls className="w-full max-w-md">
            <source src={fileUrl} type={`audio/${fileExtension}`} />
            Your browser does not support audio playback.
          </audio>
        </div>
      </div>
    );
  }

  // Fallback for unsupported file types
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 rounded-lg p-6">
      <File className="w-16 h-16 text-gray-400 mb-4" />
      <p className="text-gray-600 text-sm mb-4">
        Preview not available for this file type
      </p>
      <button
        onClick={() => forceDownload(fileUrl, fileName || "download")}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
      >
        Download File
      </button>
    </div>
  );
}

// Unified Grading Modal Component
function GradingModal({
  open,
  onClose,
  student,
  grade,
  setGrade,
  feedback,
  setFeedback,
  totalScore,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  student: StudentRow | null;
  grade: string;
  setGrade: (grade: string) => void;
  feedback: string;
  setFeedback: (feedback: string) => void;
  totalScore: number | null;
  onSave: () => void;
}) {
  const [currentFileIndex, setCurrentFileIndex] = useState(0);

  // Reset file index when modal opens with a new student
  useEffect(() => {
    if (open && student) {
      setCurrentFileIndex(0);
    }
  }, [open, student]);

  if (!open || !student) return null;

  const hasFiles =
    student.submission_files && student.submission_files.length > 0;
  const currentFile = hasFiles
    ? student.submission_files[currentFileIndex]
    : null;

  const fileUrl = currentFile ? getFileUrl(currentFile.file_url) : "";
  const fileName = fileUrl ? fileUrl.split("/").pop() : "";

  const handlePrevFile = () => {
    setCurrentFileIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextFile = () => {
    setCurrentFileIndex((prev) =>
      Math.min(student.submission_files.length - 1, prev + 1)
    );
  };

  // Disable save if grade is empty
  const isSaveDisabled = () => {
    return grade.trim() === "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="bg-blue-500 rounded-lg p-1.5">
              <Edit className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">
              Grade Student: {student.first_name} {student.last_name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:bg-gray-200 rounded-lg p-1.5 transition-all duration-200 hover:rotate-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Two-Column Layout */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left Column: Grading Form */}
          <div className="w-full md:w-[35%] p-5 overflow-y-auto border-r border-gray-200">
            <div className="space-y-4">
              {/* Score Input */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Award className="w-4 h-4 text-blue-600" />
                  Score
                  {totalScore !== null && (
                    <span className="text-gray-500 font-normal">
                      (Max: {totalScore})
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  value={grade}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || !totalScore) {
                      setGrade(value);
                      return;
                    }
                    const numericValue = parseFloat(value);
                    if (numericValue <= totalScore) {
                      setGrade(value);
                    } else {
                      setGrade(totalScore.toString());
                    }
                  }}
                  placeholder="Enter score"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm font-medium text-gray-900 placeholder-gray-400 hover:bg-gray-100"
                />
              </div>

              {/* Feedback Input */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  Feedback
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Enter feedback for the student"
                  rows={8}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm text-gray-900 placeholder-gray-400 hover:bg-gray-100 resize-none"
                />
              </div>

              {/* Current Status Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700">
                  <span className="font-semibold">Current Status:</span>{" "}
                  {student.status}
                </p>
                {student.score !== null && (
                  <p className="text-xs text-blue-700 mt-1">
                    <span className="font-semibold">Current Score:</span>{" "}
                    {student.score}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: File Preview */}
          <div className="w-full md:w-[65%] p-5 overflow-y-auto bg-gray-50">
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Submitted Files
                </label>
                {hasFiles && student.submission_files.length > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrevFile}
                      disabled={currentFileIndex === 0}
                      className="p-1 rounded-lg bg-white border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-gray-600 font-medium">
                      {currentFileIndex + 1} / {student.submission_files.length}
                    </span>
                    <button
                      onClick={handleNextFile}
                      disabled={
                        currentFileIndex === student.submission_files.length - 1
                      }
                      className="p-1 rounded-lg bg-white border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {hasFiles ? (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="mb-2 px-3 py-2 bg-white rounded-lg border border-gray-200 flex items-center justify-between">
                    <p
                      className="text-xs text-gray-600 truncate flex-1 mr-4"
                      title={fileName || ""}
                    >
                      {fileName}
                    </p>
                    <button
                      onClick={() => forceDownload(fileUrl, fileName || "download")}
                      className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-semibold transition-colors"
                      title="Download file"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </button>
                  </div>
                  <div className="flex-1 min-h-0">
                    <FilePreview fileUrl={fileUrl} />
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-white rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <File className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No files submitted</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            disabled={isSaveDisabled()}
            onClick={onSave}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 disabled:hover:scale-100 disabled:hover:shadow-sm"
          >
            <Award className="w-4 h-4" />
            Save Grade
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InstructorGradeContent() {
  // Hooks
  const theme = useTheme();
  const navigate = useNavigate();
  const { content_id } = useParams<{ content_id: string }>();
  const { user, loading: authLoading } = useAuth();

  // Queries & Mutations
  const { data: contentGrades, isLoading: dataLoading } = useInstructorContentGrades(content_id || "");
  const updateGradeMutation = useUpdateGrade(content_id || "");

  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [gradingModalOpen, setGradingModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Grading Form State
  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");

  // Student Selection
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(
    null
  );

  // Derived Data
  const contentTitle = contentGrades?.content_title || "Loading Content...";
  const totalScore = contentGrades?.total_score || null;
  const dueDate = contentGrades?.due_date || null;
  const studentRows: StudentRow[] = contentGrades?.grades || [];

  // Filter students based on search query
  const filteredStudents = studentRows.filter((student) => {
    const query = searchQuery.toLowerCase();
    return (
      student.first_name?.toLowerCase().includes(query) ||
      student.last_name?.toLowerCase().includes(query) ||
      student.status?.toLowerCase().includes(query)
    );
  });

  // Toggle sidebar open/close state
  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  // Open grading modal with selected student
  const handleOpenGradingModal = (student: StudentRow) => {
    setSelectedStudent(student);
    setGrade(student.score !== null ? student.score.toString() : "");
    setFeedback(student.feedback);
    setGradingModalOpen(true);
  };

  // Close grading modal and reset inputs
  const handleCloseGradingModal = () => {
    setGradingModalOpen(false);
    setSelectedStudent(null);
    setGrade("");
    setFeedback("");
  };

  // Save grade and feedback for the selected student (with confirmation)
  const handleSaveGrade = () => {
    setConfirmOpen(true);
  };

  const confirmSaveGrade = async () => {
    if (!selectedStudent) return;
    
    const numericGrade = grade === "" ? null : parseFloat(grade);

    if (numericGrade !== null && totalScore !== null && numericGrade > totalScore) {
      alert(`Score cannot exceed total score (${totalScore}).`);
      return;
    }

    try {
      await updateGradeMutation.mutateAsync({
        studentId: selectedStudent.id,
        score: numericGrade,
        feedback: feedback,
      });
      handleCloseGradingModal();
    } catch (error) {
      console.error("Error saving grade:", error);
    } finally {
      setConfirmOpen(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.user_type !== "Instructor") {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  // Display a spinner while loading data
  if (authLoading || dataLoading) {
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

  // Main component render
  return (
    <>
      <Box
        sx={{
          height: "100vh",
          overflowY: "auto",
          backgroundColor: theme.palette.background.default,
        }}
      >
        {/* Sidebar and Navbar components */}
        <Sidebar
          userRole="instructor"
          currentPath="/InstructorGrade"
          open={sidebarOpen}
          onClose={toggleSidebar}
        />
        <Navbar handleSidebarToggle={toggleSidebar} />

        {/* Page title */}
        <Typography
          variant="h3"
          component="h2"
          color={theme.palette.text.primary}
          sx={{
            margin: theme.spacing(2),
            marginLeft: { xs: theme.spacing(6), sm: theme.spacing(31) },
            fontWeight: 400,
            mt: { xs: 7, sm: 5 },
          }}
        >
          Scoring Content: {contentTitle}
        </Typography>

        {/* Modern Table Container */}
        <Box
          sx={{
            margin: theme.spacing(2),
            marginLeft: { xs: theme.spacing(6), sm: theme.spacing(31) },
          }}
        >
          <div className="w-full">
            <style>
              {`
                .line-clamp-2 {
                  display: -webkit-box;
                  -webkit-line-clamp: 2;
                  -webkit-box-orient: vertical;
                  overflow: hidden;
                }
              `}
            </style>

            {/* Search Bar */}
            <div className="mb-3 mt-5 flex justify-start">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 w-56"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl shadow-lg">
              <table className="min-w-full bg-white">
                <thead className="bg-gradient-to-r from-blue-600 to-indigo-600">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        Student
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5" />
                        Score
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Feedback
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        Status
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <StudentRow
                        key={student.id}
                        student={student}
                        onOpenGradingModal={handleOpenGradingModal}
                        dueDate={dueDate}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-500">
                          <Search className="w-10 h-10 mb-2 opacity-50" />
                          <p className="text-sm">
                            No students found matching "{searchQuery}"
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Box>

        {/* Unified Grading Modal */}
        <GradingModal
          open={gradingModalOpen}
          onClose={handleCloseGradingModal}
          student={selectedStudent}
          grade={grade}
          setGrade={setGrade}
          feedback={feedback}
          setFeedback={setFeedback}
          totalScore={totalScore}
          onSave={handleSaveGrade}
        />

        {/* Confirmation dialog for saving grade */}

        {confirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-4">
                <h2 className="text-lg font-bold text-gray-800">
                  Confirm Save
                </h2>
              </div>

              {/* Content */}
              <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 ">
                <p className="text-gray-700 text-sm ">
                  Are you sure you want to save this score and feedback?
                </p>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 flex justify-end gap-3">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="px-5 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSaveGrade}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </Box>
        <div className="md:ml-52">
     <Footer />
    </div>
   </>
  );
}
