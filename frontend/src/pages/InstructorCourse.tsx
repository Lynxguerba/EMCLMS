// ================== Imports ==================

// React & Router
import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

// Auth Context
import { useAuth } from "../context/AuthContext";

// Hooks
import { 
  useCourseDetail, 
  useInstructorCourseSectionsWithContent,
  useInstructorCoursesWithStudents
} from "../hooks/useQueries";
import { useQueryClient } from "@tanstack/react-query";

// MUI Core
import { Box, Snackbar, Alert, Collapse } from "@mui/material";
import { useTheme } from "@mui/material/styles";

// Lucide Icons
import { Plus, Users, BookOpen, ChevronDown, Edit, CalendarDays, X } from "lucide-react";

import WeeklyScheduleGrid from "./components/WeeklyScheduleGrid";

// Custom Components
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import InstructorAddSectionModal from "./components/InstructorAddSectionModal";

// import InstructorCourseIntroduction from "./components/InstructorCourseIntroduction";
import InstructorCourseSections from "./components/InstructorCourseSections";
import InstructorCourseEnrollStudentModal from "./components/InstructorCourseEnrollStudentModal";
import InstructorCourseContentModal from "./components/InstructorCourseContentModal";
import InstructorRecommendedBooksTable from "./components/InstructorRecommendedBooksTable";
import { CourseContentSkeleton } from "./components/Skeletons";



// Other libraries
import axios from "axios";

// ================== Types ==================

import { InstructorCourse_Content as Content } from "../types/content";
import { InstructorCourse_Section as Section } from "../types/content";

// ================== Component ==================

export default function InstructorCourse() {
 // ===== Hooks =====
 const theme = useTheme();
 const { courseId } = useParams();
 const navigate = useNavigate();
 const { user, loading: authLoading } = useAuth();
 const queryClient = useQueryClient();

 // ===== TanStack Query Hooks =====
 const { data: course, isLoading: courseLoading } = useCourseDetail(Number(courseId));
 const { 
   data: sectionsWithContent, 
   isLoading: sectionsLoading, 
 } = useInstructorCourseSectionsWithContent(Number(courseId));
 const { data: coursesWithStudents, isLoading: studentsLoading } = useInstructorCoursesWithStudents();

 // --- Enrolled Students for this course ---
 const enrolledStudents = useMemo(() => {
   if (!coursesWithStudents || !courseId) return [];
   const matched = coursesWithStudents.find(
     (c: any) => c.course_id === Number(courseId)
   );
   return matched?.users ?? [];
 }, [coursesWithStudents, courseId]);

 // --- Local State for Sections (to support optimistic updates in child components) ---
 const [sections, setSections] = useState<Section[]>([]);
 useEffect(() => {
   if (sectionsWithContent) {
     setSections(sectionsWithContent);
   }
 }, [sectionsWithContent]);

 // --- UI Toggles ---
 const [sidebarOpen, setSidebarOpen] = useState(false);
 const [modalOpen, setModalOpen] = useState(false);
 const [sectionModalOpen, setSectionModalOpen] = useState(false);
 const [enrollModalOpen, setEnrollModalOpen] = useState(false);
 const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

 const [openBooks, setOpenBooks] = useState(true);

 // --- Content Selection ---
 const [selectedContent, setSelectedContent] = useState<Content | null>(null);
 const [, setSubmission] = useState<any>(null);

 // --- Section & Content Forms ---
 const [newSectionTitle, setNewSectionTitle] = useState("");
 const [newSectionDescription, setNewSectionDescription] = useState("");

 // --- Students for enrollment ---
 const [students, setStudents] = useState<any[]>([]);

 // --- Snackbar State ---
 const [snackbarOpen, setSnackbarOpen] = useState(false);
 const [snackbarMessage, setSnackbarMessage] = useState("");
 const [snackbarSeverity, setSnackbarSeverity] = useState<
  "success" | "error" | "info" | "warning"
 >("success");

 // ================== Effects ==================

 // Validate instructor session
 useEffect(() => {
  if (authLoading) return;
  if (!user || user.user_type !== "Instructor") {
   navigate("/");
  }
 }, [user, authLoading, navigate]);

 // Fetch unenrolled students when enroll modal opens
 useEffect(() => {
  if (!enrollModalOpen || !courseId) return;

  axios
   .get(
    `${
     import.meta.env.VITE_API_BASE_URL
    }/api/instructor/get/all-unenrolled-students/${courseId}/`,
    { withCredentials: true }
   )
   .then((res) => setStudents(res.data))
   .catch((err) => console.error("Error fetching students:", err));
 }, [enrollModalOpen, courseId]);

 // Helper function to refetch sections (invalidation)
 const fetchSections = async () => {
   queryClient.invalidateQueries({ queryKey: ['instructor', 'course-sections-with-content', Number(courseId)] });
 };

 // ================== Event Handlers ==================

 // Toggle sidebar
 const toggleSidebar = () => setSidebarOpen((prev) => !prev);

 // Handle clicking on content item
 const handleContentClick = async (content: Content) => {
  setSelectedContent(content);
  setModalOpen(true);

  if (content.content_type === "Activity") {
   try {
    const res = await axios.get(
     `${import.meta.env.VITE_API_BASE_URL}/api/content/${
      content.content_id
     }/submission/`,
     { withCredentials: true }
    );
    const data = res.data;
    setSubmission(data);
   } catch (err) {
    console.error("Error fetching submission:", err);
    setSubmission(null);
   }
  } else {
   setSubmission(null);
  }
 };

 // Save edited content back to API
 const handleSaveEditedContent = async (
  updatedContent: Content,
  newFiles?: File[],
  deletedFileIds?: number[],
  onProgress?: (progress: number) => void
 ) => {
  try {
   const formData = new FormData();

   formData.append("content_title", updatedContent.content_title);
   formData.append(
    "content_description",
    updatedContent.content_description
   );
   formData.append("content_type", updatedContent.content_type);
   formData.append("due_date", updatedContent.due_date || "");
   formData.append(
    "order_in_section",
    String(updatedContent.order_in_section || "")
   );

   if (
    updatedContent.content_type === "Activity" &&
    updatedContent.total_score
   ) {
    formData.append("total_score", String(updatedContent.total_score));
   }

   // append new uploaded files
   if (newFiles && newFiles.length > 0) {
    newFiles.forEach((file) => formData.append("files", file));
   }

   // append deleted file ids (if any)
   if (deletedFileIds && deletedFileIds.length > 0) {
    formData.append("deleted_file_ids", JSON.stringify(deletedFileIds));
   }

   // send form data to backend
   const res = await axios.put(
    `${
     import.meta.env.VITE_API_BASE_URL
    }/api/instructor/put/update-content/${updatedContent.content_id}/`,
    formData,
    {
     withCredentials: true,
     headers: { "Content-Type": "multipart/form-data" },
     onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
       const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
       );
       onProgress(percentCompleted);
      }
     },
    }
   );

   const savedContent: Content = res.data;

   // 🔄 Update local state so UI reflects changes immediately
   setSections((prevSections) =>
    prevSections.map((section) => ({
     ...section,
     contents: section.contents?.map((c) =>
      c.content_id === savedContent.content_id ? savedContent : c
     ),
    }))
   );

   fetchSections(); // 🔄 Refresh all data from server
  } catch (error) {
   console.error("Error updating content:", error);
  }
 };

 // Delete content
 const handleDeleteContent = async (contentId: number) => {
  try {
   await axios.delete(
    `${
     import.meta.env.VITE_API_BASE_URL
    }/api/instructor/delete/content/${contentId}/`,
    { withCredentials: true }
   );

   // 🔄 Update local state to remove the deleted content
   setSections((prevSections) =>
    prevSections.map((section) => ({
     ...section,
     contents: section.contents?.filter((c) => c.content_id !== contentId),
    }))
   );

   fetchSections(); // 🔄 Refresh all data from server

   // Close the modal (if open)
   setModalOpen(false);

   // Show success snackbar
   setSnackbarMessage("Content deleted successfully!");
   setSnackbarSeverity("success");
   setSnackbarOpen(true);
  } catch (error) {
   console.error("Error deleting content:", error);
   // Show error snackbar
   setSnackbarMessage("Error deleting content.");
   setSnackbarSeverity("error");
   setSnackbarOpen(true);
  }
 };

 // ================== Render ==================

 return (
  <Box
   sx={{
    height: "100vh",
    overflowY: "auto",
    backgroundColor: theme.palette.background.default,
   }}
  >
   {/* Sidebar & Navbar - Always Rendered */}
   <Sidebar
    userRole={"instructor"}
    currentPath="/InstructorCourses"
    open={sidebarOpen}
    onClose={toggleSidebar}
   />
   <Navbar handleSidebarToggle={toggleSidebar} />

   <div className="min-h-screen pt-24 p-4 md:ml-52">
    {authLoading || courseLoading ? (
      <>
        {/* Header Skeleton */}
        <div className="mb-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <CourseContentSkeleton />
      </>
    ) : (
      <>
        {/* Course Introduction */}
        <div className="mb-6">
         <div className="flex items-center gap-3 mb-2">
           <BookOpen className="w-6 h-6 text-[#0a1a3b]" />
           <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0a1a3b] via-[#0f2e6b] to-[#0a1a3b] bg-clip-text text-transparent">
           {course?.course_title}
          </h1>
         </div>
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
           <p className="text-1xl">{course?.description}</p>
           {(course as any)?.schedules && (course as any)?.schedules.length > 0 && (
            <button
              onClick={() => setIsScheduleModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium text-sm shadow-sm hover:shadow-md shrink-0"
            >
              <CalendarDays className="w-4 h-4" />
              View Weekly Schedule
            </button>
           )}
         </div>
        </div>

        {/* Schedule Modal */}
        {isScheduleModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">Weekly Schedule - {course?.course_code}</h2>
                </div>
                <button onClick={() => setIsScheduleModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto bg-gray-50">
                <WeeklyScheduleGrid 
                  events={(course as any).schedules.map((s: any) => ({
                    ...s,
                    title: course?.course_code,
                    subtitle: course?.course_title
                  }))} 
                />
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end bg-white">
                <button 
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recommended Books Section */}
        <div className="mb-6 rounded-2xl shadow-xl bg-gradient-to-br from-gray-50 via-white to-gray-100 overflow-hidden">
         <button
          onClick={() => setOpenBooks(!openBooks)}
          className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
         >
          <div className="flex items-center gap-3">
           <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center shadow-lg">
            <BookOpen className="w-6 h-6 text-white" />
           </div>
           <h3 className="text-2xl text-gray-900">Recommended Books</h3>
          </div>
          <ChevronDown
           className={`w-6 h-6 text-gray-600 transition-transform duration-300 ${
            openBooks ? "rotate-180" : ""
           }`}
          />
         </button>
         <Collapse in={openBooks}>
          <div className="px-6 pb-6">
           {courseId && (
            <InstructorRecommendedBooksTable courseId={Number(courseId)} />
           )}
          </div>
         </Collapse>
        </div>

        {/* Course Stats & Action Buttons */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 p-5 rounded-2xl bg-gradient-to-br from-slate-50 via-white to-indigo-50 shadow-lg border border-slate-100">
         {/* Left — Dynamic Course Info */}
         <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shadow-sm">
            <BookOpen className="w-4 h-4 text-white" />
           </div>
           <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Code</p>
            <p className="text-sm font-bold text-slate-800">{course?.course_code}</p>
           </div>
          </div>

          <div className="w-px h-8 bg-slate-200 hidden md:block" />

          <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-sm">
            <Users className="w-4 h-4 text-white" />
           </div>
           <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Instructor</p>
            <p className="text-sm font-bold text-slate-800">{(course as any)?.instructor_fullname ?? "—"}</p>
           </div>
          </div>

          <div className="w-px h-8 bg-slate-200 hidden md:block" />

          <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-sm">
            <Users className="w-4 h-4 text-white" />
           </div>
           <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Students</p>
            <p className="text-sm font-bold text-slate-800">{(course as any)?.enrolled_student_count ?? 0}</p>
           </div>
          </div>

          <div className="w-px h-8 bg-slate-200 hidden md:block" />

          <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
            <BookOpen className="w-4 h-4 text-white" />
           </div>
           <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Sections</p>
            <p className="text-sm font-bold text-slate-800">{(course as any)?.section_count ?? sections.length}</p>
           </div>
          </div>

          <div className="w-px h-8 bg-slate-200 hidden md:block" />

          <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center shadow-sm">
            <Edit className="w-4 h-4 text-white" />
           </div>
           <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Activities</p>
            <p className="text-sm font-bold text-slate-800">{(course as any)?.activity_count ?? 0}</p>
           </div>
          </div>

          {(course as any)?.school_year && (
           <>
            <div className="w-px h-8 bg-slate-200 hidden md:block" />
            <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-teal-600 flex items-center justify-center shadow-sm">
              <BookOpen className="w-4 h-4 text-white" />
             </div>
             <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">School Year</p>
              <p className="text-sm font-bold text-slate-800">{(course as any).school_year}</p>
             </div>
            </div>
           </>
          )}
         </div>

         {/* Right — Action Buttons */}
         <div className="flex gap-3 shrink-0">
          <button
           onClick={() => setSectionModalOpen(true)}
           className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 text-sm"
          >
           <Plus className="w-4 h-4" />
           Add Section
          </button>
          <button
           onClick={() => setEnrollModalOpen(true)}
           className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 text-sm"
          >
           <Users className="w-4 h-4" />
           Enroll Students
          </button>
         </div>
        </div>

        {/* Course Sections with Sidebar Layout */}
        {sectionsLoading ? (
          <CourseContentSkeleton />
        ) : (
           <InstructorCourseSections
            sections={sections}
            setSections={setSections}
            fetchSections={fetchSections}
            handleContentClick={handleContentClick}
            handleSaveEditedContent={handleSaveEditedContent}
            handleDeleteContent={handleDeleteContent}
            enrolledStudents={enrolledStudents}
            studentsLoading={studentsLoading}
           />
        )}
      </>
    )}
   </div>

   {/* Content modal */}
   <InstructorCourseContentModal
    open={modalOpen}
    onClose={() => setModalOpen(false)}
    selectedContent={selectedContent}
   />

   {/* Add Section modal */}
   <InstructorAddSectionModal
    sectionModalOpen={sectionModalOpen}
    setSectionModalOpen={setSectionModalOpen}
    newSectionTitle={newSectionTitle}
    setNewSectionTitle={setNewSectionTitle}
    newSectionDescription={newSectionDescription}
    setNewSectionDescription={setNewSectionDescription}
    courseId={courseId}
    sections={sections}
    setSections={setSections}
    fetchSections={fetchSections}
   />

   {/* ✨ Enroll Students Modal */}
   <InstructorCourseEnrollStudentModal
    open={enrollModalOpen}
    onClose={() => setEnrollModalOpen(false)}
    students={students}
    courseId={Number(courseId)}
   />



   <Snackbar
    open={snackbarOpen}
    autoHideDuration={6000}
    onClose={() => setSnackbarOpen(false)}
    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
   >
    <Alert
     onClose={() => setSnackbarOpen(false)}
     severity={snackbarSeverity}
     sx={{ width: "100%" }}
    >
     {snackbarMessage}
    </Alert>
   </Snackbar>
      <div className="md:ml-52">
     <Footer />
    </div>
   </Box>
  );
}
