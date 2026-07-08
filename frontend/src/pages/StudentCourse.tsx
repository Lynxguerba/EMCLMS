// React and Hooks
import { useEffect, useState } from "react";

// Auth Context
import { useAuth } from "../context/AuthContext";

// Hooks
import { 
  useStudentCourseDetail, 
  useStudentCourseSections, 
  useStudentContents, 
  queryKeys
} from "../hooks/useQueries";
import { useQueryClient } from "@tanstack/react-query";

// Routing
import { useNavigate, useParams, useLocation } from "react-router-dom";

// MUI Components
import {
 Box,
 Collapse,
 Typography,
} from "@mui/material";

// MUI Styles
import { useTheme } from "@mui/material/styles";

import {
  FileText,
  CheckCircle,
  Megaphone,
  ChevronDown,
  BookOpen,
  Clock,
  CheckCheck,
  XCircle,
  Award,
  CalendarDays,
  X,
} from "lucide-react";

// Custom Components
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import StudentRecommendedBooksTable from "./components/StudentRecommendedBooksTable";
import StudentCourseContentModal from "./components/StudentCourseContentModal";
import { CourseContentSkeleton } from "./components/Skeletons";
import WeeklyScheduleGrid from "./components/WeeklyScheduleGrid";

// Axios for HTTP requests
import axios from "axios";

// Interfaces
interface SectionItem {
 section_id: number;
 course: number;
 section_title: string;
 description: string;
 order_in_course: number;
 created_at: string;
 updated_at: string;
}

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
 files?: string[];
 grade_status?: string | null;
}

interface SubmissionStatus {
 submitted: boolean;
 files: any[];
 score: number | null;
 feedback: string | null;
 status: string | null;
 graded_at: string | null;
 submitted_at: string | null;
}

export default function StudentCourse() {
 const theme = useTheme();
 const { course_id } = useParams();
 const navigate = useNavigate();
 const location = useLocation();
 const { user, loading: authLoading } = useAuth();
 const queryClient = useQueryClient();

 const { sectionId, contentId } =
  (location.state as { sectionId?: number; contentId?: number }) || {};

 // ===== TanStack Query Hooks =====
 const { data: course, isLoading: courseLoading } = useStudentCourseDetail(course_id || "");
 const { data: sections, isLoading: sectionsLoading } = useStudentCourseSections(course_id || "");
 const { data: allContents, isLoading: contentsLoading } = useStudentContents();

 // Filter contents for this course
 const contents = (allContents || []).filter((c: any) => 
   sections?.some((s: any) => s.section_id === c.section)
 );

 // State initialization
 const [isSidebarOpen, setIsSidebarOpen] = useState(false);
 const [openModal, setOpenModal] = useState(false);
 const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
 const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
 const [submissionStatuses, setSubmissionStatuses] = useState<Record<number, SubmissionStatus | null>>({});
 const [openBooks, setOpenBooks] = useState(true);
 const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

 // Function to fetch full submission status (for the modal)
 const fetchSubmissionStatus = async (contentId: number) => {
  try {
    const res = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL}/api/student/content/${contentId}/submission/`,
      { withCredentials: true }
    );
    setSubmissionStatuses((prev) => ({ ...prev, [contentId]: res.data }));
  } catch {
    setSubmissionStatuses((prev) => ({ ...prev, [contentId]: null }));
  }
 };

 const refreshCourseData = () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.studentContents });
  if (selectedContent) {
    fetchSubmissionStatus(selectedContent.content_id);
  }
 };

 const handleSubmit = (
  files: File[],
  contentId: number,
  keepFileIds: number[],
  confirm: boolean = false,
  onProgress?: (progress: number) => void
 ) => {
  const formData = new FormData();
  files.forEach((file) => {
   formData.append("files", file);
  });
  keepFileIds.forEach((id) => {
   formData.append("keep_files", id.toString());
  });
  formData.append("confirm", confirm.toString());

  return axios
   .post(
    `${
     import.meta.env.VITE_API_BASE_URL
    }/api/student/content/${contentId}/submit-files/`,
    formData,
    {
      withCredentials: true,
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    }
   )
   .then(() => {
    refreshCourseData();
   });
 };

 // Side effects and navigation logic
 useEffect(() => {
  if (authLoading) return;
  if (!user || user.user_type !== "Student") {
   navigate("/");
   return;
  }
 }, [user, authLoading, navigate]);

 // Auto-open sections when data loads
 useEffect(() => {
   if (sections && Object.keys(openSections).length === 0) {
    const allSectionsOpen = sections.reduce(
     (acc: Record<string, boolean>, section: SectionItem) => {
      acc[section.section_id] = true;
      return acc;
     },
     {}
    );
    setOpenSections(allSectionsOpen);
   }
 }, [sections, openSections]);

 // Handle navigation from timeline
 useEffect(() => {
   if (contents && contents.length > 0 && contentId && !selectedContent) {
     const selected = contents.find((c: any) => c.content_id === contentId);
     if (selected) {
       setSelectedContent(selected);
       fetchSubmissionStatus(selected.content_id);
       setOpenModal(true);
       if (sectionId) {
         setOpenSections(prev => ({ ...prev, [sectionId]: true }));
       }
     }
   }
 }, [contents, contentId, sectionId, selectedContent]);

 // Sidebar logic
 const currentPath = "/StudentCourses";

 const handleSidebarToggle = () => {
  setIsSidebarOpen(!isSidebarOpen);
 };

 // Section and content handling
 const handleContentClick = (content: ContentItem) => {
  setSelectedContent(content);
  fetchSubmissionStatus(content.content_id);
  setOpenModal(true);
 };

 const handleSectionToggle = (sectionId: string) => {
  setOpenSections((prevState) => ({
   ...prevState,
   [sectionId]: !prevState[sectionId],
  }));
 };

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
     icon: <CheckCheck className="w-4 h-4" />,
    };
   case "Late":
    return {
     label: "Late",
     bgColor: "bg-red-100",
     textColor: "text-red-700",
     icon: <XCircle className="w-4 h-4" />,
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

 return (
  <Box
   sx={{
    height: "100vh",
    overflowY: "auto",
    backgroundColor: theme.palette.background.default,
   }}
  >
   {/* Sidebar and Navbar - Rendered immediately */}
   <Sidebar
    userRole={"student"}
    currentPath={currentPath}
    open={isSidebarOpen}
    onClose={handleSidebarToggle}
   />
   <Navbar handleSidebarToggle={handleSidebarToggle} />

   <div className="min-h-screen pt-8 p-4 mt-6 md:-mt-2 md:ml-52">
    {authLoading || courseLoading ? (
      <>
        {/* Header Skeleton */}
        <div className="mb-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <CourseContentSkeleton />
      </>
    ) : !course ? (
      <Typography
       variant="h4"
       component="h2"
       color={theme.palette.error.main}
       sx={{ textAlign: "center", margin: theme.spacing(2) }}
      >
       Course not found
      </Typography>
    ) : (
      <>
       {/* Course Header */}
       <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
         <BookOpen className="w-6 h-6 text-[#0a1a3b]" />
         <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0a1a3b] via-[#0f2e6b] to-[#0a1a3b] bg-clip-text text-transparent">
          {course.course_title}
         </h1>
        </div>
        <p className="text-1xl">{course.description}</p>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
          <p className="text-sm text-gray-500">Instructor: {course.instructor_fullname}</p>
          {course.schedules && course.schedules.length > 0 && (
            <button
              onClick={() => setIsScheduleModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium text-sm shadow-sm hover:shadow-md"
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
                 <h2 className="text-xl font-bold text-gray-900">Weekly Schedule - {course.course_code}</h2>
               </div>
               <button onClick={() => setIsScheduleModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                 <X className="w-5 h-5" />
               </button>
             </div>
             <div className="p-6 overflow-y-auto bg-gray-50">
               <WeeklyScheduleGrid 
                 events={course.schedules.map((s: any) => ({
                   ...s,
                   title: course.course_code,
                   subtitle: course.course_title
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
          <StudentRecommendedBooksTable courseId={course.course_id} />
         </div>
        </Collapse>
       </div>

       {/* Sections & Contents */}
       {sectionsLoading || contentsLoading ? (
         <CourseContentSkeleton />
       ) : (
        (sections || [])
         .sort((a: any, b: any) => a.order_in_course - b.order_in_course)
         .map((section: any) => {
          const isOpen = openSections[section.section_id] || false;
          return (
           <div
            key={section.section_id}
            className="mb-6 rounded-2xl shadow-xl bg-gradient-to-br from-gray-50 via-white to-gray-100 overflow-hidden"
           >
            <button
             onClick={() =>
              handleSectionToggle(String(section.section_id))
             }
             className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
             <h3 className="text-2xl text-gray-900">
              {section.section_title}
             </h3>
             <ChevronDown
              className={`w-6 h-6 text-gray-600 transition-transform duration-300 ${
               isOpen ? "rotate-180" : ""
              }`}
             />
            </button>

            <Collapse in={isOpen}>
             <div className="px-6 pb-6">
              <p className="text-gray-600 mb-4">
               {section.description}
              </p>

              <div className="space-y-3">
               {contents
                .filter(
                 (content: any) => content.section === section.section_id
                )
                .sort(
                 (a: any, b: any) => a.order_in_section - b.order_in_section
                )
                .map((content: any) => {
                 const statusConfig = getStatusConfig(
                  content.grade_status || null
                 );

                 return (
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
                     {content.content_type ===
                      "Announcement" && (
                      <Megaphone className="w-5 h-5 text-white" />
                     )}
                     {content.content_type === "File" && (
                      <FileText className="w-5 h-5 text-white" />
                     )}
                    </div>

                    {/* Content Title */}
                    <span className="flex-1 text-base font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                     {content.content_title}
                    </span>

                    {/* Status Badge for Activities */}
                    {content.content_type === "Activity" && (
                     <div
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${statusConfig.bgColor} ${statusConfig.textColor} text-sm font-medium`}
                     >
                      {statusConfig.icon}
                      <span>{statusConfig.label}</span>
                     </div>
                    )}
                   </div>
                  </div>
                 );
                })}
              </div>
             </div>
            </Collapse>
           </div>
          );
         })
       )}

       <StudentCourseContentModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        selectedContent={selectedContent}
        submissionStatus={
         selectedContent
          ? submissionStatuses[selectedContent.content_id] || null
          : null
        }
        handleSubmit={handleSubmit}
       />
      </>
    )}
   </div>
    <div className="md:ml-52">
     <Footer />
    </div>
   </Box>
  );
}
