// React and Hooks
import { useCallback, useEffect, useMemo, useState } from "react";

// MUI Components
// import { Box, CircularProgress } from "@mui/material";

import { useDropzone } from "react-dropzone";

// date-fns
import {
  differenceInSeconds,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  isAfter,
  format,
} from "date-fns";

// Lucide Icons
import {
  X,
  FileText,
  Download,
  Upload,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  Award,
  MessageSquare,
  Trash2,
  CloudUpload,
  File,
  Megaphone,
} from "lucide-react";
import {
  getFileUrl,
  forceDownload,
  getRemoteFileName,
  openDirectFile,
  type RemoteFile,
} from "../../utils/fileUtils";

// Interfaces
interface ContentItem {
  content_id: number;
  section: number;
  content_title: string;
  content_type: string;
  order_in_section: number;
  created_at: string;
  updated_at: string;
  due_date?: string | null;
  is_active?: boolean | null;
  content_description?: string | null;
  files?: Array<string | RemoteFile>;
}

interface SubmissionStatus {
  submitted: boolean;
  files: { id: number; file_name: string; file_url: string }[];
  score: number | null;
  feedback: string | null;
  status: string | null;
  graded_at: string | null;
  submitted_at: string | null;
}

interface StudentCourseContentModalProps {
  open: boolean;
  onClose: () => void;
  selectedContent: ContentItem | null;
  submissionStatus: SubmissionStatus | null;
  handleSubmit: (
    files: File[],
    contentId: number,
    keepFileIds: number[],
    confirm: boolean,
    onProgress?: (progress: number) => void
  ) => void;
}

export default function StudentCourseContentModal({
  open,
  onClose,
  selectedContent,
  submissionStatus,
  handleSubmit,
}: StudentCourseContentModalProps) {
  // State initialization
  const [openSecondModal, setOpenSecondModal] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Student submission state
  type ExistingFile = { id: number; file_name: string; file_url: string };
  type LocalFile = File & { isExisting?: boolean; file_url?: string };
  const [existingFiles, setExistingFiles] = useState<ExistingFile[]>([]);
  const [newFiles, setNewFiles] = useState<LocalFile[]>([]);

  // Sync existing submission files into state when modal opens
  useEffect(() => {
    if (openSecondModal) {
      if (submissionStatus?.submitted) {
        const existing = (submissionStatus.files || []).map((f) => ({
          id: f.id,
          file_name: f.file_name,
          file_url: f.file_url,
        }));
        setExistingFiles(existing);
      } else {
        setExistingFiles([]);
      }
      setNewFiles([]);
      setError(null);
    }
  }, [openSecondModal, submissionStatus]);

  // Clean up state when the main modal closes
  useEffect(() => {
    if (!open) {
      setNewFiles([]);
      setExistingFiles([]);
      setOpenSecondModal(false);
      setConfirmDialogOpen(false);
      setError(null);
    }
  }, [open]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setError(null);
      const MAX_FILE_SIZE = 20 * 1024 * 1024;
      const invalidFiles = acceptedFiles.filter(f => f.size > MAX_FILE_SIZE);
      
      if (invalidFiles.length > 0) {
        setError(`Some files were rejected because they exceed the 20MB limit.`);
      }

      const validFiles = acceptedFiles.filter(f => f.size <= MAX_FILE_SIZE);

      setNewFiles((prev) => {
        const add = validFiles.filter(
          (nf) =>
            !prev.some((pf) => pf.name === nf.name) &&
            !existingFiles.some((ef) => ef.file_name === nf.name)
        );
        return [...prev, ...add];
      });
    },
    [existingFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isSubmitting,
  });

  const handleRemoveExistingFile = (index: number) => {
    setExistingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Derived list for UI rendering
  const combinedList = useMemo(
    () => [
      ...existingFiles.map((f) => ({
        kind: "existing" as const,
        name: f.file_name,
        url: f.file_url,
      })),
      ...newFiles.map((f) => ({
        kind: "new" as const,
        name: f.name,
        size: f.size,
      })),
    ],
    [existingFiles, newFiles]
  );

  // Detect if user has made any changes
  const hasChanges = useMemo(() => {
    const originalIds = (submissionStatus?.files || []).map((f) => f.id).sort();
    const currentIds = existingFiles.map((f: any) => f.id).sort();

    const sameIds =
      originalIds.length === currentIds.length &&
      originalIds.every((id, idx) => id === currentIds[idx]);

    return newFiles.length > 0 || !sameIds;
  }, [submissionStatus, existingFiles, newFiles]);

  async function handleConfirmSubmission(confirm: boolean) {
    if (!selectedContent) return;

    setIsSubmitting(true);
    setUploadProgress(0);
    
    // If we are confirming directly without opening the modal, existingFiles might be empty.
    // In that case, we should assume we want to keep all currently submitted files.
    let keepIds: number[] = [];
    if (openSecondModal) {
      keepIds = existingFiles.map((f: any) => f.id);
    } else if (submissionStatus?.files) {
      keepIds = submissionStatus.files.map((f: any) => f.id);
    }

    try {
      await handleSubmit(
        openSecondModal ? newFiles : [],
        selectedContent.content_id,
        keepIds,
        confirm,
        (progress) => setUploadProgress(progress)
      );
      setNewFiles([]);
      setExistingFiles([]);
      setOpenSecondModal(false);
      setConfirmDialogOpen(false);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  }

  const isLocked = useMemo(() => {
    return (
      submissionStatus?.status === "Submitted" ||
      submissionStatus?.status === "Late" ||
      submissionStatus?.status === "Graded"
    );
  }, [submissionStatus]);

  const getStatusConfig = (status: string | null) => {
    switch (status) {
      case "Graded":
        return {
          label: "Scored",
          bgColor: "bg-blue-100",
          textColor: "text-blue-700",
          icon: <Award className="w-4 h-4" />,
        };
      case "Submitted":
        return {
          label: "Submitted",
          bgColor: "bg-green-100",
          textColor: "text-green-700",
          icon: <CheckCircle className="w-4 h-4" />,
        };
      case "Late":
        return {
          label: "Late",
          bgColor: "bg-red-100",
          textColor: "text-red-700",
          icon: <AlertCircle className="w-4 h-4" />,
        };
      default:
        return {
          label: "Pending",
          bgColor: "bg-gray-100",
          textColor: "text-gray-700",
          icon: <Clock className="w-4 h-4" />,
        };
    }
  };

  const getContentIcon = () => {
    switch (selectedContent?.content_type) {
      case "Activity":
        return <CheckCircle className="w-5 h-5 text-white" />;
      case "Announcement":
        return <Megaphone className="w-5 h-5 text-white" />;
      case "File":
        return <FileText className="w-5 h-5 text-white" />;
      default:
        return <File className="w-5 h-5 text-white" />;
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Main Content Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 flex items-center justify-between border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-md">
                {getContentIcon()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800 break-words">
                  {selectedContent?.content_title}
                </h2>
                <p className="text-xs text-gray-600">
                  {selectedContent?.content_type}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-600 hover:bg-gray-200 rounded-lg p-1.5 transition-all duration-200 hover:rotate-90"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">
            {/* Description */}
            {selectedContent?.content_description && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                  {selectedContent.content_description}
                </p>
              </div>
            )}

            {/* Due Date */}
            {selectedContent?.due_date && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">
                  Due:{" "}
                  {format(new Date(selectedContent.due_date), "MMMM d, yyyy")}
                </span>
              </div>
            )}

            {/* File Type Content */}
            {selectedContent?.content_type === "File" &&
              selectedContent?.files &&
              selectedContent.files.length > 0 && (
                <div className="space-y-2">
                  {selectedContent.files.map((filePath, index) => {
                    const fileName = getRemoteFileName(filePath);
                    return (
                      <button
                        key={index}
                        onClick={() => openDirectFile(filePath, "download")}
                        className="w-full flex items-center gap-3 p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all duration-200 group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <span className="flex-1 text-left text-sm font-medium text-gray-700 truncate">
                          {fileName}
                        </span>
                        <Download className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                      </button>
                    );
                  })}
                </div>
              )}

            {/* Activity Type Content */}
            {selectedContent?.content_type === "Activity" && (
              <>
                {/* Instructor Files Section */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Instructor Files
                  </h3>

                  {selectedContent?.files?.length ? (
                    <div className="space-y-2">
                      {selectedContent.files.map((filePath, index) => {
                        const fileName = getRemoteFileName(filePath);
                        return (
                          <button
                            key={index}
                            onClick={() => openDirectFile(filePath, "download")}
                            className="w-full flex items-center gap-3 p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all duration-200 group"
                          >
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                              <FileText className="w-5 h-5 text-white" />
                            </div>
                            <span className="flex-1 text-left text-sm font-medium text-gray-700 truncate">
                              {fileName}
                            </span>
                            <Download className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                      <FileText className="w-12 h-12 mb-2 opacity-50" />
                      <p className="text-sm">
                        No instructor files uploaded yet
                      </p>
                    </div>
                  )}
                </div>

                {/* Your Submission Section */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-green-600" />
                    Your Submission
                  </h3>

                  {submissionStatus?.submitted ? (
                    <div className="space-y-4">
                      {/* Status Badge */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 font-medium">
                          Status:
                        </span>
                        {(() => {
                          const statusConfig = getStatusConfig(
                            submissionStatus.status
                          );
                          return (
                            <div
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${statusConfig.bgColor} ${statusConfig.textColor} text-sm font-medium`}
                            >
                              {statusConfig.icon}
                              <span>{statusConfig.label}</span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Submission Timing */}
                      {selectedContent?.due_date &&
                        submissionStatus?.submitted_at &&
                        (() => {
                          const due = new Date(selectedContent.due_date);
                          const submitted = new Date(
                            submissionStatus.submitted_at
                          );
                          const late = isAfter(submitted, due);
                          const seconds = Math.abs(
                            differenceInSeconds(submitted, due)
                          );
                          const minutes = Math.abs(
                            differenceInMinutes(submitted, due)
                          );
                          const hours = Math.abs(
                            differenceInHours(submitted, due)
                          );
                          const days = Math.abs(
                            differenceInDays(submitted, due)
                          );
                          return (
                            <div
                              className={`flex items-center gap-2 p-3 rounded-lg ${
                                late
                                  ? "bg-red-50 border border-red-200"
                                  : "bg-green-50 border border-green-200"
                              }`}
                            >
                              <Clock
                                className={`w-4 h-4 ${
                                  late ? "text-red-600" : "text-green-600"
                                }`}
                              />
                              <span
                                className={`text-sm font-medium ${
                                  late ? "text-red-700" : "text-green-700"
                                }`}
                              >
                                Submitted {late ? "late" : "early"} by: {days}d{" "}
                                {hours % 24}h {minutes % 60}m {seconds % 60}s
                              </span>
                            </div>
                          );
                        })()}

                      {/* Score */}
                      {submissionStatus.score !== null && (
                        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <Award className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-700">
                            Score: {submissionStatus.score}
                          </span>
                        </div>
                      )}

                      {/* Feedback */}
                      {submissionStatus.feedback && (
                        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="w-4 h-4 text-purple-600" />
                            <span className="text-sm font-bold text-purple-700">
                              Feedback
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">
                            {submissionStatus.feedback}
                          </p>
                        </div>
                      )}

                      {/* Submitted Files */}
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-2">
                          Submitted Files:
                        </p>
                        <div className="space-y-2">
                          {submissionStatus.files.map((file, index) => {
                            const fileUrl = getFileUrl(file.file_url);
                            return (
                              <button
                                key={index}
                                onClick={() =>
                                  forceDownload(fileUrl, file.file_name)
                                }
                                className="w-full flex items-center gap-3 p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-green-400 hover:shadow-md transition-all duration-200 group"
                              >
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                  <FileText className="w-5 h-5 text-white" />
                                </div>
                                <span className="flex-1 text-left text-sm font-medium text-gray-700 truncate">
                                  {file.file_name}
                                </span>
                                <Download className="w-4 h-4 text-gray-400 group-hover:text-green-600" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                      <Upload className="w-12 h-12 mb-2 opacity-50" />
                      <p className="text-sm">
                        You haven't submitted anything yet
                      </p>
                    </div>
                  )}

                  {/* Submit/Edit/Locked Section */}
                  <div className="mt-8">
                    {!isLocked ? (
                      <div className="flex gap-3">
                        <button
                          onClick={() => setOpenSecondModal(true)}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md text-white ${
                            submissionStatus?.files && submissionStatus.files.length > 0
                              ? "bg-amber-500 hover:bg-amber-600"
                              : "bg-green-600 hover:bg-green-700"
                          }`}
                        >
                          <CloudUpload className="w-4 h-4" />
                          {submissionStatus?.files &&
                          submissionStatus.files.length > 0
                            ? "Edit Submission"
                            : "Submit Activity"}
                        </button>
                        <button
                          onClick={() => setConfirmDialogOpen(true)}
                          disabled={
                            !submissionStatus?.submitted ||
                            (submissionStatus.files &&
                              submissionStatus.files.length === 0)
                          }
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Turn In
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 italic">
                        <AlertCircle className="w-5 h-5 text-gray-400" />
                        <span className="text-sm">
                          This activity cannot be edited because it is already
                          turned in.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Submission Modal */}
      {openSecondModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 flex items-center justify-between border-b border-gray-200">
              <div className="flex items-center gap-2">
                <CloudUpload className="w-5 h-5 text-gray-800" />
                <h2 className="text-lg font-bold text-gray-800">
                  {submissionStatus?.files && submissionStatus.files.length > 0
                    ? "Edit Submission"
                    : "Submit Activity"}
                </h2>
              </div>
              <button
                onClick={() => setOpenSecondModal(false)}
                disabled={isSubmitting}
                className="text-gray-600 hover:bg-gray-200 rounded-lg p-1.5 transition-all duration-200 hover:rotate-90 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Error Message */}
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              )}
              {/* File Dropzone */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-6 mb-4 cursor-pointer transition-all duration-200 relative overflow-hidden ${
                  isSubmitting
                    ? "border-blue-300 bg-blue-50/30 cursor-wait"
                    : isDragActive
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                }`}
              >
                <input {...getInputProps()} disabled={isSubmitting} />

                {isSubmitting ? (
                  <div className="flex flex-col items-center gap-3 w-full py-2 animate-[fadeIn_0.3s_ease-out]">
                    <div className="flex items-center justify-between w-full mb-1 px-1">
                      <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                        uploadProgress === 100 ? "text-purple-600" : "text-blue-700"
                      }`}>
                        <div className={`w-2 h-2 rounded-full animate-pulse ${
                          uploadProgress === 100 ? "bg-purple-500" : "bg-blue-500"
                        }`}></div>
                        {uploadProgress === 100 ? "Processing..." : "Uploading Work..."}
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
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 w-full h-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500 font-medium">
                      {uploadProgress === 100 
                        ? "Finalizing submission..." 
                        : "Submitting your files to the instructor..."}
                    </p>
                  </div>
                ) : combinedList.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {combinedList.map((file, index) => (
                      <div
                        key={file.name + index}
                        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg group hover:border-blue-400 transition-all"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {file.kind === "new" &&
                              typeof file.size === "number"
                                ? `${(file.size / 1024).toFixed(1)} KB`
                                : "Existing file"}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (file.kind === "existing") {
                              const existingIndex = existingFiles.findIndex(
                                (f) => f.file_name === file.name
                              );
                              if (existingIndex > -1)
                                handleRemoveExistingFile(existingIndex);
                            }
                            else {
                              const newIndex = newFiles.findIndex(
                                (f) => f.name === file.name
                              );
                              if (newIndex > -1) handleRemoveNewFile(newIndex);
                            }
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <CloudUpload
                      className={`w-12 h-12 mb-3 ${
                        isDragActive ? "text-blue-500" : "text-gray-400"
                      }`}
                    />
                    <p
                      className={`text-sm font-medium mb-1 ${
                        isDragActive ? "text-blue-600" : "text-gray-700"
                      }`}
                    >
                      {isDragActive
                        ? "Drop your files here..."
                        : "Drag & drop files here"}
                    </p>
                    <p className="text-xs text-gray-500">
                      or click to select files
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setOpenSecondModal(false)}
                disabled={isSubmitting}
                className="px-5 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-all duration-200 font-medium hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmSubmission(false)}
                disabled={!hasChanges || isSubmitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialogOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 text-center transform transition-all scale-100">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Turn In Assignment?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to turn in your work? You will not be able
              to make any changes after this.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setConfirmDialogOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmSubmission(true)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-sm hover:shadow-md transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Turning In...
                  </>
                ) : (
                  "Yes, Turn In"
                )}
              </button>
            </div>
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

