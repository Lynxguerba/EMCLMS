// React and router
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

// Auth Context
import { useAuth } from "../context/AuthContext";

// MUI Core
import { Box, CircularProgress } from "@mui/material";
import { useTheme } from "@mui/material/styles";

// Lucide Icons
import {
 CheckCircle,  
 FileText,
 GraduationCap,
} from "lucide-react";

// Custom Components
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

// Hooks
import { useCourseDetail, useInstructorCourseSectionsWithContent } from "../hooks/useQueries";

interface Content {
 content_id: number;
 content_title: string;
 content_type: "Activity" | "File" | "Announcement";
 due_date: string | null;
 order_in_section: number;
 file_path: string;
 is_active: boolean;
 content_description: string;
}

interface Section {
 section_id: number;
 section_title: string;
 description: string;
 order_in_course: number | null;
 contents?: Content[];
}

export default function InstructorGradeCourse() {
 // ===== Imports & Hooks =====
 const theme = useTheme();
 const { courseId } = useParams();
 const navigate = useNavigate();
 const { user, loading: authLoading } = useAuth();

 // ===== Queries =====
 const { data: course, isLoading: courseLoading } = useCourseDetail(Number(courseId));
 const { data: sections = [], isLoading: sectionsLoading } = useInstructorCourseSectionsWithContent(Number(courseId));

 // ===== State Definitions =====
 const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
 const [sidebarOpen, setSidebarOpen] = useState(false);

 // ===== Effects =====

 // Check user session and role
 useEffect(() => {
  if (authLoading) return;

  if (!user || user.user_type !== "Instructor") {
   navigate("/");
   return;
  }
 }, [user, authLoading, navigate]);

 // Set first section as selected by default when sections load
 useEffect(() => {
  if (sections.length > 0 && selectedSectionId === null) {
   setSelectedSectionId(sections[0].section_id);
  }
 }, [sections, selectedSectionId]);

 // ===== Event Handlers =====

 const toggleSidebar = () => setSidebarOpen((prev) => !prev);

 // Get selected section
 const selectedSection = sections.find(
  (s: Section) => s.section_id === selectedSectionId
 );

 // ===== Loading State =====
 if (authLoading || courseLoading || sectionsLoading)
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

 return (
  <Box
   sx={{
    height: "100vh",
    overflowY: "auto",
    backgroundColor: theme.palette.background.default,
   }}
  >
   {/* Sidebar and Navbar */}
   <Sidebar
    userRole={"instructor"}
    currentPath="/InstructorGrade"
    open={sidebarOpen}
    onClose={toggleSidebar}
   />
   <Navbar handleSidebarToggle={toggleSidebar} />

   <div className="min-h-screen pt-8 p-4 mt-6 md:-mt-2 md:ml-52">
    {/* Course Header */}
    <div className="mb-6">
     <div className="flex items-center gap-3 mb-2">
      <GraduationCap className="w-6 h-6 text-[#0a1a3b]" />
      <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0a1a3b] via-[#0f2e6b] to-[#0a1a3b] bg-clip-text text-transparent">
       Grade: {course?.course_title}
      </h1>
     </div>
    </div>

    {/* Two Column Layout */}
    <div className="flex gap-6">
     {/* Left Column - Sections List */}
     <div className="w-full lg:w-1/3 space-y-3">
      {sections
       .sort((a: Section, b: Section) => (a.order_in_course ?? 0) - (b.order_in_course ?? 0))
       .map((section: Section) => {
        const isSelected = selectedSectionId === section.section_id;
        const activities = (section.contents ?? []).filter(
         (content) => content.content_type === "Activity"
        );

        return (
         <div
          key={section.section_id}
          onClick={() => setSelectedSectionId(section.section_id)}
          className={`rounded-xl border-2 transition-all duration-300 cursor-pointer ${
           isSelected
            ? "border-blue-500 bg-blue-50 shadow-lg"
            : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
          }`}
         >
          <div className="p-4">
           <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-bold text-gray-900 flex-1">
             {section.section_title}
            </h3>
           </div>
           <p className="text-xs text-gray-600 mb-3 line-clamp-2">
            {section.description}
           </p>
           <div className="text-xs text-gray-500">
            {activities.length} {activities.length === 1 ? 'Activity' : 'Activities'}
           </div>
          </div>
         </div>
        );
       })}

      {sections.length === 0 && (
       <div className="text-center py-8 text-gray-400">
        <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No sections found</p>
       </div>
      )}
     </div>

     {/* Right Column - Selected Section Content */}
     <div className="flex-1 rounded-2xl shadow-xl bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6">
      {selectedSection ? (
       <>
        {/* Section Header */}
        <div className="mb-6">
         <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 w-6 h-6 rounded-sm bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg">
           <FileText className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
           {/* <p className="text-sm text-gray-500 mb-1">
            {(selectedSection.contents ?? []).filter(c => c.content_type === "Activity").length} Activities
           </p> */}
           <p className="text-1xl text-gray-900">
            {/* {selectedSection.section_title} */}
            Course Content Activities
           </p>
          </div>
         </div>
        </div>

        {/* Activities List */}
        <div className="space-y-3">
         {(selectedSection.contents ?? [])
          .filter((content: Content) => content.content_type === "Activity")
          .sort((a: Content, b: Content) => a.order_in_section - b.order_in_section)
          .length === 0 ? (
          <div className="text-center py-12 text-gray-400">
           <CheckCircle className="w-16 h-16 mx-auto mb-3 opacity-30" />
           <p className="text-lg font-medium">No activities yet</p>
           <p className="text-sm">This section doesn't have any activities to grade</p>
          </div>
         ) : (
          (selectedSection.contents ?? [])
           .filter((content: Content) => content.content_type === "Activity")
           .sort((a: Content, b: Content) => a.order_in_section - b.order_in_section)
           .map((content: Content) => (
            <div
             key={content.content_id}
             onClick={() =>
              navigate(`/InstructorGrade/content/${content.content_id}`)
             }
             className="group cursor-pointer rounded-xl border-2 border-gray-200 bg-white p-4 transition-all duration-300 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100"
            >
             <div className="flex items-center gap-3">
              {/* Activity Icon */}
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
               <CheckCircle className="w-5 h-5 text-white" />
              </div>

              {/* Activity Title */}
              <span className="flex-1 text-base font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
               {content.content_title}
              </span>

              {/* Arrow Icon */}
              <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
               <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
               >
                <path
                 strokeLinecap="round"
                 strokeLinejoin="round"
                 strokeWidth={2}
                 d="M9 5l7 7-7 7"
                />
               </svg>
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
         <p className="text-sm">Select a section to view its activities</p>
        </div>
       </div>
      )}
     </div>
    </div>
   </div>
  </Box>
 );
}