import { Box, CircularProgress } from "@mui/material";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// Auth Context
import { useAuth } from "../context/AuthContext";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import TableItemsPerPage from "../components/TableItemsPerPage";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
 BarChart3,
 FileText,
 Eye,
 ChevronLeft,
 ChevronRight,
 PieChart,
 BarChart,
} from "lucide-react";
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement,
  BarController,
  PieController,
  DoughnutController,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarController,
  PieController,
  DoughnutController
);

// Hooks
import { useAdminSchoolYears, useAdminAllInstructors } from "../hooks/useQueries";
import { ReportTableSkeleton } from "./components/Skeletons";

interface ReportOption {
 id: string;
 title: string;
 description: string;
 endpoint: string;
 hasFilters?: boolean;
 dataEndpoint?: string;
}

const ChartPreviewCanvas = ({ type, labels, data, colors }: { type: string, labels: string[], data: number[], colors: string[] }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // Final safety check to ensure canvas is clean
    const existingChart = ChartJS.getChart(canvasRef.current);
    if (existingChart) {
      existingChart.destroy();
    }

    chartRef.current = new ChartJS(ctx, {
      type: type as any,
      data: {
        labels: labels,
        datasets: [{
          label: 'Count',
          data: data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: type === 'bar' ? colors.slice(0, labels.length).map((c: string) => c) : '#ffffff',
          borderWidth: 1,
          borderRadius: type === 'bar' ? 6 : 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: type !== 'bar',
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: { size: 11 }
            }
          },
          tooltip: {
            padding: 12,
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            cornerRadius: 8,
          }
        },
        animation: {
          duration: 400 // Short, snappy animation
        },
        scales: type === 'bar' ? {
          y: {
            beginAtZero: true,
            grid: { display: true, color: '#f1f5f9' },
            ticks: { precision: 0 }
          },
          x: {
            grid: { display: false }
          }
        } : {}
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [type, labels, data, colors]);

  return <canvas ref={canvasRef} />;
};

export default function AdminReports() {
 const navigate = useNavigate();
 const { user, loading: authLoading } = useAuth();

 // State: track sidebar visibility
 const [isSidebarOpen, setIsSidebarOpen] = useState(false);
 const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);

 // Queries
 const { data: schoolYearOptions = [] } = useAdminSchoolYears();
 const { data: instructorOptions = [] } = useAdminAllInstructors();

 // State: selected report and filters
 const [selectedReport, setSelectedReport] = useState<string>("");
 const [filters, setFilters] = useState({
  year: "",
  semester: "",
  status: "",
  instructor: "",
 });

 // State: table data (Keep manual fetch for now due to complex mapping logic)
 const [tableData, setTableData] = useState<any[]>([]);
 const [dataLoading, setDataLoading] = useState(false);
 const [currentPage, setCurrentPage] = useState(1);
 const [itemsPerPage, setItemsPerPage] = useState(10);
 
 // State: Chart settings
 const [showChart, setShowChart] = useState(true);
 const [chartType, setChartType] = useState<"bar" | "pie" | "doughnut">("bar");
 const [selectedChartColumn, setSelectedChartColumn] = useState<string>("");

 // Available reports
 const reportOptions: ReportOption[] = [
  {
   id: "all-users",
   title: "All Users",
   description: "Complete list of all users in the system",
   endpoint: "get/allusers-report/",
   dataEndpoint: "get/all-rows/?table=User",
  },
  {
   id: "all-courses",
   title: "All Courses",
   description: "Complete list of all courses with details",
   endpoint: "get/allcourses-report/",
   hasFilters: true,
   dataEndpoint: "get-all-courses-with-instructor-fullnames/",
  },
  {
   id: "all-enrollments",
   title: "All Enrollments",
   description: "Student enrollment records",
   endpoint: "get/allenrollments-report/",
   dataEndpoint: "get/all-rows/?table=Enrollment",
  },
  {
   id: "password-reset",
   title: "Password Reset Requests",
   description: "History of password reset requests",
   endpoint: "get/passwordresetrequests-report/",
   dataEndpoint: "get/all-rows/?table=PasswordReset",
  },
  {
   id: "student-logs",
   title: "Student Logs",
   description: "Activity logs for all students",
   endpoint: "get/studentlogs-report/",
   dataEndpoint: "get/all-rows/?table=StudentLog",
  },
  {
   id: "faculty-logs",
   title: "Faculty Logs",
   description: "Activity logs for all faculty members",
   endpoint: "get/facultylogs-report/",
   dataEndpoint: "get/all-rows/?table=InstructorLog",
  },
  {
   id: "books-data",
   title: "Books Data",
   description: "Library books inventory and status",
   endpoint: "get/booksdata-report/",
   dataEndpoint: "get/all-rows/?table=Book",
  },
 ];

 // Effect: verify session
 useEffect(() => {
  if (authLoading) return;

  if (!user || (user.user_type !== "Administrator" && user.user_type !== "Superadmin")) {
   navigate("/");
   return;
  }
 }, [user, authLoading, navigate]);

 // Fetch table data when report is selected
 const fetchTableData = () => {
  if (!selectedReport) return;

  const report = reportOptions.find((r) => r.id === selectedReport);
  if (!report) return;

  setDataLoading(true);

  // Build query parameters for filters
  const params = new URLSearchParams();
  if (report.hasFilters) {
   if (filters.year) params.append("year", filters.year);
   if (filters.semester) params.append("semester", filters.semester);
   if (filters.status) params.append("status", filters.status);
  }

  // Special handling for "all-courses" to support advanced filtering without backend changes
  if (selectedReport === "all-courses") {
   Promise.all([
    // Fetch Courses
    axios.get(
     `${
      import.meta.env.VITE_API_BASE_URL
     }/api/admin/get-all-courses-with-instructor-fullnames/`,
     { withCredentials: true }
    ),
    // Fetch Sections (to determine status)
    axios.get(
     `${
      import.meta.env.VITE_API_BASE_URL
     }/api/admin/get/all-rows/?table=Section`,
     { withCredentials: true }
    ),
   ])
    .then(([coursesRes, sectionsRes]) => {
     let courses = Array.isArray(coursesRes.data) ? coursesRes.data : [];
     const sections = Array.isArray(sectionsRes.data)
      ? sectionsRes.data
      : [];

     // Map sections to course IDs
     const courseSectionsMap: Record<number, any[]> = {};
     sections.forEach((sec: any) => {
      if (!courseSectionsMap[sec.course_id]) {
       courseSectionsMap[sec.course_id] = [];
      }
      courseSectionsMap[sec.course_id].push(sec);
     });

     // Filter courses
     courses = courses.filter((course: any) => {
      // 1. Filter by Year
      if (filters.year && course.school_year) {
       if (course.school_year !== filters.year) return false;
      }

      // 2. Filter by Instructor
      if (filters.instructor) {
       if (course.instructor_name !== filters.instructor) return false;
      }

      // 3. Filter by Status (Calculated)
      if (filters.status && filters.status !== "All Status") {
       const courseSecs = courseSectionsMap[course.course_id] || [];
       const isCompleted =
        courseSecs.length > 0 &&
        courseSecs.every((s) => s.is_completed);

       if (filters.status === "Completed" && !isCompleted) return false;
       if (filters.status === "Ongoing" && isCompleted) return false;
      }

      return true;
     });

     // Clean up columns
     const cleanData = courses.map((course: any) => {
      const { course_id, school_year_id, ...rest } = course;
      return rest;
     });

     setTableData(cleanData);
     setCurrentPage(1);
    })
    .catch((err) => {
     console.error("Failed to fetch all-courses data:", err);
     setTableData([]);
    })
    .finally(() => setDataLoading(false));

   return; // Exit, we handled it
  }

  // Special handling for "all-enrollments" to map IDs to names
  if (selectedReport === "all-enrollments") {
   Promise.all([
    axios.get(
     `${
      import.meta.env.VITE_API_BASE_URL
     }/api/admin/get/all-rows/?table=Enrollment`,
     { withCredentials: true }
    ),
    axios.get(
     `${
      import.meta.env.VITE_API_BASE_URL
     }/api/admin/get/all-rows/?table=Course`,
     { withCredentials: true }
    ),
    axios.get(
     `${
      import.meta.env.VITE_API_BASE_URL
     }/api/admin/get/all-rows/?table=User`,
     { withCredentials: true }
    ),
   ])
    .then(([enrollRes, courseRes, userRes]) => {
     const enrollments = Array.isArray(enrollRes.data)
      ? enrollRes.data
      : [];
     const courses = Array.isArray(courseRes.data) ? courseRes.data : [];
     const users = Array.isArray(userRes.data) ? userRes.data : [];

     const courseMap = new Map(
      courses.map((c: any) => [c.course_id, c.course_title])
     );
     const userMap = new Map(
      users.map((u: any) => [u.user_id, `${u.first_name} ${u.last_name}`])
     );

     const mappedData = enrollments.map((enrollment: any) => ({
      enrollment_date: enrollment.enrollment_date,
      course: courseMap.get(enrollment.course_id) || "Unknown Course",
      student: userMap.get(enrollment.student_id) || "Unknown Student",
     }));

     setTableData(mappedData);
     setCurrentPage(1);
    })
    .catch((err) => {
     console.error("Failed to fetch all-enrollments data:", err);
     setTableData([]);
    })
    .finally(() => setDataLoading(false));

   return;
  }

  // Special handling for "student-logs" and "faculty-logs" to map user IDs to names
  if (
   selectedReport === "student-logs" ||
   selectedReport === "faculty-logs"
  ) {
   const isStudent = selectedReport === "student-logs";
   const logTable = isStudent ? "StudentLog" : "InstructorLog";
   const idField = isStudent ? "student_id" : "instructor_id";

   Promise.all([
    axios.get(
     `${
      import.meta.env.VITE_API_BASE_URL
     }/api/admin/get/all-rows/?table=${logTable}`,
     { withCredentials: true }
    ),
    axios.get(
     `${
      import.meta.env.VITE_API_BASE_URL
     }/api/admin/get/all-rows/?table=User`,
     { withCredentials: true }
    ),
   ])
    .then(([logsRes, userRes]) => {
     const logs = Array.isArray(logsRes.data) ? logsRes.data : [];
     const users = Array.isArray(userRes.data) ? userRes.data : [];
     const userMap = new Map(
      users.map((u: any) => [u.user_id, `${u.first_name} ${u.last_name}`])
     );

     const mappedData = logs.map((log: any) => ({
      timestamp: new Date(log.timestamp).toLocaleString(),
      [isStudent ? "student" : "instructor"]:
       userMap.get(log[idField]) ||
       (isStudent ? "Unknown Student" : "Unknown Instructor"),
      message: log.message,
     }));

     setTableData(mappedData);
     setCurrentPage(1);
    })
    .catch((err) => {
     console.error(`Failed to fetch ${selectedReport} data:`, err);
     setTableData([]);
    })
    .finally(() => setDataLoading(false));

   return;
  }

  let url = "";
  if (report.dataEndpoint) {
   url = `${import.meta.env.VITE_API_BASE_URL}/api/admin/${
    report.dataEndpoint
   }`;
  } else {
   params.append("format", "json"); // Request JSON for table display
   const queryString = params.toString();
   url = `${import.meta.env.VITE_API_BASE_URL}/api/admin/${report.endpoint}${
    queryString ? `?${queryString}` : ""
   }`;
  }

  axios
   .get(url, { withCredentials: true })
   .then((res) => {
    let data = Array.isArray(res.data) ? res.data : [];

    // Post-processing for All Users to remove sensitive data and unwanted columns
    if (selectedReport === "all-users") {
     data = data.map((user: any) => {
      // Remove password_hash and unwanted columns
      const {
       password_hash,
       created_at,
       updated_at,
       profile_picture,
       last_online,
       ...rest
      } = user;
      return rest;
     });
    } else if (selectedReport === "password-reset") {
     data = data.map((request: any) => {
      const { password_reset_id, created_at, updated_at, ...rest } =
       request;
      return rest;
     });
    } else if (selectedReport === "books-data") {
     data = data.map((book: any) => {
      const { no, embedding, file_path, ...rest } = book;
      return rest;
     });
    } else if (selectedReport === "all-courses") {
     data = data
      .filter((course: any) => {
       // Client-side filtering
       if (filters.year && course.school_year) {
        // Simple check if year string contains the filter year
        if (!String(course.school_year).includes(filters.year))
         return false;
       }
       // Note: Semester and Status are not returned by this endpoint, so we can't filter by them.
       return true;
      })
      .map((course: any) => {
       const { course_id, school_year_id, ...rest } = course;
       return rest;
      });
    }

    setTableData(data);
    setCurrentPage(1);
   })
   .catch((err) => {
    console.error("Failed to fetch table data:", err);
    setTableData([]);
   })
   .finally(() => setDataLoading(false));
 };

 // Effect: fetch data when report or filters change
 useEffect(() => {
  if (selectedReport) {
   fetchTableData();
  } else {
   setTableData([]);
  }
 }, [selectedReport, filters]);

 // Reset filters
 const handleResetFilters = () => {
  setFilters({
   year: "",
   semester: "",
   status: "",
   instructor: "",
  });
 };

 const getCategoricalColumns = () => {
   if (tableData.length === 0) return [];
   const columns = getTableColumns();
   return columns.filter(col => {
     const uniqueValues = new Set(tableData.map(row => String(row[col] ?? "—")));
     return uniqueValues.size > 1 && uniqueValues.size <= 15;
   });
 };

 const getFrequencyData = (column: string) => {
   if (!column || tableData.length === 0) return { labels: [], data: [] };
   const freq: Record<string, number> = {};
   tableData.forEach(row => {
     const val = row[column] === null || row[column] === undefined ? "—" : String(row[column]);
     freq[val] = (freq[val] || 0) + 1;
   });
   const entries = Object.entries(freq).sort((a, b) => b[1] - a[1]);
   return {
     labels: entries.map(e => e[0]),
     data: entries.map(e => e[1])
   };
 };

 useEffect(() => {
   if (tableData.length > 0 && !selectedChartColumn) {
     const categoricalCols = getCategoricalColumns();
     if (categoricalCols.length > 0) {
       setSelectedChartColumn(categoricalCols[0]);
     }
   }
 }, [tableData, selectedChartColumn]);

 // --- new: helpers to generate Excel and PDF reports (uses tableData & selectedReport) ---
 const generateReportTitle = () => {
  const base =
   reportOptions.find((r) => r.id === selectedReport)?.title || "Report";
  const parts: string[] = [];
  if (filters.year) parts.push(`Year: ${filters.year}`);
  if (filters.semester) parts.push(`Semester: ${filters.semester}`);
  if (filters.status) parts.push(`Status: ${filters.status}`);
  if (filters.instructor) parts.push(`Instructor: ${filters.instructor}`);
  return `${base}${parts.length ? " - " + parts.join(" | ") : ""}`;
 };

 const getTableColumns = () => {
  if (tableData.length === 0) return [];
  const firstRow = tableData[0];
  return Object.keys(firstRow);
 };

 const downloadExcel = () => {
  if (!selectedReport) return;
  if (!tableData || tableData.length === 0) return;

  try {
   const title = `${generateReportTitle()} (${new Date().toLocaleDateString()})`;
   const columns = getTableColumns();
   const headers = columns.map((c) =>
    c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
   );

   const rows = tableData.map((row) => columns.map((col) => row[col] ?? ""));

   const ws = XLSX.utils.aoa_to_sheet([[title], [], headers, ...rows]);

   // Merge title row across all header columns
   ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
   ];

   // Auto-size columns based on content
   const colWidths = headers.map((header, i) => {
    const headerWidth = header.length;
    const maxDataWidth = Math.max(
     ...rows.map((r) => String(r[i] ?? "").length),
     0
    );
    return { wch: Math.max(headerWidth, maxDataWidth, 10) };
   });
   ws["!cols"] = colWidths;

   const wb = XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(wb, ws, selectedReport || "Report");

   let filename = `${selectedReport || "report"}_${
    new Date().toISOString().split("T")[0]
   }.xlsx`;
   XLSX.writeFile(wb, filename);
  } catch (err) {
   console.error("Failed to generate Excel report:", err);
  }
 };

 const downloadPDF = () => {
  if (!selectedReport) return;
  if (!tableData || tableData.length === 0) return;

  try {
   const title = generateReportTitle();
   const doc = new jsPDF("p", "mm", "a4");
   const pageWidth = doc.internal.pageSize.getWidth();

   const chartCol = selectedChartColumn || getCategoricalColumns()[0];
   const { labels, data } = getFrequencyData(chartCol);

   const createChartDataUrl = async (): Promise<string | null> => {
    if (!chartCol || labels.length === 0) return null;
    try {
     const canvas = document.createElement("canvas");
     canvas.width = 1200;
     canvas.height = 600;
     const ctx = canvas.getContext("2d");
     if (!ctx) return null;
     const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#F97316", "#EC4899", "#14B8A6", "#6366F1"];
     const chart = new ChartJS(ctx, {
      type: chartType as any,
      data: {
       labels,
       datasets: [{
        label: "Count",
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: chartType === "bar" ? colors.slice(0, labels.length) : "#ffffff",
        borderWidth: 1,
       }],
      },
      options: {
       animation: false,
       plugins: {
        legend: { 
          display: chartType !== "bar", 
          position: "right",
          labels: { font: { size: 12 } }
        },
        title: {
         display: true,
         text: `${chartCol.replace(/_/g, " ")} Distribution`,
         padding: 10,
         font: { size: 16, weight: "bold" },
        },
       },
       responsive: false,
       maintainAspectRatio: false,
      },
     });
     await new Promise((res) => setTimeout(res, 150));
     const dataUrl = canvas.toDataURL("image/png", 1.0);
     chart.destroy();
     return dataUrl;
    } catch (error) {
     console.error("Error generating PDF chart:", error);
     return null;
    }
   };

   const addTableAndSave = (docInstance: any, startY: number) => {
    const cols = getTableColumns();
    const head = [cols.map((c) => c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()))];
    const body = tableData.map((row) => cols.map((c) => (row[c] ?? "").toString()));
    autoTable(docInstance, {
     head,
     body,
     startY,
     styles: { fontSize: 8, cellPadding: 2.5 },
     headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
     alternateRowStyles: { fillColor: [248, 250, 252] },
     margin: { left: 10, right: 10 },
    });
    const pageCount = docInstance.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
     docInstance.setPage(i);
     docInstance.setFontSize(8);
     docInstance.setTextColor(100);
     docInstance.text(`Page ${i} of ${pageCount} | Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, docInstance.internal.pageSize.getHeight() - 10, { align: "center" });
    }
    docInstance.save(`${selectedReport}_${new Date().toISOString().split("T")[0]}.pdf`);
   };

   (async () => {
    let currentY = 15;
    try {
     const img = new Image();
     img.src = "/emc_logo.png";
     await new Promise((res) => { img.onload = res; img.onerror = res; });
     if (img.complete && img.naturalWidth > 0) {
      const imgWidth = 25;
      const imgHeight = (img.height * imgWidth) / img.width;
      doc.addImage(img, "PNG", (pageWidth - imgWidth) / 2, currentY, imgWidth, imgHeight);
      currentY += imgHeight + 10;
     }
    } catch (e) { currentY += 5; }
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(title, pageWidth / 2, currentY, { align: "center" });
    currentY += 10;
    const chartDataUrl = await createChartDataUrl();
     if (chartDataUrl) {
      const chartW = pageWidth - 40;
      const chartH = 65;
      doc.addImage(chartDataUrl, "PNG", 20, currentY, chartW, chartH);
      currentY += chartH + 10;
     }
    addTableAndSave(doc, currentY);
   })();
  } catch (err) {
   console.error("Failed to generate PDF report:", err);
  }
 };
 // --- end new functions ---

 // Pagination calculations
 const totalPages = Math.ceil(tableData.length / itemsPerPage);
 const startIndex = (currentPage - 1) * itemsPerPage;
 const endIndex = startIndex + itemsPerPage;
 const currentData = tableData.slice(startIndex, endIndex);

 // UI: full-screen loader while checking session
 if (authLoading)
  return (
   <Box
    sx={{
     display: "flex",
     justifyContent: "center",
     alignItems: "center",
     height: "100vh",
    }}
   >
    <CircularProgress size="10rem" />
   </Box>
  );

 const selectedReportData = reportOptions.find((r) => r.id === selectedReport);

 return (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
   <Sidebar
    userRole={user?.user_type === "Superadmin" ? "superadmin" : "admin"}
    currentPath={"/AdminReports"}
    open={isSidebarOpen}
    onClose={handleSidebarToggle}
   />
   <Navbar handleSidebarToggle={handleSidebarToggle} />

   <div className="min-h-screen pt-8 p-4 mt-6 md:-mt-2 md:ml-52">
    {/* Header */}
    <div className="mb-6">
     <div className="flex gap-3 items-center mb-2">
      <BarChart3 className="w-6 h-6 text-[#0a1a3b]" />
      <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0a1a3b] via-[#0f2e6b] to-[#0a1a3b] bg-clip-text text-transparent">
       Generate Reports
      </h1>
     </div>
     <p className="text-1xl">
      Generate and download various system reports in PDF or CSV format.
     </p>
    </div>

    <div className="grid grid-cols-1 gap-6">
     {/* Controls Section - Report Type and Filters */}
     <div className="bg-white rounded-xl shadow-md p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
       {/* Report Type Dropdown */}
       <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
         Report Type
        </label>
        <select
         value={selectedReport}
         onChange={(e) => setSelectedReport(e.target.value)}
         className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-800"
        >
         <option value="">Select a report type</option>
         {reportOptions.map((report) => (
          <option key={report.id} value={report.id}>
           {report.title}
          </option>
         ))}
        </select>
        {selectedReportData && (
         <p className="mt-2 text-sm text-slate-600">
          {selectedReportData.description}
         </p>
        )}
       </div>

       {/* Report Format Buttons */}
       <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
         Report Format
        </label>
        <div className="flex gap-3">
         <button
          onClick={downloadPDF}
          disabled={!selectedReport}
          className={`flex-1 py-3 px-4 rounded-lg border-2 font-semibold transition-all duration-200 flex items-center justify-center gap-2 border-red-600 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-50 disabled:hover:border-red-600 disabled:hover:shadow-none`}
         >
          <FileText className="w-5 h-5" />
          Download PDF
         </button>
         <button
          onClick={downloadExcel}
          disabled={!selectedReport}
          className={`flex-1 py-3 px-4 rounded-lg border-2 font-semibold transition-all duration-200 flex items-center justify-center gap-2 border-green-600 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-50 disabled:hover:border-green-600 disabled:hover:shadow-none`}
         >
          <FileText className="w-5 h-5" />
          Download Excel
         </button>
        </div>
       </div>
      </div>

      {/* Filter Options - Show below when report has filters */}
      {selectedReportData?.hasFilters && (
       <div className="mt-6 pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between mb-4">
         <h3 className="text-lg font-semibold text-slate-800">
          Filter Options
         </h3>
         <button
          onClick={handleResetFilters}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
         >
          Reset Filters
         </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         {/* Year Filter */}
         {(selectedReport === "all-courses" ||
          selectedReport === "all-enrollments" ||
          selectedReport === "student-logs" ||
          selectedReport === "faculty-logs") && (
          <div>
           <label className="block text-sm font-medium text-slate-700 mb-2">
            Academic Year
           </label>
           <select
            value={filters.year}
            onChange={(e) =>
             setFilters({ ...filters, year: e.target.value })
            }
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
           >
            <option value="">All Years</option>
            {schoolYearOptions.map((sy) => (
             <option
              key={sy.school_year_id}
              value={sy.school_year}
             >
              {sy.school_year}
             </option>
            ))}
           </select>
          </div>
         )}

         {/* Semester Filter - Only for enrollments */}
         {selectedReport === "all-enrollments" && (
          <div>
           <label className="block text-sm font-medium text-slate-700 mb-2">
            Semester
           </label>
           <select
            value={filters.semester}
            onChange={(e) =>
             setFilters({ ...filters, semester: e.target.value })
            }
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
           >
            <option value="">All Semesters</option>
            <option value="1">First Semester</option>
            <option value="2">Second Semester</option>
            <option value="summer">Summer</option>
           </select>
          </div>
         )}

         {/* Instructor Filter - Only for all-courses */}
         {selectedReport === "all-courses" && (
          <div>
           <label className="block text-sm font-medium text-slate-700 mb-2">
            Instructor
           </label>
           <select
            value={filters.instructor}
            onChange={(e) =>
             setFilters({ ...filters, instructor: e.target.value })
            }
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
           >
            <option value="">All Instructors</option>
            {instructorOptions.map((inst) => (
             <option
              key={inst.user_id}
              value={`${inst.first_name} ${inst.last_name}`}
             >
              {inst.first_name} {inst.last_name}
             </option>
            ))}
           </select>
          </div>
         )}

         {/* Status Filter */}
         {(selectedReport === "all-courses" ||
          selectedReport === "all-enrollments") && (
          <div>
           <label className="block text-sm font-medium text-slate-700 mb-2">
            Status
           </label>
           <select
            value={filters.status}
            onChange={(e) =>
             setFilters({ ...filters, status: e.target.value })
            }
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
           >
            <option value="">All Status</option>
            {selectedReport === "all-courses" ? (
             <>
              <option value="Ongoing">Ongoing</option>
              <option value="Completed">Completed</option>
             </>
            ) : (
             <>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
             </>
            )}
           </select>
          </div>
         )}
        </div>
       </div>
      )}
     </div>

     {/* Chart Visualization Section */}
     {selectedReport && tableData.length > 0 && showChart && selectedChartColumn && (
      <div className="bg-white rounded-xl shadow-md p-4 mb-4">
       <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2">
         <BarChart className="w-4 h-4 text-blue-600" />
         <div>
          <h2 className="text-base font-semibold text-slate-800 leading-tight">
           Data Visualization
          </h2>
          <p className="text-[11px] text-slate-500">
           By {selectedChartColumn.replace(/_/g, " ")}
          </p>
         </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
         {/* Column Selector */}
         <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
          <span className="text-xs font-medium text-slate-500 px-2">Axis:</span>
          <select 
           value={selectedChartColumn}
           onChange={(e) => setSelectedChartColumn(e.target.value)}
           className="text-sm bg-white border-none rounded-md py-1 px-2 focus:ring-2 focus:ring-blue-500"
          >
           {getCategoricalColumns().map(col => (
            <option key={col} value={col}>
             {col.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
            </option>
           ))}
          </select>
         </div>

         {/* Chart Type Toggle */}
         <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
          <button
           onClick={() => setChartType("bar")}
           className={`p-1.5 rounded-md transition-all ${chartType === "bar" ? "bg-white shadow-sm text-blue-600" : "text-slate-400 hover:text-slate-600"}`}
           title="Bar Chart"
          >
           <BarChart className="w-4 h-4" />
          </button>
          <button
           onClick={() => setChartType("pie")}
           className={`p-1.5 rounded-md transition-all ${chartType === "pie" ? "bg-white shadow-sm text-blue-600" : "text-slate-400 hover:text-slate-600"}`}
           title="Pie Chart"
          >
           <PieChart className="w-4 h-4" />
          </button>
          <button
           onClick={() => setChartType("doughnut")}
           className={`p-1.5 rounded-md transition-all ${chartType === "doughnut" ? "bg-white shadow-sm text-blue-600" : "text-slate-400 hover:text-slate-600"}`}
           title="Doughnut Chart"
          >
           <div className="w-4 h-4 border-2 border-current rounded-full border-dashed" />
          </button>
         </div>

         <button
          onClick={() => setShowChart(false)}
          className="p-2 text-slate-400 hover:text-slate-600"
          title="Hide Chart"
         >
           <ChevronRight className="w-4 h-4 rotate-90" />
         </button>
        </div>
       </div>

       <div className="relative h-[250px] w-full flex justify-center">
        {(() => {
         const { labels, data } = getFrequencyData(selectedChartColumn);
         const colors = [
          "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", 
          "#06B6D4", "#F97316", "#EC4899", "#14B8A6", "#6366F1"
         ];

         return (
          <ChartPreviewCanvas 
           type={chartType} 
           labels={labels} 
           data={data} 
           colors={colors} 
          />
         );
        })()}
       </div>
      </div>
     )}

     {!showChart && selectedReport && tableData.length > 0 && (
      <div className="flex justify-end mb-6">
       <button
        onClick={() => setShowChart(true)}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 transition-all"
       >
        <BarChart className="w-4 h-4" />
        Show Data Visualization
       </button>
      </div>
     )}

     {/* Table Display Section */}
     {selectedReport && (
      <div className="bg-white rounded-xl shadow-md p-6">
       <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
         <Eye className="w-5 h-5" />
         Preview Data
        </h2>
        {tableData.length > 0 && (
         <span className="text-sm text-slate-600">
          {tableData.length} record
          {tableData.length !== 1 ? "s" : ""}
         </span>
        )}
       </div>

       {dataLoading ? (
        <ReportTableSkeleton />
       ) : tableData.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
         No data available for the selected filters
        </div>
       ) : (
        <>
         <div className="overflow-x-auto">
          <table className="w-full">
           <thead>
            <tr className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
             {getTableColumns().map((column) => (
              <th
               key={column}
               className={`px-4 py-3 text-left text-xs font-semibold ${
                selectedReport === "books-data" &&
                column === "title"
                 ? "min-w-[300px]"
                 : ""
               }`}
              >
               {column
                .replace(/_/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase())}
              </th>
             ))}
            </tr>
           </thead>
           <tbody className="divide-y divide-gray-200">
            {currentData.map((row, index) => (
             <tr
              key={index}
              className="hover:bg-gray-50 transition-colors"
             >
              {getTableColumns().map((column) => (
               <td
                key={column}
                className={`px-4 py-3 text-sm text-gray-700 ${
                 selectedReport === "books-data" &&
                 column === "title"
                  ? "min-w-[300px]"
                  : ""
                }`}
               >
                {row[column] !== null &&
                row[column] !== undefined
                 ? String(row[column])
                 : "—"}
               </td>
              ))}
             </tr>
            ))}
           </tbody>
          </table>
         </div>

         {/* Pagination */}
         {tableData.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
           <div className="flex items-center gap-4">
            <div className="text-sm text-gray-700">
             Showing {startIndex + 1} to{" "}
             {Math.min(endIndex, tableData.length)} of{" "}
             {tableData.length} records
            </div>
            <div className="flex items-center gap-2">
             <span className="text-xs text-gray-500">Show</span>
             <TableItemsPerPage
               value={itemsPerPage}
               onChange={(size) => {
                 setItemsPerPage(size);
                 setCurrentPage(1);
               }}
               options={[8, 10, 15]}
             />
            </div>           </div>
           <div className="flex items-center gap-2">
            <button
             onClick={() =>
              setCurrentPage((prev) => Math.max(prev - 1, 1))
             }
             disabled={currentPage === 1}
             className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
             <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1.5 text-sm font-medium text-gray-700">
             Page {currentPage} of {totalPages}
            </span>
            <button
             onClick={() =>
              setCurrentPage((prev) =>
               Math.min(prev + 1, totalPages)
              )
             }
             disabled={currentPage === totalPages}
             className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
             <ChevronRight className="w-4 h-4" />
            </button>
           </div>
          </div>
         )}
        </>
       )}
      </div>
     )}
    </div>
   </div>
      <div className="md:ml-52">
     <Footer />
    </div>
   </div>
  );
}
