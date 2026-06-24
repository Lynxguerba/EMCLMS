// src/components/InstructorCourseSections.tsx
import React, { useState, useEffect } from "react";
import { InstructorCourse_Content as Content } from "../../types/content";
import { InstructorCourse_Section as Section } from "../../types/content";

// MUI
import Avatar from "@mui/material/Avatar";

// Lucide Icons
import {
  Settings,
  CheckCircle,
  FileText,
  File as FileIcon,
  Megaphone,
  CheckCheck,
  AlertCircle,
  Users,
  Search,
  User,
  Mail,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";

// Utils
import { getProfilePictureUrl } from "../../utils/imageUtils";

import InstructorCourseEditSectionModal from "./InstructorCourseEditSectionModal";
import InstructorCourseEditContentModal from "./InstructorCourseEditContentModal";
import InstructorCourseAddContentModal from "./InstructorCourseAddContentModal";
import axios from "axios";
import ContentDeleteConfirmationModal from "./ContentDeleteConfirmationModal";

interface Props {
  sections: Section[];
  setSections: React.Dispatch<React.SetStateAction<Section[]>>;
  fetchSections: () => Promise<void>;
  handleContentClick: (content: Content) => void;
  handleSaveEditedContent: (
    updatedContent: Content,
    newFiles?: File[],
    deletedFileIds?: number[],
    onProgress?: (progress: number) => void
  ) => Promise<void>;
  handleDeleteContent: (contentId: number) => Promise<void>;
  enrolledStudents: any[];
  studentsLoading: boolean;
}

export default function InstructorCourseSections({
  sections,
  setSections,
  fetchSections,
  handleContentClick,
  handleSaveEditedContent,
  handleDeleteContent,
  enrolledStudents,
  studentsLoading,
}: Props) {
  // -1 = Enrolled Students view, null = no selection, positive = section id
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(-1);
  const [studentSearch, setStudentSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const STUDENTS_PER_PAGE = 10;
  const [editContentModalOpen, setEditContentModalOpen] = useState(false);
  const [contentToEdit, setContentToEdit] = useState<Content | null>(null);

  const [addContentModalOpen, setAddContentModalOpen] = useState(false);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [contentType, setContentType] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // State for delete confirmation modal
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
  const [contentToDeleteId, setContentToDeleteId] = useState<number | null>(
    null
  );

  const handleEditContentClick = (content: Content) => {
    setContentToEdit(content);
    setEditContentModalOpen(true);
  };

  // edit-section modal state
  const [editSectionState, setEditSectionState] = useState({
    open: false,
    title: "",
    description: "",
    section: null as Section | null,
  });

  // Set first section as selected when sections load
  useEffect(() => {
    if (sections.length > 0 && !selectedSectionId) {
      setSelectedSectionId(sections[0].section_id);
    }
  }, [sections, selectedSectionId]);

  useEffect(() => {
    if (editSectionState.section) {
      const updatedSection = sections.find(
        (s) => s.section_id === editSectionState.section?.section_id
      );
      if (updatedSection) {
        setEditSectionState((prev) => ({
          ...prev,
          section: updatedSection,
        }));
      }
    }
  }, [sections, editSectionState.section]);

  const selectedSection = sections.find(
    (s) => s.section_id === selectedSectionId
  );

  return (
    <>
      <div className="flex gap-6 min-h-[600px]">
        {/* Left Sidebar - Sections List */}
        <div className="w-full lg:w-1/3 space-y-3">
          {/* Enrolled Students Tab - Always First */}
          <div
            className={`rounded-xl border-2 transition-all duration-300 cursor-pointer ${
              selectedSectionId === -1
                ? "border-blue-500 bg-blue-50 shadow-lg"
                : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
            }`}
            onClick={() => setSelectedSectionId(-1)}
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-sm">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Enrolled Students</h3>
                </div>
                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-sm font-semibold">
                  {enrolledStudents.length}
                </span>
              </div>
            </div>
          </div>

          {sections
            .sort((a, b) => (a.order_in_course ?? 0) - (b.order_in_course ?? 0))
            .map((section) => {
              const isSelected = section.section_id === selectedSectionId;

              return (
                <div
                  key={section.section_id}
                  className={`rounded-xl border-2 transition-all duration-300 ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 shadow-lg"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
                  }`}
                >
                  <div
                    onClick={() => setSelectedSectionId(section.section_id)}
                    className="p-4 cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-bold text-gray-900 flex-1">
                        {section.section_title}
                      </h3>
                      {section.is_completed && (
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditSectionState({
                            open: true,
                            title: section.section_title,
                            description: section.description,
                            section: section,
                          });
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Edit
                      </button>

                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const res = await axios.put(
                              `${
                                import.meta.env.VITE_API_BASE_URL
                              }/api/instructor/sections/${
                                section.section_id
                              }/toggle-completed/`,
                              {},
                              { withCredentials: true }
                            );
                            const { is_completed } = res.data;
                            setSections((prev) =>
                              prev.map((s) =>
                                s.section_id === section.section_id
                                  ? { ...s, is_completed }
                                  : s
                              )
                            );
                          } catch (err) {
                            console.error("Error toggling completion:", err);
                          }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          section.is_completed
                            ? "bg-green-500 text-white hover:bg-green-600"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        {section.is_completed ? "Completed" : "Mark"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Right Content Area */}
        <div className="flex-1 rounded-2xl shadow-xl bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6">
          {selectedSectionId === -1 ? (
            /* Enrolled Students View */
            <>
              <div className="mb-6">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl text-gray-900 mb-2">Enrolled Students</h2>
                    <p className="text-sm text-gray-500">
                      {enrolledStudents.length} {enrolledStudents.length === 1 ? "student" : "students"} enrolled in this course
                    </p>
                  </div>
                </div>
              </div>

              {studentsLoading ? (
                <div className="animate-pulse space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-14 bg-gray-200 rounded-lg" />
                  ))}
                </div>
              ) : (
                <>
                  {/* Search Bar */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search students by name or email..."
                      value={studentSearch}
                      onChange={(e) => { setStudentSearch(e.target.value); setCurrentPage(1); }}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-sm"
                    />
                  </div>

                  {/* Students Table */}
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    {(() => {
                      const filtered = enrolledStudents.filter((s: any) => {
                        const q = studentSearch.toLowerCase();
                        return (
                          s.first_name?.toLowerCase().includes(q) ||
                          s.last_name?.toLowerCase().includes(q) ||
                          s.email?.toLowerCase().includes(q)
                        );
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            {studentSearch ? (
                              <>
                                <Search className="w-12 h-12 mb-3 opacity-50" />
                                <p className="text-center">No students found matching "{studentSearch}"</p>
                              </>
                            ) : (
                              <>
                                <Users className="w-12 h-12 mb-3 opacity-50" />
                                <p className="text-center">No students enrolled yet</p>
                              </>
                            )}
                          </div>
                        );
                      }

                      const totalPages = Math.ceil(filtered.length / STUDENTS_PER_PAGE);
                      const paginatedStudents = filtered.slice(
                        (currentPage - 1) * STUDENTS_PER_PAGE,
                        currentPage * STUDENTS_PER_PAGE
                      );

                      return (
                        <>
                        <table className="min-w-full">
                          <thead className="bg-gradient-to-r from-blue-600 to-indigo-600">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                                Profile
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4" />
                                  First Name
                                </div>
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4" />
                                  Last Name
                                </div>
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                                <div className="flex items-center gap-2">
                                  <Mail className="w-4 h-4" />
                                  Email
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {paginatedStudents.map((student: any, index: number) => (
                              <tr
                                key={student.user_id}
                                className="hover:bg-blue-50 transition-colors duration-150"
                                style={{ animation: `slideInStudent 0.3s ease-out ${index * 0.05}s both` }}
                              >
                                <td className="px-6 py-4">
                                  <Avatar
                                    src={getProfilePictureUrl(student.profile_picture || student.profile_picture_url)}
                                    alt={`${student.first_name} ${student.last_name}`}
                                    sx={{ width: 40, height: 40 }}
                                  >
                                    {`${student.first_name?.[0] ?? ""}${student.last_name?.[0] ?? ""}`}
                                  </Avatar>
                                </td>
                                <td className="px-6 py-4 text-gray-700 font-medium">
                                  {student.first_name}
                                </td>
                                <td className="px-6 py-4 text-gray-700 font-medium">
                                  {student.last_name}
                                </td>
                                <td className="px-6 py-4 text-gray-700">
                                  {student.email}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                          <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                              Showing {(currentPage - 1) * STUDENTS_PER_PAGE + 1}–{Math.min(currentPage * STUDENTS_PER_PAGE, filtered.length)} of {filtered.length} students
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                <ChevronLeft className="w-4 h-4" />
                                Previous
                              </button>
                              <span className="text-sm font-semibold text-gray-700">
                                {currentPage} / {totalPages}
                              </span>
                              <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                Next
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                        </>
                      );
                    })()}
                  </div>

                  {/* slideIn animation */}
                  <style>{`
                    @keyframes slideInStudent {
                      from { opacity: 0; transform: translateX(-20px); }
                      to { opacity: 1; transform: translateX(0); }
                    }
                  `}</style>
                </>
              )}
            </>
          ) : selectedSection ? (
            <>
              {/* Section Header */}
              <div className="mb-6">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl text-gray-900 mb-2 break-words">
                      {selectedSection.section_title}
                    </h2>
                    <p className="text-1xl break-words">{selectedSection.description}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedSection.contents?.length ?? 0} Activities
                    </p>
                  </div>
                </div>

                {selectedSection.is_completed && (
                  <div className="flex items-center gap-1 text-green-600 font-medium text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Section Completed
                  </div>
                )}
              </div>

              {/* Content List */}
              <div className="space-y-3">
                {(selectedSection.contents ?? []).length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <FileIcon className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">No content yet</p>
                    <p className="text-sm">
                      Add activities, announcements, or files to this section
                    </p>
                  </div>
                ) : (
                  (selectedSection.contents ?? [])
                    .sort((a, b) => a.order_in_section - b.order_in_section)
                    .map((content) => (
                      <div
                        key={content.content_id}
                        onClick={() => handleContentClick(content)}
                        className="group cursor-pointer rounded-xl border-2 border-gray-200 bg-white p-4 transition-all duration-300 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100"
                      >
                        <div className="flex items-center gap-3">
                          {/* Icon */}
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                            {content.content_type === "Activity" && (
                              <CheckCircle className="w-5 h-5 text-white" />
                            )}
                            {content.content_type === "Announcement" && (
                              <Megaphone className="w-5 h-5 text-white" />
                            )}
                            {content.content_type === "File" && (
                              <FileIcon className="w-5 h-5 text-white" />
                            )}
                          </div>

                          {/* Content Title */}
                          <span className="flex-1 text-base font-medium text-gray-900 group-hover:text-blue-600 transition-colors min-w-0 break-words">
                            {content.content_title}
                          </span>

                          <div className="flex items-center gap-2">
                            {/* Download Count */}
                            {(content.content_type === "File" || (content.files && content.files.length > 0)) && (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100 shadow-sm">
                                <Download className="w-3.5 h-3.5" />
                                <span>{content.download_count ?? 0}/{content.total_enrolled ?? 0} Downloaded</span>
                              </div>
                            )}

                            {/* Submission Count */}
                            {content.content_type === "Activity" && (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold border border-green-100 shadow-sm">
                                <CheckCheck className="w-3.5 h-3.5" />
                                <span>{content.submission_count ?? 0}/{content.total_enrolled ?? 0} Submitted</span>
                              </div>
                            )}

                            {/* Status Badge */}
                            {!content.is_active && (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-sm font-medium">
                                <AlertCircle className="w-4 h-4" />
                                <span>Overdue</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <FileText className="w-20 h-20 mx-auto mb-4 opacity-30" />
                <p className="text-xl font-medium">No section selected</p>
                <p className="text-sm">Select a section to view its content</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Section Modal */}
      <InstructorCourseEditSectionModal
        editSectionState={editSectionState}
        setEditSectionState={setEditSectionState}
        setSections={setSections}
        fetchSections={fetchSections}
        setAddContentModalOpen={setAddContentModalOpen}
        handleEditContentClick={handleEditContentClick}
        setSelectedSectionId={setSelectedSectionId}
      />

      {/* Add Content Modal */}
      <InstructorCourseAddContentModal
        open={addContentModalOpen}
        onClose={() => setAddContentModalOpen(false)}
        contentType={contentType}
        setContentType={setContentType}
        dueDate={dueDate}
        setDueDate={setDueDate}
        file={file}
        setFile={setFile}
        sectionId={selectedSectionId}
        onContentAdded={(newContent) => {
          if (!selectedSectionId) return;
          setSections((prev) =>
            prev.map((s) =>
              s.section_id === selectedSectionId
                ? { ...s, contents: [...(s.contents || []), newContent] }
                : s
            )
          );
          fetchSections(); // 🔄 Refresh all data from server
        }}
      />

      {/* Edit Content Modal */}
      <InstructorCourseEditContentModal
        open={editContentModalOpen}
        contentToEdit={contentToEdit}
        onContentChange={setContentToEdit}
        onSave={handleSaveEditedContent}
        onDelete={(contentId) => {
          setContentToDeleteId(contentId);
          setDeleteConfirmModalOpen(true);
          setEditContentModalOpen(false);
        }}
        onClose={() => {
          setEditContentModalOpen(false);
          setContentToEdit(null);
        }}
      />

      {/* Delete Confirmation Modal */}
      <ContentDeleteConfirmationModal
        open={deleteConfirmModalOpen}
        onClose={() => {
          setDeleteConfirmModalOpen(false);
          setContentToDeleteId(null);
        }}
        onConfirm={async () => {
          if (contentToDeleteId) {
            await handleDeleteContent(contentToDeleteId);
          }
          setDeleteConfirmModalOpen(false);
          setContentToDeleteId(null);
        }}
        title="Confirm Deletion"
        description="Are you sure you want to delete this content? This action cannot be undone."
      />
    </>
  );
}
