// InstructorAddSectionModal.tsx
import React, { useState } from "react";
import { X, BookOpen, FileText, Plus } from "lucide-react";
import axios from "axios";
import { InstructorCourse_Section as Section } from "../../types/content";

interface InstructorAddSectionModalProps {
  sectionModalOpen: boolean;
  setSectionModalOpen: (open: boolean) => void;
  newSectionTitle: string;
  setNewSectionTitle: (title: string) => void;
  newSectionDescription: string;
  setNewSectionDescription: (description: string) => void;
  courseId: string | undefined;
  sections: Section[];
  setSections: (sections: Section[]) => void;
  fetchSections: () => Promise<void>;
}

const InstructorAddSectionModal: React.FC<InstructorAddSectionModalProps> = ({
  sectionModalOpen,
  setSectionModalOpen,
  newSectionTitle,
  setNewSectionTitle,
  newSectionDescription,
  setNewSectionDescription,
  courseId,
  sections,
  setSections,
  fetchSections,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setSectionModalOpen(false);
    setError(null);
  };

  const handleCreateSection = async () => {
    if (!newSectionTitle.trim()) return;
    
    setIsLoading(true);
    setError(null);

    try {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/courses/${courseId}/sections/add/`,
        {
          section_title: newSectionTitle,
          description: newSectionDescription,
          order_in_course: sections.length + 1,
        },
        { withCredentials: true }
      );

      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/courses/${courseId}/sections/`,
        { withCredentials: true }
      );
      
      setSections(res.data);
      fetchSections(); // 🔄 Refresh all data (including contents) from server
      setNewSectionTitle("");
      setNewSectionDescription("");
      setSectionModalOpen(false);
    } catch (err) {
      setError("Failed to create section. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!sectionModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="bg-blue-500 rounded-lg p-1.5">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Add New Section</h2>
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
        <div className="p-5 overflow-y-auto max-h-[calc(90vh-160px)]">
          <div className="space-y-4">
            {/* Section Title Input */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                Section Title
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                placeholder="Enter section title"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm font-medium text-gray-900 placeholder-gray-400 hover:bg-gray-100"
                disabled={isLoading}
              />
            </div>

            {/* Description Input */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Description
              </label>
              <textarea
                value={newSectionDescription}
                onChange={(e) => setNewSectionDescription(e.target.value)}
                placeholder="Enter section description (optional)"
                rows={4}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm text-gray-900 placeholder-gray-400 hover:bg-gray-100 resize-none"
                disabled={isLoading}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            {/* Section Order Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                <span className="font-semibold">Order:</span> This section will be added as section #{sections.length + 1}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-gray-200 flex justify-end gap-3">
          {/* <button
            onClick={handleClose}
            className="px-5 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
            disabled={isLoading}
          >
            Cancel
          </button> */}
          <button
            onClick={handleCreateSection}
            disabled={!newSectionTitle.trim() || isLoading}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create Section
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstructorAddSectionModal;