import { useEffect, useState, useMemo } from "react";
import { Course, CourseSchedule } from "../../types/course";
import { useAdminCoursesWithProgress } from "../../hooks/useQueries";
import { TableRowSkeleton } from "./Skeletons";
import { Snackbar, Alert } from "@mui/material";
import TableItemsPerPage from "../../components/TableItemsPerPage";

// Modals
import AdminCreateCourseModal from "./AdminCreateCourseModal";
import AdminCreateSchoolYearModal from "./AdminCreateSchoolYearModal";
import AdminAssignInstructorModal from "./AdminAssignInstructorModal";
import AdminCourseOptionsModal from "./AdminCourseOptionsModal";
import CourseEditModal from "./CourseEditModal";
import WeeklyScheduleGrid from "./WeeklyScheduleGrid";

// Lucide icons
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Edit,
  User,
  Settings,
  Filter,
  X,
  CalendarDays,
} from "lucide-react";

const AdminCourseDataGrid = () => {
  // TanStack Query for data fetching
  const { data: courses = [], isLoading: loading, refetch } = useAdminCoursesWithProgress();

  const [searchQuery, setSearchQuery] = useState("");

  // Filter states
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>("all");
  const [selectedProgress, setSelectedProgress] = useState<string>("all");
  const [view, setView] = useState<"table" | "calendar">("table");

  // States for modal and course tracking
  const [openModal, setOpenModal] = useState(false);
  const [openSchoolYearModal, setOpenSchoolYearModal] = useState(false);
  const [openOptionsModal, setOpenOptionsModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [openAssignInstructorModal, setOpenAssignInstructorModal] =
    useState(false);

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // Tooltip state
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // open assign modal (course passed)
  const handleOpenAssignInstructorModal = (course: Course) => {
    setSelectedCourse(course);
    setOpenAssignInstructorModal(true);
  };

  const handleCloseAssignInstructorModal = () => {
    setSelectedCourse(null);
    setOpenAssignInstructorModal(false);
  };

  const handleOpenOptionsModal = (course: Course) => {
    setSelectedCourse(course);
    setOpenOptionsModal(true);
  };

  const handleCloseOptionsModal = () => {
    setSelectedCourse(null);
    setOpenOptionsModal(false);
  };

  const handleOpenEditModal = (course: Course) => {
    setSelectedCourse(course);
    setOpenEditModal(true);
  };

  const handleCloseEditModal = () => {
    setSelectedCourse(null);
    setOpenEditModal(false);
  };

  // Adds a new course and updates state
  const handleAddCourse = (
    _newCourseData: Omit<Course, "course_id" | "updated_at" | "created_at">
  ) => {
    refetch();
    setOpenModal(false);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSelectedSchoolYear("all");
    setSelectedProgress("all");
    setSearchQuery("");
  };

  // Extract unique school years for filter dropdown
  const availableSchoolYears = useMemo(() => {
    const years = Array.from(
      new Set(
        courses
          .map((c) => c.school_year)
          .filter((year): year is string => Boolean(year))
      )
    ).sort((a, b) => b.localeCompare(a));
    return years;
  }, [courses]);

  // Search and filter logic
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        (course.course_code?.toLowerCase() || "").includes(searchLower) ||
        (course.course_title?.toLowerCase() || "").includes(searchLower) ||
        (course.description?.toLowerCase() || "").includes(searchLower) ||
        (course.instructor_name?.toLowerCase() || "").includes(searchLower) ||
        (course.school_year?.toLowerCase() || "").includes(searchLower);

      const matchesSchoolYear =
        selectedSchoolYear === "all" ||
        course.school_year === selectedSchoolYear;

      const progress = course.progress ?? 0;
      const isCompleted = progress === 100;
      const matchesProgress =
        selectedProgress === "all" ||
        (selectedProgress === "completed" && isCompleted) ||
        (selectedProgress === "in-progress" && !isCompleted);

      return matchesSearch && matchesSchoolYear && matchesProgress;
    });
  }, [searchQuery, selectedSchoolYear, selectedProgress, courses]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSchoolYear, selectedProgress]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCourses = filteredCourses.slice(startIndex, endIndex);

  const hasActiveFilters =
    selectedSchoolYear !== "all" ||
    selectedProgress !== "all" ||
    searchQuery !== "";

  const calendarEvents = useMemo(() => {
    return filteredCourses.flatMap(course => {
      if (!course.schedules) return [];
      return course.schedules.map((sch: CourseSchedule) => ({
        ...sch,
        title: course.course_code,
        subtitle: course.course_title,
      }));
    });
  }, [filteredCourses]);

  return (
    <div>
      {/* Search and Filters */}
      <div className="mb-5">
        <div className="flex flex-col gap-3">
          {/* Search Bar and Action Buttons */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by code, title, instructor, or school year..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setOpenModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add New Course
              </button>
              <button
                onClick={() => setOpenSchoolYearModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Calendar className="w-4 h-4" />
                Manage School Year
              </button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Filter className="w-4 h-4" />
              Filters:
            </div>

            {/* School Year Filter */}
            <select
              value={selectedSchoolYear}
              onChange={(e) => setSelectedSchoolYear(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
            >
              <option value="all">All School Years</option>
              {availableSchoolYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            {/* Progress Filter */}
            <select
              value={selectedProgress}
              onChange={(e) => setSelectedProgress(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
            >
              <option value="all">All Progress</option>
              <option value="completed">Completed</option>
              <option value="in-progress">In Progress</option>
            </select>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </button>
            )}

            {/* View Toggle */}
            <div className="hidden sm:flex gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setView("table")}
                className={`p-2 rounded-md transition-all ${
                  view === "table"
                    ? "bg-white shadow-md text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <div className="w-4 h-4 flex flex-col gap-0.5">
                  <div className="w-full h-1 bg-current"></div>
                  <div className="w-full h-1 bg-current"></div>
                  <div className="w-full h-1 bg-current"></div>
                </div>
              </button>
              <button
                onClick={() => setView("calendar")}
                className={`p-2 rounded-md transition-all ${
                  view === "calendar"
                    ? "bg-white shadow-md text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <CalendarDays className="w-5 h-5" />
              </button>
            </div>

            {/* Results Count */}
            <div className="ml-auto text-sm text-gray-600">
              {filteredCourses.length}{" "}
              {filteredCourses.length === 1 ? "course" : "courses"} found
            </div>
          </div>
        </div>
      </div>

      {view === "calendar" ? (
        <WeeklyScheduleGrid events={calendarEvents} />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                <th className="px-4 py-3 text-left text-xs font-semibold">
                  Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold">
                  Instructor
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold">
                  School Year
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold">
                  Progress
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <TableRowSkeleton columns={7} />
              ) : currentCourses.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    {hasActiveFilters
                      ? "No courses match your filters"
                      : "No courses found"}
                  </td>
                </tr>
              ) : (
                currentCourses.map((course) => {
                  const progress = course.progress ?? 0;
                  const isCompleted = progress === 100;

                  return (
                    <tr
                      key={course.course_id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {course.course_code}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {course.course_title}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="max-w-xs truncate">
                          {course.description}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {course.instructor_name || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {course.school_year || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {isCompleted ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Completed
                          </span>
                        ) : (
                          `${progress}% Completed`
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {/* Edit Details Button */}
                          <div className="relative">
                            <button
                              onClick={() => handleOpenEditModal(course)}
                              onMouseEnter={() =>
                                setHoveredButton(`edit-${course.course_id}`)
                              }
                              onMouseLeave={() => setHoveredButton(null)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {hoveredButton === `edit-${course.course_id}` && (
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
                                Edit Details
                              </div>
                            )}
                          </div>

                          {/* Assign Instructor Button */}
                          <div className="relative">
                            <button
                              onClick={() =>
                                handleOpenAssignInstructorModal(course)
                              }
                              onMouseEnter={() =>
                                setHoveredButton(`assign-${course.course_id}`)
                              }
                              onMouseLeave={() => setHoveredButton(null)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <User className="w-4 h-4" />
                            </button>
                            {hoveredButton === `assign-${course.course_id}` && (
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
                                Assign Instructor
                              </div>
                            )}
                          </div>

                          {/* Manage Button - Show if completed or has no sections */}
                          {(isCompleted || course.hasNoSections) && (
                            <div className="relative">
                              <button
                                onClick={() => handleOpenOptionsModal(course)}
                                onMouseEnter={() =>
                                  setHoveredButton(`manage-${course.course_id}`)
                                }
                                onMouseLeave={() => setHoveredButton(null)}
                                className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                              {hoveredButton ===
                                `manage-${course.course_id}` && (
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
                                  Manage Course
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredCourses.length > 0 && (
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="text-xs text-gray-700">
                Showing {startIndex + 1} to{" "}
                {Math.min(endIndex, filteredCourses.length)} of{" "}
                {filteredCourses.length} courses
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
              </div>            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1.5 text-xs font-medium text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Modals */}
      <AdminCreateCourseModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onAddCourse={handleAddCourse}
      />

      <AdminCreateSchoolYearModal
        open={openSchoolYearModal}
        onClose={() => setOpenSchoolYearModal(false)}
      />

      <AdminCourseOptionsModal
        open={openOptionsModal}
        onClose={handleCloseOptionsModal}
        course={selectedCourse}
      />

      <AdminAssignInstructorModal
        open={openAssignInstructorModal}
        onClose={handleCloseAssignInstructorModal}
        course={selectedCourse}
        onSuccess={(_updatedInstructor) => {
          refetch();
          handleCloseAssignInstructorModal();
        }}
      />

      {selectedCourse && (
        <CourseEditModal
          open={openEditModal}
          onClose={handleCloseEditModal}
          course={{
            course_id: selectedCourse.course_id,
            course_code: selectedCourse.course_code,
            course_title: selectedCourse.course_title,
            course_description: selectedCourse.description || "",
            schedules: selectedCourse.schedules || [],
          }}
          onSuccess={(message) => {
            setSnackbar({ open: true, message, severity: "success" });
          }}
          onError={(message) => {
            setSnackbar({ open: true, message, severity: "error" });
          }}
        />
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default AdminCourseDataGrid;
