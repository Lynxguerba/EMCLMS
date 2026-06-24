import React, { useState, useEffect } from "react";
import { Box, CircularProgress, Avatar } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useLocation, useNavigate } from "react-router-dom";

// Auth Context
import { useAuth } from "../context/AuthContext";
import { useSchoolYear } from "../context/SchoolYearContext";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import { getFileUrl } from "../utils/fileUtils";
import {
 FileText,
 Download,
 ChevronRight,
 BookOpen,
 Users,
 Calendar,
} from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Hooks
import { useInstructorCourses, useInstructorCourseGradesReport } from "../hooks/useQueries";
import { ReportTableSkeleton } from "./components/Skeletons";

interface Course {
 course_id: number;
 course_title: string;
 school_year: string;
}

interface Activity {
 content_id: number;
 content_title: string;
 total_score: number | null;
}

interface SectionColumn {
 section_id: number;
 section_title: string;
 activities: Activity[];
}

interface Grade {
 score: number | null;
 percentage: number | null;
}

interface Student {
 user_id: number;
 first_name: string;
 last_name: string;
 profile_picture: string | null;
 grades: Record<number, Grade>;
}

interface ReportData {
 course: {
  id: number;
  title: string;
  code: string;
 };
 columns: SectionColumn[];
 students: Student[];
}

const InstructorReports = () => {
 const theme = useTheme();
 const location = useLocation();
 const navigate = useNavigate();
 const currentPath = location.pathname;
 const { user, loading: authLoading } = useAuth();

  // Queries
  const { selectedSchoolYear, setSelectedSchoolYear, schoolYears } = useSchoolYear();
  const { data: courses = [] } = useInstructorCourses(selectedSchoolYear);

  const [selectedCourseId, setSelectedCourseId] = useState<number | "">("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

 const { data: reportData, isLoading: reportLoading, error } = useInstructorCourseGradesReport(Number(selectedCourseId), {
  enabled: !!selectedCourseId,
 }) as { data: ReportData | undefined; isLoading: boolean; error: any };

 const handleSidebarToggle = () => {
  setIsSidebarOpen(!isSidebarOpen);
 };

 // Validate session
 useEffect(() => {
  if (authLoading) return;

  if (!user || user.user_type !== "Instructor") {
   navigate("/");
   return;
  }
 }, [user, authLoading, navigate]);

 const filteredCourses =
  selectedSchoolYear && selectedSchoolYear !== "All"
   ? courses.filter((course: Course) => course.school_year === selectedSchoolYear)
   : courses;

 const downloadExcel = () => {
  if (!reportData) return;

  // Prepare headers
  const headers: string[] = ["First Name", "Last Name", "Raw Average Score"];

  reportData.columns.forEach((section: SectionColumn) => {
   section.activities.forEach((activity: Activity) => {
    headers.push(
     `${section.section_title} - ${activity.content_title} (Score)`,
     `${section.section_title} - ${activity.content_title} (Total)`,
     `${section.section_title} - ${activity.content_title} (%)`
    );
   });
  });

  // Prepare data rows
  const rows = reportData.students.map((student: Student) => {
   let totalScore = 0;
   let scoredActivitiesCount = 0;

   reportData.columns.forEach((section: SectionColumn) =>
    section.activities.forEach((activity: Activity) => {
     const grade = student.grades[activity.content_id];
     if (grade && grade.score !== null) {
      totalScore += grade.score;
      scoredActivitiesCount++;
     }
    })
   );

   const average =
    scoredActivitiesCount > 0
     ? (totalScore / scoredActivitiesCount).toFixed(2)
     : "-";

   const row: any[] = [student.first_name, student.last_name, average];

   reportData.columns.forEach((section: SectionColumn) => {
    section.activities.forEach((activity: Activity) => {
     const grade = student.grades[activity.content_id];
     row.push(
      grade?.score !== null ? grade.score : "-",
      activity.total_score !== null ? activity.total_score : "-",
      grade?.percentage !== null ? `${grade.percentage}%` : "-"
     );
    });
   });

   return row;
  });

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Grades Report");

  // Download
  XLSX.writeFile(
   wb,
   `${reportData.course.title}_Grades_Report_${
    new Date().toISOString().split("T")[0]
   }.xlsx`
  );
 };

  const downloadPDF = async () => {
    if (!reportData) return;

    try {
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      
      // Load Header Image
      const img = new Image();
      img.src = "/emc_header.png";
      
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });

      let currentY = 0;

      // Add Header Image (Full width, no margins)
      if (img.complete && img.naturalWidth !== 0) {
        const headerWidth = pageWidth;
        const headerHeight = (150 * headerWidth) / 1030; // Maintain 1030x150 aspect ratio
        doc.addImage(img, "PNG", 0, 0, headerWidth, headerHeight);
        currentY = headerHeight + 12; // Start subsequent content below the header
      } else {
        currentY = 20; // Fallback if image fails
      }

      // Add Header
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(10, 26, 59); // Brand Dark Blue #0a1a3b
      doc.text("Student Grades Report", pageWidth / 2, currentY, { align: "center" });

      // Add Course Info
      currentY += 12;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(51, 65, 85); // Slate-700
      doc.text(`${reportData.course.title} (${reportData.course.code})`, margin, currentY);
      
      currentY += 6;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, currentY);
      doc.text(`Total Students: ${reportData.students.length}`, pageWidth - margin - 35, currentY);

      currentY += 12;

      // ===== 1. CLASS SUMMARY TABLE =====
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(10, 26, 59);
      doc.text("Class Performance Summary", margin, currentY);
      currentY += 6;

      const summaryHeaders = [["Rank", "Student Name", "Average Score", "Status"]];
      
      const summaryData = reportData.students.map((student) => {
        let totalScore = 0;
        let scoredCount = 0;
        reportData.columns.forEach(section => {
          section.activities.forEach(activity => {
            const grade = student.grades[activity.content_id];
            if (grade?.score !== null && grade?.score !== undefined) {
              totalScore += grade.score;
              scoredCount++;
            }
          });
        });
        const average = scoredCount > 0 ? (totalScore / scoredCount) : 0;
        return { 
          name: `${student.first_name} ${student.last_name}`, 
          average: average,
          status: average >= 75 ? "Passing" : "Critical"
        };
      }).sort((a, b) => b.average - a.average);

      autoTable(doc, {
        startY: currentY,
        head: summaryHeaders,
        body: summaryData.map((d, index) => [
          index + 1, 
          d.name, 
          `${d.average.toFixed(2)}%`,
          d.status
        ]),
        margin: { left: margin, right: margin },
        headStyles: { 
          fillColor: [37, 99, 235], // Standard Blue
          textColor: 255,
          fontStyle: "bold",
          fontSize: 10
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
          0: { cellWidth: 20, halign: "center" }, // Increased width to prevent "Rank" from breaking
          2: { fontStyle: "bold", halign: "center", textColor: [37, 99, 235] },
          3: { halign: "center" }
        },
        didDrawPage: (data) => { currentY = data.cursor?.y || 20; }
      });

      // ===== 2. PERFORMANCE CHART =====
      currentY += 15;
      if (currentY + 80 > doc.internal.pageSize.height) {
        doc.addPage();
        currentY = 20;
      }

      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 350;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        const { default: Chart } = await import("chart.js/auto");
        const chart = new Chart(ctx, {
          type: "bar",
          data: {
            labels: summaryData.map(d => d.name.split(" ")[0]),
            datasets: [{
              label: "Average Score (%)",
              data: summaryData.map(d => d.average),
              backgroundColor: "rgba(37, 99, 235, 0.7)",
              borderColor: "rgb(10, 26, 59)",
              borderWidth: 1,
              borderRadius: 4
            }]
          },
          options: {
            responsive: false,
            scales: { 
              y: { 
                beginAtZero: true, 
                max: 100,
                ticks: { font: { size: 10 } }
              },
              x: { ticks: { font: { size: 10 } } }
            },
            plugins: { 
              legend: { display: false },
              title: { 
                display: true, 
                text: "Student Score Distribution",
                color: "#0a1a3b",
                font: { size: 14, weight: "bold" }
              } 
            }
          }
        });

        await new Promise(r => setTimeout(r, 400));
        const chartImage = canvas.toDataURL("image/png");
        doc.addImage(chartImage, "PNG", margin, currentY, pageWidth - (margin * 2), 70);
        currentY += 85;
        chart.destroy();
      }

      // ===== 3. DETAILED VERTICAL STUDENT RECORDS =====
      doc.addPage();
      currentY = 20;
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(10, 26, 59);
      doc.text("Individual Student Detailed Records", margin, currentY);
      currentY += 12;

      reportData.students.forEach((student, sIndex) => {
        if (currentY + 50 > doc.internal.pageSize.height) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(10, 26, 59);
        doc.text(`${sIndex + 1}. ${student.first_name} ${student.last_name}`, margin, currentY);
        
        let sTotal = 0;
        let sCount = 0;
        const studentRows: any[] = [];

        reportData.columns.forEach(section => {
          section.activities.forEach(activity => {
            const grade = student.grades[activity.content_id];
            const score = grade?.score !== null ? grade.score : "-";
            const total = activity.total_score !== null ? activity.total_score : "-";
            const percent = grade?.percentage !== null ? `${grade.percentage}%` : "-";
            
            if (grade?.score !== null) {
              sTotal += grade.score;
              sCount++;
            }

            studentRows.push([
              section.section_title,
              activity.content_title,
              score,
              total,
              percent
            ]);
          });
        });

        const sAvg = sCount > 0 ? (sTotal / sCount).toFixed(2) : "0.00";
        doc.setFontSize(10);
        doc.setTextColor(37, 99, 235);
        doc.text(`Overall Average: ${sAvg}%`, pageWidth - margin - 45, currentY);
        currentY += 5;

        autoTable(doc, {
          startY: currentY,
          head: [["Section", "Activity", "Score", "Total", "Percentage"]],
          body: studentRows,
          margin: { left: margin + 5, right: margin },
          theme: "striped",
          headStyles: { 
            fillColor: [37, 99, 235], // Standard Blue
            textColor: 255,
            fontStyle: "bold"
          },
          styles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 40 },
            2: { halign: "center", fontStyle: "bold" },
            3: { halign: "center" },
            4: { halign: "center", fontStyle: "bold", textColor: [37, 99, 235] }
          },
          didDrawPage: (data) => {
            currentY = (data.cursor?.y || 20) + 12;
          }
        });
      });

      // Add Page Numbers
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: "center" });
        
        // Add subtle footer brand text
        doc.setFontSize(7);
        doc.text("EMC Learning Management System - Student Grade Report", margin, doc.internal.pageSize.height - 10);
      }

      doc.save(`${reportData.course.code}_Detailed_Grades_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("PDF Generation Error:", error);
      alert("Failed to generate PDF. Check console for details.");
    }
  };

 if (authLoading) {
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

 return (
  <Box
   sx={{
    height: "100vh",
    overflowY: "auto",
    backgroundColor: theme.palette.background.default,
   }}
  >
   <Sidebar
    userRole={"instructor"}
    currentPath={currentPath}
    open={isSidebarOpen}
    onClose={handleSidebarToggle}
   />

   <Navbar handleSidebarToggle={handleSidebarToggle} />

   <div className="min-h-screen pt-8 p-4 mt-6 md:-mt-2 md:ml-52">
    {/* Page Header */}
    <div className="mb-8">
     <div className="flex items-center gap-3 mb-2">
      <FileText className="w-6 h-6 text-[#0a1a3b]" />
      <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0a1a3b] via-[#0f2e6b] to-[#0a1a3b] bg-clip-text text-transparent">
       Course Reports
      </h1>
     </div>
     <p className="text-1xl">View and download student grade reports</p>
    </div>

    {/* Main Content Card */}
    <div className="rounded-2xl shadow-xl bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6">
     {/* Filter Bar */}
     <div className="flex flex-col sm:flex-row gap-4 mb-6">
      {/* School Year Filter */}
      <div className="relative min-w-[200px]">
       <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
       <select
        value={selectedSchoolYear}
        onChange={(e) => {
         setSelectedSchoolYear(e.target.value);
         setSelectedCourseId("");
        }}
        className="w-full pl-10 pr-10 py-2.5 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:outline-none transition-colors appearance-none bg-white text-sm font-semibold text-gray-700 cursor-pointer"
       >
        <option value="All">All Semesters</option>
        {schoolYears.map((sy) => (
         <option key={sy.school_year_id} value={sy.school_year}>
          {sy.school_year}
         </option>
        ))}
       </select>
       <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none rotate-90" />
      </div>

      {/* Course Filter */}
      <div className="relative flex-1">
       <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
       <select
        value={selectedCourseId}
        onChange={(e) => setSelectedCourseId(Number(e.target.value))}
        disabled={filteredCourses.length === 0}
        className="w-full pl-10 pr-4 py-2.5 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:outline-none transition-colors appearance-none bg-white cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
       >
        <option value="">Select a course</option>
        {filteredCourses.map((course: Course) => (
         <option key={course.course_id} value={course.course_id}>
          {course.course_title}
         </option>
        ))}
       </select>
       <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none rotate-90" />
      </div>

      {/* Download Buttons */}
      {reportData && (
       <div className="flex gap-2">
        <button
         onClick={downloadExcel}
         className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg font-medium"
        >
         <Download className="w-5 h-5" />
         <span className="hidden sm:inline">Download Excel</span>
        </button>
        <button
         onClick={downloadPDF}
         className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg hover:from-red-600 hover:to-rose-700 transition-all shadow-md hover:shadow-lg font-medium"
        >
         <FileText className="w-5 h-5" />
         <span className="hidden sm:inline">Download PDF</span>
        </button>
       </div>
      )}
     </div>

     {/* Student Count */}
     {reportData && (
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
       <Users className="w-4 h-4" />
       <span>
        {reportData.students.length}{" "}
        {reportData.students.length === 1 ? "student" : "students"}
       </span>
      </div>
     )}

     {/* Error Message */}
     {error && (
      <div className="flex flex-col items-center justify-center py-16 text-red-400">
       <FileText className="w-16 h-16 mb-4 opacity-50" />
       <p className="text-lg font-medium">Error loading report</p>
      </div>
     )}

     {/* No Data Message */}
     {!reportLoading && !reportData && !error && (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
       <FileText className="w-16 h-16 mb-4 opacity-50" />
       <p className="text-lg font-medium">No report selected</p>
       <p className="text-sm">
        Please select a course to view the grade report
       </p>
      </div>
     )}

     {/* Loading Indicator */}
     {reportLoading && (
      <ReportTableSkeleton />
     )}

     {/* Report Table */}
     {!reportLoading && reportData && (
      <div className="overflow-auto max-h-[calc(100vh-250px)] rounded-lg border-2 border-gray-200">
       <table className="w-full text-sm border-separate border-spacing-0">
        <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 sticky top-0 z-20">
         {/* First Header Row - Sections */}
         <tr>
          <th
           rowSpan={3}
           className="sticky left-0 z-34 w-[81px] min-w-[81px] bg-blue-50 px-4 py-3 text-left font-bold text-gray-700 border-b-2 border-r-2 border-gray-300"
          >
           Profile
          </th>
          <th
           rowSpan={3}
           className="sticky left-[80px] z-33 w-[121px] min-w-[121px] bg-blue-50 px-4 py-3 text-left font-bold text-gray-700 border-b-2 border-r-2 border-gray-300"
          >
           First Name
          </th>
          <th
           rowSpan={3}
           className="sticky left-[200px] z-32 w-[121px] min-w-[121px] bg-blue-50 px-4 py-3 text-left font-bold text-gray-700 border-b-2 border-r-2 border-gray-300"
          >
           Last Name
          </th>
          <th
           rowSpan={3}
           className="sticky left-[320px] z-31 w-[101px] min-w-[101px] bg-blue-50 px-4 py-3 text-center font-bold text-gray-700 border-b-2 border-r-2 border-gray-300 whitespace-nowrap"
          >
           Average
          </th>
          {reportData.columns.map((section: SectionColumn) => (
           <th
            key={section.section_id}
            colSpan={section.activities.length * 3}
            className="px-4 py-3 text-center font-bold text-gray-700 border-b-2 border-l-2 border-gray-300 bg-blue-100 whitespace-nowrap"
           >
            {section.section_title}
           </th>
          ))}
         </tr>
         {/* Second Header Row - Activities */}
         <tr>
          {reportData.columns.map((section: SectionColumn) =>
           section.activities.map((activity: Activity) => (
            <th
             key={activity.content_id}
             colSpan={3}
             className="px-4 py-3 text-center font-bold text-gray-700 border-b-2 border-l border-gray-300 bg-blue-50 whitespace-nowrap"
            >
             {activity.content_title}
            </th>
           ))
          )}
         </tr>
         {/* Third Header Row - Score/Total/% */}
         <tr>
          {reportData.columns.map((section: SectionColumn) =>
           section.activities.map((activity: Activity) => (
            <React.Fragment key={activity.content_id}>
             <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border-b-2 border-l border-gray-300 bg-gray-50">
              Score
             </th>
             <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border-b-2 border-gray-300 bg-gray-50">
              Total
             </th>
             <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border-b-2 border-gray-300 bg-gray-50">
              %
             </th>
            </React.Fragment>
           ))
          )}
         </tr>
        </thead>
        <tbody className="bg-white">
         {reportData.students.map((student: Student, index: number) => (
          <tr
           key={student.user_id}
           className={`hover:bg-blue-50 transition-colors ${
            index % 2 === 0 ? "bg-white" : "bg-gray-50"
           }`}
          >
           <td className={`sticky left-0 z-14 w-[81px] min-w-[81px] px-4 py-3 border-b border-r-2 border-gray-200 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
            <Avatar
             src={getFileUrl(student.profile_picture) || undefined}
             alt={student.first_name}
             sx={{ width: 32, height: 32, fontSize: "0.875rem" }}
            >
             {!student.profile_picture &&
              `${student.first_name.charAt(
               0
              )}${student.last_name.charAt(0)}`}
            </Avatar>
           </td>
           <td className={`sticky left-[80px] z-13 w-[121px] min-w-[121px] px-4 py-3 border-b border-r-2 border-gray-200 whitespace-nowrap ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
            {student.first_name}
           </td>
           <td className={`sticky left-[200px] z-12 w-[121px] min-w-[121px] px-4 py-3 border-b border-r-2 border-gray-200 whitespace-nowrap ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
            {student.last_name}
           </td>
           <td className={`sticky left-[320px] z-11 w-[101px] min-w-[101px] px-4 py-3 border-b border-r-2 border-gray-200 text-center font-semibold text-blue-600 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
            {(() => {
             let totalScore = 0;
             let scoredActivitiesCount = 0;
             reportData.columns.forEach((section: SectionColumn) =>
              section.activities.forEach((activity: Activity) => {
               const grade = student.grades[activity.content_id];
               if (grade && grade.score !== null) {
                totalScore += grade.score;
                scoredActivitiesCount++;
               }
              })
             );
             const average =
              scoredActivitiesCount > 0
               ? (totalScore / scoredActivitiesCount).toFixed(2)
               : "-";
             return average;
            })()}
           </td>
           {reportData.columns.map((section: SectionColumn) =>
            section.activities.map((activity: Activity) => {
             const grade = student.grades[activity.content_id];
             return (
              <React.Fragment
               key={`${student.user_id}-${activity.content_id}`}
              >
               <td className="px-3 py-3 border-b border-l border-gray-200 text-center">
                {grade?.score !== null ? grade.score : "-"}
               </td>
               <td className="px-3 py-3 border-b border-gray-200 text-center text-gray-500">
                {activity.total_score !== null
                 ? activity.total_score
                 : "-"}
               </td>
               <td className="px-3 py-3 border-b border-gray-200 text-center font-medium text-blue-600">
                {grade?.percentage !== null
                 ? `${grade.percentage}%`
                 : "-"}
               </td>
              </React.Fragment>
             );
            })
           )}
          </tr>
         ))}
        </tbody>
       </table>
      </div>
     )}
    </div>
   </div>
  </Box>
 );
};

export default InstructorReports;
