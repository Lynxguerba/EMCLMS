import { useState, useCallback, useEffect } from "react";
import {
  X,
  Save,
  FileText,
  Upload,
  Calendar,
  Tag,
  Hash,
  AlertCircle,
  Trash2,
  Clock,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { InstructorCourse_Content as Content } from "../../types/content";

interface InstructorCourseEditContentModalProps {
  open: boolean;
  contentToEdit: Content | null;
  onContentChange: (updatedContent: Content) => void;
  onSave: (
    content: Content,
    newFiles?: File[],
    deletedFileIds?: number[],
    onProgress?: (progress: number) => void
  ) => Promise<void>;
  onDelete: (contentId: number) => void;
  onClose: () => void;
}

function InstructorCourseEditContentModal({
  open,
  contentToEdit,
  onContentChange,
  onSave,
  onClose,
}: InstructorCourseEditContentModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [deletedFileIds, setDeletedFileIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Reset state when modal opens or contentToEdit changes
  useEffect(() => {
    if (open) {
      setSelectedFiles([]);
      setDeletedFileIds([]);
      setError(null);
    }
  }, [open, contentToEdit?.content_id]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFiles((prevFiles) => [...prevFiles, ...acceptedFiles]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    disabled: contentToEdit?.content_type === "Announcement",
  });

  const handleRemoveNewFile = (index: number) => {
    setSelectedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleRemoveExistingFile = (file: any) => {
    if (!contentToEdit) return;

    if (file && file.id) {
      setDeletedFileIds((prev) => [...prev, file.id]);
      const updatedFiles = (contentToEdit.files || []).filter(
        (f: any) => f.id !== file.id
      );
      onContentChange({ ...contentToEdit, files: updatedFiles });
    } else {
      console.warn("File missing id, cannot delete:", file);
    }
  };

  const handleContentTypeChange = (newType: string) => {
    if (!contentToEdit) return;

    let updatedContent = { ...contentToEdit, content_type: newType } as Content;

    if (newType === "Announcement") {
      updatedContent = {
        ...updatedContent,
        files: [],
        due_date: null,
      };
      setSelectedFiles([]);
      setDeletedFileIds([]);
    } else if (newType === "File") {
      updatedContent = {
        ...updatedContent,
        due_date: null,
      };
    } else if (newType === "Activity") {
      updatedContent = {
        ...updatedContent,
        files: [],
      };
      setSelectedFiles([]);
      setDeletedFileIds([]);
    }

    onContentChange(updatedContent);
  };

  const handleSave = async () => {
    if (contentToEdit) {
      if (
        contentToEdit.content_type === "File" &&
        (contentToEdit.files || []).length === 0 &&
        selectedFiles.length === 0
      ) {
        setError("Please upload at least one file for 'File' type content.");
        return;
      }
      if (
        contentToEdit.content_type === "Activity" &&
        (contentToEdit.total_score === null ||
          contentToEdit.total_score === undefined)
      ) {
        setError("Please provide a total score for 'Activity' type content.");
        return;
      }

      setLoading(true);
      setUploadProgress(0);

      try {
        await onSave(
          contentToEdit,
          selectedFiles,
          deletedFileIds,
          (progress) => setUploadProgress(progress)
        );
        onClose();
      } catch (err) {
        console.error("Failed to save content", err);
        setError("Failed to save changes. Please try again.");
      } finally {
        setLoading(false);
        setUploadProgress(0);
      }
    }
  };

  const setToToday = () => {
    if (contentToEdit) {
      onContentChange({
        ...contentToEdit,
        due_date: new Date().toISOString(),
      });
    }
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return "";
    return new Date(date).toLocaleString("en-US", {
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

  if (!open || !contentToEdit) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 px-5 py-4 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-500 rounded-lg p-2">
              <Save className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Edit Content</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:bg-gray-200 rounded-lg p-1.5 transition-all duration-200 hover:rotate-90"
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
                value={contentToEdit.content_title}
                onChange={(e) =>
                  onContentChange({ ...contentToEdit, content_title: e.target.value })
                }
                placeholder="Enter content title"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-sm font-medium text-gray-900 placeholder-gray-400 hover:bg-gray-100"
              />
            </div>

            {/* Description Input */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 text-cyan-600" />
                Description
              </label>
              <textarea
                value={contentToEdit.content_description}
                onChange={(e) =>
                  onContentChange({
                    ...contentToEdit,
                    content_description: e.target.value,
                  })
                }
                placeholder="Enter content description"
                rows={3}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-sm text-gray-900 placeholder-gray-400 hover:bg-gray-100 resize-none"
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
                    className={`px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all ${
                      contentToEdit.content_type === type
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
            {contentToEdit.content_type === "Activity" && (
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
                    value={
                      contentToEdit.total_score !== null &&
                      contentToEdit.total_score !== undefined
                        ? String(contentToEdit.total_score)
                        : ""
                    }
                    onChange={(e) =>
                      onContentChange({
                        ...contentToEdit,
                        total_score:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    placeholder="Enter total score (e.g., 100)"
                    step="0.01"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-sm font-medium text-gray-900 placeholder-gray-400 hover:bg-gray-100"
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
                        contentToEdit.due_date
                          ? new Date(
                              new Date(contentToEdit.due_date).getTime() -
                                new Date(contentToEdit.due_date).getTimezoneOffset() * 60000
                            )
                              .toISOString()
                              .slice(0, 16)
                          : ""
                      }
                      onChange={(e) =>
                        onContentChange({
                          ...contentToEdit,
                          due_date: e.target.value ? new Date(e.target.value).toISOString() : null,
                        })
                      }
                      className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-sm text-gray-900 hover:bg-gray-100"
                    />
                    <button
                      onClick={setToToday}
                      className="flex items-center gap-2 px-4 py-2.5 bg-cyan-100 text-cyan-700 border border-cyan-300 rounded-lg hover:bg-cyan-200 transition-all text-sm font-medium"
                    >
                      <Clock className="w-4 h-4" />
                      Now
                    </button>
                  </div>
                  {contentToEdit.due_date && (
                    <p className="text-xs text-gray-600 mt-1">
                      Due: {formatDateTime(contentToEdit.due_date)}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* File Upload (for Activity and File types) */}
            {contentToEdit.content_type !== "Announcement" && (
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Upload className="w-4 h-4 text-cyan-600" />
                  Attach Files
                  {contentToEdit.content_type === "File" && <span className="text-red-500">*</span>}
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
                          {uploadProgress === 100 ? "Processing..." : "Uploading Changes..."}
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
                          ? "Finalizing updates..." 
                          : "Syncing your content updates..."}
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
                {((contentToEdit.files || []).length > 0 || selectedFiles.length > 0) && (
                  <div className="mt-3 space-y-2">
                    {/* Existing Files */}
                    {(contentToEdit.files || []).map((f: any, index: number) => {
                      const filename = f.file
                        ? f.file.split("/").pop()
                        : f.split("/").pop();

                      return (
                        <div
                          key={f.id || filename || index}
                          className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="w-4 h-4 text-cyan-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {filename}
                              </p>
                              <p className="text-xs text-gray-500">Existing file</p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveExistingFile(f);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium ml-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        </div>
                      );
                    })}

                    {/* New Files */}
                    {selectedFiles.map((file, index) => (
                      <div
                        key={file.name + index}
                        className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-blue-600">
                              New file ({(file.size / 1024).toFixed(1)} KB)
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveNewFile(index);
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
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
}

export default InstructorCourseEditContentModal;