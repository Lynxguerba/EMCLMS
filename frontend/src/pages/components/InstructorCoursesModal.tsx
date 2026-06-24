// src/components/InstructorCoursesModal.tsx
import { useEffect, useState } from "react";
import {
  X,
  Search,
  Grid3x3,
  List,
  Filter,
  BookOpen,
  ChevronRight,
  CheckCircle2,
  Loader2,
  Calendar,
} from "lucide-react";
import axios from "axios";

type Course = {
  course_id: number;
  course_title: string;
  course_code: string;
  description: string;
  school_year: string;
  is_book_mapped?: boolean;
};

interface InstructorCoursesModalProps {
  open: boolean;
  onClose: () => void;
  book: { id: number; title: string } | null;
}

export default function InstructorCoursesModal({
  open,
  onClose,
  book,
}: InstructorCoursesModalProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [schoolYears, setSchoolYears] = useState<
    { school_year_id: number; school_year: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [semesterFilter, setSemesterFilter] = useState("All");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "success"
  );

  // Track action type for confirmation
  const [pendingAction, setPendingAction] = useState<"add" | "remove" | null>(
    null
  );

  useEffect(() => {
    if (!open) return;
    const fetchData = async () => {
      try {
        const coursesRes = await axios.get(
          `${
            import.meta.env.VITE_API_BASE_URL
          }/api/instructor/get/course-book/`,
          {
            params: book ? { book_id: book.id } : {},
            withCredentials: true,
          }
        );
        setCourses(coursesRes.data);

        const schoolYearsRes = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/api/get/course-school-years/`,
          { withCredentials: true }
        );
        const sortedSchoolYears = schoolYearsRes.data.sort(
          (a: { school_year_id: number }, b: { school_year_id: number }) =>
            a.school_year_id - b.school_year_id
        );
        const allOption = { school_year_id: 0, school_year: "All" };
        setSchoolYears([allOption, ...sortedSchoolYears]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [open]);

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.course_title.toLowerCase().includes(search.toLowerCase()) ||
      course.course_code.toLowerCase().includes(search.toLowerCase());
    const matchesSemester =
      semesterFilter === "All" || course.school_year === semesterFilter;
    return matchesSearch && matchesSemester;
  });

  const handleConfirmAction = async () => {
    if (!selectedCourse || !book || !pendingAction) return;
    setActionLoading(true);
    try {
      const res = await axios.post(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/api/instructor/post/add-course-book/`,
        {
          course_id: selectedCourse.course_id,
          book_id: book.id,
        },
        { withCredentials: true }
      );
      setSnackbarMessage(res.data.message);
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      // Update local state so UI reflects toggle
      setCourses((prev) =>
        prev.map((c) =>
          c.course_id === selectedCourse.course_id
            ? { ...c, is_book_mapped: !c.is_book_mapped }
            : c
        )
      );
    } catch (err: any) {
      setSnackbarMessage(
        err.response?.data?.detail || "Error updating book mapping"
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setActionLoading(false);
      setConfirmOpen(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Main Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="rounded-2xl shadow-xl bg-gradient-to-br from-gray-50 via-white to-gray-100 max-w-6xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <BookOpen className="w-7 h-7 text-[#0a1a3b]" />
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-[#0a1a3b] via-[#0f2e6b] to-[#0a1a3b] bg-clip-text text-transparent">
                    Instructor Courses
                  </h2>
                </div>
                {book && (
                  <p className="text-sm text-gray-600 ml-10">
                    Managing: <span className="font-semibold">{book.title}</span>
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-600 hover:bg-gray-200 rounded-lg p-2 transition-all duration-200 hover:rotate-90"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              <p className="text-gray-600 font-medium">Loading courses...</p>
            </div>
          ) : (
            <div className="p-6">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search courses..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>

                {/* Semester Filter */}
                <div className="relative min-w-[200px]">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                  <select
                    value={semesterFilter}
                    onChange={(e) => setSemesterFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:outline-none transition-colors appearance-none bg-white cursor-pointer"
                  >
                    {schoolYears.map((sy) => (
                      <option key={sy.school_year_id} value={sy.school_year}>
                        {sy.school_year}
                      </option>
                    ))}
                  </select>
                  <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none rotate-90" />
                </div>

                {/* View Toggle */}
                <div className="hidden sm:flex gap-2 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setView("grid")}
                    className={`p-2 rounded-md transition-all ${
                      view === "grid"
                        ? "bg-white shadow-md text-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Grid3x3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setView("list")}
                    className={`p-2 rounded-md transition-all ${
                      view === "list"
                        ? "bg-white shadow-md text-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Course Count */}
              <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
                <BookOpen className="w-4 h-4" />
                <span>
                  {filteredCourses.length}{" "}
                  {filteredCourses.length === 1 ? "course" : "courses"} found
                </span>
              </div>

              {/* Courses Grid/List */}
              <div className="overflow-y-auto max-h-[calc(90vh-280px)]">
                {filteredCourses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <BookOpen className="w-16 h-16 mb-4 opacity-50" />
                    <p className="text-lg font-medium">No courses found</p>
                    <p className="text-sm">Try adjusting your search or filters</p>
                  </div>
                ) : (
                  <div
                    className={
                      view === "grid"
                        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                        : "flex flex-col gap-4"
                    }
                  >
                    {filteredCourses.map((course) => (
                      <div
                        key={course.course_id}
                        onClick={() => {
                          if (!book) return;
                          setSelectedCourse(course);
                          setPendingAction(course.is_book_mapped ? "remove" : "add");
                          setConfirmOpen(true);
                        }}
                        className={`group cursor-pointer rounded-xl border-2 bg-white p-5 transition-all duration-300 hover:shadow-lg ${
                          course.is_book_mapped
                            ? "border-blue-400 bg-blue-50 hover:border-blue-500 hover:shadow-blue-100"
                            : "border-gray-200 hover:border-blue-400 hover:shadow-blue-100"
                        } ${view === "list" ? "flex items-center gap-4" : ""}`}
                      >
                        {/* Course Icon */}
                        <div
                          className={`flex-shrink-0 ${
                            view === "list" ? "w-16 h-16" : "w-14 h-14 mb-4"
                          } rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 relative`}
                        >
                          <BookOpen className="w-8 h-8 text-white" />
                          {course.is_book_mapped && (
                            <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Course Content */}
                        <div className="flex-1 min-w-0">
                          {/* Course Title and Code */}
                          <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-2">
                            {course.course_title}
                          </h3>
                          <span className="inline-block px-2 py-0.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full mb-2">
                            {course.course_code}
                          </span>

                          {/* Course Description */}
                          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                            {course.description || "No description available"}
                          </p>

                          {/* School Year Badge */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-xs text-gray-500 font-medium">
                                {course.school_year}
                              </span>
                            </div>
                            {/* <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" /> */}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="rounded-2xl shadow-xl bg-gradient-to-br from-gray-50 via-white to-gray-100 max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Confirm Action</h3>
            </div>

            {/* Content */}
            <div className="p-5">
              <p className="text-gray-700 leading-relaxed">
                {pendingAction && selectedCourse && book && (
                  <>
                    Do you want to{" "}
                    <span className="font-semibold text-blue-600">
                      {pendingAction}
                    </span>{" "}
                    "<span className="font-medium">{book.title}</span>"{" "}
                    {pendingAction === "add" ? "to" : "from"} course "
                    <span className="font-medium">{selectedCourse.course_title}</span>
                    "?
                  </>
                )}
              </p>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={actionLoading}
                className="px-5 py-2 rounded-lg border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snackbar Notification */}
      {snackbarOpen && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] animate-slideDown">
          <div
            className={`flex items-center gap-3 px-5 py-3 rounded-lg shadow-xl border-2 max-w-md ${
              snackbarSeverity === "success"
                ? "bg-green-50 border-green-400 text-green-800"
                : "bg-red-50 border-red-400 text-red-800"
            }`}
          >
            {snackbarSeverity === "success" ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <X className="w-5 h-5 flex-shrink-0" />
            )}
            <p className="font-medium text-sm flex-1">{snackbarMessage}</p>
            <button
              onClick={() => setSnackbarOpen(false)}
              className="text-current hover:opacity-70 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            transform: translate(-50%, -100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </>
  );
}