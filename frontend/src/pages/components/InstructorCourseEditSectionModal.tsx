import React, { useState } from "react";
import {
  X,
  Edit3,
  BookOpen,
  FileText,
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Save,
  Trash2,
  Pencil,
} from "lucide-react";
import axios from "axios";
import { InstructorCourse_Content as Content } from "../../types/content";
import { InstructorCourse_Section as Section } from "../../types/content";
import { format } from "date-fns";

interface EditSectionState {
  open: boolean;
  title: string;
  description: string;
  section: Section | null;
}

interface Props {
  editSectionState: EditSectionState;
  setEditSectionState: React.Dispatch<React.SetStateAction<EditSectionState>>;
  setSections: React.Dispatch<React.SetStateAction<Section[]>>;
  fetchSections: () => Promise<void>;
  setAddContentModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedSectionId: React.Dispatch<React.SetStateAction<number | null>>;
  handleEditContentClick: (content: Content) => void;
}

export default function InstructorCourseEditSectionModal({
  editSectionState,
  setEditSectionState,
  setSections,
  fetchSections,
  setAddContentModalOpen,
  handleEditContentClick,
  setSelectedSectionId,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteContentConfirm, setShowDeleteContentConfirm] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<Content | null>(null);

  const handleClose = () => {
    setEditSectionState((prev) => ({ ...prev, open: false }));
  };

  const handleSave = async () => {
    if (!editSectionState.section) return;
    setIsLoading(true);

    try {
      await axios.put(
        `${import.meta.env.VITE_API_BASE_URL
        }/api/instructor/put/update-section/${editSectionState.section.section_id
        }/`,
        {
          section_title: editSectionState.title,
          description: editSectionState.description,
        },
        { withCredentials: true }
      );

      setSections((prev) =>
        prev.map((s) =>
          s.section_id === editSectionState.section?.section_id
            ? {
              ...s,
              section_title: editSectionState.title,
              description: editSectionState.description,
            }
            : s
        )
      );

      fetchSections(); // 🔄 Refresh all data from server
      handleClose();
    } catch (err) {
      alert("Failed to update section.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editSectionState.section) return;
    setIsLoading(true);

    try {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL}/api/instructor/delete/section/${editSectionState.section.section_id
        }/`,
        { withCredentials: true }
      );

      setSections((prev) =>
        prev.filter(
          (s) => s.section_id !== editSectionState.section?.section_id
        )
      );

      fetchSections(); // 🔄 Refresh all data from server
      setShowDeleteConfirm(false);
      handleClose();
    } catch (err) {
      alert("Failed to delete section.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteContent = async () => {
    if (!contentToDelete) return;
    setIsLoading(true);

    try {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL}/api/instructor/delete/content/${contentToDelete.content_id
        }/`,
        { withCredentials: true }
      );

      // Update the sections state to remove the deleted content
      setSections((prev) =>
        prev.map((s) =>
          s.section_id === editSectionState.section?.section_id
            ? {
              ...s,
              contents: s.contents?.filter(
                (c) => c.content_id !== contentToDelete.content_id
              ),
            }
            : s
        )
      );

      // Update the editSectionState to reflect the change
      setEditSectionState((prev) => ({
        ...prev,
        section: prev.section
          ? {
            ...prev.section,
            contents: prev.section.contents?.filter(
              (c) => c.content_id !== contentToDelete.content_id
            ),
          }
          : null,
      }));

      fetchSections(); // 🔄 Refresh all data from server
      setShowDeleteContentConfirm(false);
      setContentToDelete(null);
    } catch (err) {
      alert("Failed to delete content.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getContentTypeColor = (type?: string) => {
    switch (type) {
      case "Activity":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "File":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Video":
        return "bg-red-100 text-red-700 border-red-200";
      case "Quiz":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  if (!editSectionState.open) return null;

  const contents = editSectionState.section?.contents || [];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 px-5 py-4 flex items-center justify-between border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-violet-500 rounded-lg p-2">
                <Edit3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Edit Section
                </h2>
                <p className="text-sm text-gray-600">
                  {contents.length} content item
                  {contents.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-600 hover:bg-gray-200 rounded-lg p-1.5 transition-all duration-200 hover:rotate-90"
              disabled={isLoading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            <div className="space-y-5">
              {/* Section Info Form */}
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <BookOpen className="w-4 h-4 text-violet-600" />
                    Section Title
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editSectionState.title}
                    onChange={(e) =>
                      setEditSectionState((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Enter section title"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-sm font-medium text-gray-900 placeholder-gray-400 hover:bg-gray-100"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <FileText className="w-4 h-4 text-violet-600" />
                    Description
                  </label>
                  <textarea
                    value={editSectionState.description}
                    onChange={(e) =>
                      setEditSectionState((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Enter section description"
                    rows={3}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-sm text-gray-900 placeholder-gray-400 hover:bg-gray-100 resize-none"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Section Content */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-violet-600" />
                    Section Content
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedSectionId(
                        editSectionState.section?.section_id ?? null
                      );
                      setAddContentModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Plus className="w-4 h-4" />
                    Add Content
                  </button>
                </div>

                {/* Content Table */}
                {contents.length === 0 ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">
                      No content items yet. Click "Add Content" to get started.
                    </p>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gradient-to-r from-violet-100 to-purple-100 sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                              Title
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                              Type
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                              Due Date
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                              Files
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                              Score
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {contents.map((content) => (
                            <tr
                              key={content.content_id}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td className="px-4 py-3">
                                <p className="text-sm font-medium text-gray-900 max-w-xs truncate">
                                  {content.content_title}
                                </p>
                                {content.content_description && (
                                  <p className="text-xs text-gray-500 max-w-xs truncate">
                                    {content.content_description}
                                  </p>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-block px-2 py-1 rounded-full text-xs font-semibold border ${getContentTypeColor(
                                    content.content_type
                                  )}`}
                                >
                                  {content.content_type}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {content.due_date ? (
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                    <span className="text-sm text-gray-700">
                                      {format(
                                        new Date(content.due_date),
                                        "MMM d, yyyy"
                                      )}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-400">
                                    —
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {content.content_type === "Activity" ? (
                                  content.is_active ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Active
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
                                      <AlertCircle className="w-3.5 h-3.5" />
                                      Overdue
                                    </span>
                                  )
                                ) : (
                                  <span className="text-sm text-gray-400">
                                    —
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {content.files && content.files.length > 0 ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
                                    <FileText className="w-3.5 h-3.5" />
                                    {content.files.length} file
                                    {content.files.length !== 1 ? "s" : ""}
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-400">
                                    None
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm font-medium text-gray-900">
                                  {content.total_score ?? "—"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      handleEditContentClick(content)
                                    }
                                    className="flex items-center justify-center w-8 h-8 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                                    title="Edit content"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setContentToDelete(content);
                                      setShowDeleteContentConfirm(true);
                                    }}
                                    className="flex items-center justify-center w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                                    title="Delete content"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 bg-gradient-to-r from-violet-50 to-purple-50 border-t border-gray-200 flex justify-end items-center flex-shrink-0 gap-3">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <Trash2 className="w-4 h-4" />
              Delete Section
            </button>

            <button
              onClick={handleSave}
              disabled={!editSectionState.title.trim() || isLoading}
              className="flex items-center gap-2 px-5 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
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

      {/* Delete Section Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 px-4 py-3 flex items-center justify-between border-b border-red-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-red-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-800">
                  Confirm Delete Section
                </h2>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isLoading}
                className="text-gray-600 hover:bg-red-100 rounded-lg p-1.5 transition-all duration-200 hover:rotate-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Warning message */}
              <div className="mb-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900 mb-1">
                    Warning: This action cannot be undone
                  </p>
                  <p className="text-sm text-red-800">
                    This will delete the section and all its contents permanently.
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                Are you absolutely sure you want to proceed with this deletion? This will permanently remove the section from the system.
              </p>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isLoading}
                className="group relative overflow-hidden px-5 py-2 bg-red-600 text-white rounded-lg
                 hover:bg-red-700 transition-all duration-200 font-medium shadow-sm
                 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed
                 flex items-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {/* Shine effect */}
                <span
                  className="pointer-events-none absolute inset-0 z-0
                   bg-gradient-to-r from-transparent via-white/30 to-transparent
                   translate-x-[-100%] group-hover:translate-x-[100%]
                   transition-transform duration-1000"
                />

                {/* Content */}
                <span className="relative z-10 flex items-center gap-2">
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Confirm Delete
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Content Confirmation Modal */}
      {showDeleteContentConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 px-4 py-3 flex items-center justify-between border-b border-red-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-red-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-800">
                  Confirm Delete
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowDeleteContentConfirm(false);
                  setContentToDelete(null);
                }}
                disabled={isLoading}
                className="text-gray-600 hover:bg-red-100 rounded-lg p-1.5 transition-all duration-200 hover:rotate-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Warning message */}
              <div className="mb-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900 mb-1">
                    Warning: This action cannot be undone
                  </p>
                  <p className="text-sm text-red-800">
                    This will delete the contents permanently.
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                Are you sure you want to delete this content? This will permanently remove it from the system.
              </p>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleDeleteContent}
                disabled={isLoading}
                className="group relative overflow-hidden px-5 py-2 bg-red-600 text-white rounded-lg
           hover:bg-red-700 transition-all duration-200 font-medium shadow-sm
           hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed
           flex items-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {/* Shine effect */}
                <span
                  className="pointer-events-none absolute inset-0 z-0
             bg-gradient-to-r from-transparent via-white/30 to-transparent
             translate-x-[-100%] group-hover:translate-x-[100%]
             transition-transform duration-1000"
                />

                {/* Content */}
                <span className="relative z-10 flex items-center gap-2">
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}