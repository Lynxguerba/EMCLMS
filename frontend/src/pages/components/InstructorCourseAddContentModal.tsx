import React, { useState, useCallback } from "react";
import {
  X,
  Plus,
  FileText,
  Upload,
  Calendar,
  Tag,
  Hash,
  AlertCircle,
  Trash2,
  Clock,
} from "lucide-react";
import axios from "axios";
import { useDropzone } from "react-dropzone";

interface InstructorCourseAddContentModalProps {
  open: boolean;
  onClose: () => void;
  contentType: string;
  setContentType: (value: string) => void;
  dueDate: Date | null;
  setDueDate: (value: Date | null) => void;
  file: File | null;
  setFile: (value: File | null) => void;
  sectionId: number | null;
  onContentAdded: (newContent: any) => void;
}

const InstructorCourseAddContentModal: React.FC<
  InstructorCourseAddContentModalProps
> = ({
  open,
  onClose,
  contentType,
  setContentType,
  dueDate,
  setDueDate,
  setFile,
  sectionId,
  onContentAdded,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [totalScore, setTotalScore] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);

  // Reset state when modal opens
  React.useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setFiles([]);
      setUploadProgress(0);
      setTotalScore("");
      setError(null);
    }
  }, [open]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFiles((prevFiles) => {
        const add = acceptedFiles.filter(
          (nf) => !prevFiles.some((pf) => pf.name === nf.name)
        );
        return [...prevFiles, ...add];
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    disabled: contentType === "Announcement",
  });

  const handleAddContent = async () => {
    setError(null);

    // Validation
    if (!title || !contentType) {
      setError("Please fill in all required fields.");
      return;
    }
    if (contentType === "File" && files.length === 0) {
      setError("Please upload at least one file for 'File' type content.");
      return;
    }
    if (contentType === "Activity" && !totalScore) {
      setError("Please provide a total score for 'Activity' type content.");
      return;
    }
    if (contentType === "Activity" && totalScore) {
      const scoreNum = parseFloat(totalScore);
      if (isNaN(scoreNum)) {
        setError("Total score must be a valid number.");
        return;
      }
      const parts = totalScore.split(".");
      if (parts.length > 1 && parts[1].length > 2) {
        setError("Total score can have at most 2 decimal places.");
        return;
      }
      if (parts[0].length > 8) {
        setError("Total score can have at most 8 digits before the decimal point.");
        return;
      }
    }



    setLoading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("content_title", title);
      formData.append("content_description", description);
      formData.append("content_type", contentType);
      if (dueDate) formData.append("due_date", dueDate.toISOString());
      if (files.length > 0) {
        files.forEach((file) => formData.append("files", file));
      }
      if (!sectionId) {
        setError("No section selected");
        setLoading(false);
        return;
      }
      formData.append("section_id", sectionId.toString());

      if (contentType === "Activity" && totalScore) {
        formData.append("total_score", totalScore);
      }

      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/instructor/post/add-content/`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress(percentCompleted);
            }
          },
        }
      );

      const newContent = res.data;
      onContentAdded(newContent);

      // Reset form
      handleClose();
    } catch (err: any) {
      console.error(err);
      if (
        axios.isAxiosError(err) &&
        err.response &&
        err.response.data &&
        err.response.data.detail
      ) {
        setError(err.response.data.detail);
      } else {
        setError("Failed to add content.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleContentTypeChange = (newType: string) => {
    if (newType === "Announcement") {
      setFiles([]);
      setDueDate(null);
    } else if (newType === "File") {
      setDueDate(null);
    } else if (newType === "Activity") {
      setFiles([]);
    }
    setContentType(newType);
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setFile(null);
    setDueDate(null);
    setContentType("");
    setFiles([]);
    setUploadProgress(0);
    setTotalScore("");
    setError(null);
    onClose();
  };

  const setToToday = () => {
    setDueDate(new Date());
  };

  const formatDateTime = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getContentTypeColor = (type: string) => {
    switch (type) {
      case "Activity":
        return "bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200";
      case "File":
        return "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200";
      case "Announcement":
        return "bg-green-100 text-green-700 border-green-300 hover:bg-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200";
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 px-5 py-4 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-500 rounded-lg p-2">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Add Content</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-600 hover:bg-gray-200 rounded-lg p-1.5 transition-all duration-200 hover:rotate-90"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-medium break-words">{error}</p>
              </div>
            )}

            {/* Title Input */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 text-cyan-600" />
                Title
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter content title"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-sm font-medium text-gray-900 placeholder-gray-400 hover:bg-gray-100"
                disabled={loading}
              />
            </div>

            {/* Description Input */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 text-cyan-600" />
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter content description"
                rows={3}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-sm text-gray-900 placeholder-gray-400 hover:bg-gray-100 resize-none"
                disabled={loading}
              />
            </div>

            {/* Content Type Selection */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Tag className="w-4 h-4 text-cyan-600" />
                Content Type
                <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["Activity", "File", "Announcement"].map((type) => (
                  <button
                    key={type}
                    onClick={() => handleContentTypeChange(type)}
                    disabled={loading}
                    className={`px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all ${
                      contentType === type
                        ? getContentTypeColor(type) + " border-current"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Activity-specific fields */}
            {contentType === "Activity" && (
              <>
                {/* Total Score */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Hash className="w-4 h-4 text-cyan-600" />
                    Total Score
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={totalScore}
                    onChange={(e) => setTotalScore(e.target.value)}
                    placeholder="Enter total score (e.g., 100)"
                    step="0.01"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-sm font-medium text-gray-900 placeholder-gray-400 hover:bg-gray-100"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum 8 digits before decimal, 2 after decimal
                  </p>
                </div>

                {/* Due Date */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 text-cyan-600" />
                    Due Date
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="datetime-local"
                      value={
                        dueDate
                          ? new Date(dueDate.getTime() - dueDate.getTimezoneOffset() * 60000)
                              .toISOString()
                              .slice(0, 16)
                          : ""
                      }
                      onChange={(e) => setDueDate(e.target.value ? new Date(e.target.value) : null)}
                      className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-sm text-gray-900 hover:bg-gray-100"
                      disabled={loading}
                    />
                    <button
                      onClick={setToToday}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2.5 bg-cyan-100 text-cyan-700 border border-cyan-300 rounded-lg hover:bg-cyan-200 transition-all text-sm font-medium"
                    >
                      <Clock className="w-4 h-4" />
                      Now
                    </button>
                  </div>
                  {dueDate && (
                    <p className="text-xs text-gray-600 mt-1">
                      Due: {formatDateTime(dueDate)}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* File Upload (for Activity and File types) */}
            {contentType !== "Announcement" && contentType && (
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Upload className="w-4 h-4 text-cyan-600" />
                  Attach Files
                  {contentType === "File" && <span className="text-red-500">*</span>}
                </label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all relative overflow-hidden ${
                    loading
                      ? "border-cyan-300 bg-cyan-50/30 cursor-wait"
                      : isDragActive
                      ? "border-cyan-500 bg-cyan-50"
                      : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <input {...getInputProps()} disabled={loading} />
                  
                  {loading ? (
                    <div className="flex flex-col items-center gap-3 w-full py-2 animate-[fadeIn_0.3s_ease-out]">
                      <div className="flex items-center justify-between w-full mb-1 px-1">
                        <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                          uploadProgress === 100 ? "text-purple-600" : "text-cyan-700"
                        }`}>
                          <div className={`w-2 h-2 rounded-full animate-pulse ${
                            uploadProgress === 100 ? "bg-purple-500" : "bg-cyan-500"
                          }`}></div>
                          {uploadProgress === 100 ? "Processing..." : "Uploading Content..."}
                        </span>
                        <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                          uploadProgress === 100 ? "text-purple-700 bg-purple-100" : "text-cyan-700 bg-cyan-100"
                        }`}>
                          {uploadProgress}%
                        </span>
                      </div>
                      <div className={`w-full h-2.5 bg-gray-200/50 rounded-full overflow-hidden border shadow-inner relative ${
                        uploadProgress === 100 ? "border-purple-100" : "border-cyan-100"
                      }`}>
                        <div
                          className={`h-full bg-gradient-to-r rounded-full transition-all duration-500 ease-out relative shadow-[0_0_10px_rgba(6,182,212,0.3)] ${
                            uploadProgress === 100 
                              ? "from-purple-500 via-fuchsia-500 to-pink-500" 
                              : "from-cyan-400 via-blue-500 to-indigo-600"
                          }`}
                          style={{ width: `${Math.max(uploadProgress, 5)}%` }}
                        >
                          {/* Shimmer Effect */}
                          <div className="absolute inset-0 w-full h-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium">
                        {uploadProgress === 100 
                          ? "Finalizing content creation..." 
                          : "Processing files. Please wait..."}
                      </p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      {isDragActive ? (
                        <p className="text-sm text-cyan-600 font-medium">
                          Drop your files here...
                        </p>
                      ) : (
                        <div>
                          <p className="text-sm text-gray-700 font-medium mb-1">
                            Drag & drop files here, or click to select
                          </p>
                          <p className="text-xs text-gray-500">
                            Multiple files supported
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* File List */}
                {files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-4 h-4 text-cyan-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(index);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium ml-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-gradient-to-r from-cyan-50 to-blue-50 border-t border-gray-200 flex justify-end gap-3">
          {/* <button
            onClick={handleClose}
            disabled={loading}
            className="px-5 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Cancel
          </button> */}
          <button
            onClick={handleAddContent}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add Content
              </>
            )}
          </button>
        </div>
      </div>
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
    </div>
  );
};

export default InstructorCourseAddContentModal;