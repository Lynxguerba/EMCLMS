import { X, BookOpen, FileText, User, AlertCircle, Save } from "lucide-react";
import axios from "axios";
import { useEffect, useState } from "react";

// Type definitions
import { Instructor } from "../../types/user";
import { NewCourse, CourseForm, CourseSchedule } from "../../types/course";
import WeeklyScheduleGrid from "./WeeklyScheduleGrid";

// Component Props
export default function AdminCreateCourseModal({
  open,
  onClose,
  onAddCourse,
}: {
  open: boolean;
  onClose: () => void;
  onAddCourse: (newCourseData: NewCourse) => void;
}) {
  // Course form state
  const [form, setForm] = useState<CourseForm>({
    course_code: "",
    course_title: "",
    description: "",
    instructor_id: "",
    is_active: true,
  });

  // List of instructors
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [schedules, setSchedules] = useState<CourseSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning" | "info";
  } | null>(null);

  // Track which fields have been touched
  const [touched, setTouched] = useState({
    course_code: false,
    course_title: false,
  });

  // Populate instructors when modal opens
  useEffect(() => {
    if (open) {
      axios
        .get(
          `${
            import.meta.env.VITE_API_BASE_URL
          }/api/admin/get-users-by-type/Instructor/`,
          { withCredentials: true }
        )
        .then((res) => {
          const fetchedInstructors = res.data;
          setInstructors(fetchedInstructors);

          if (fetchedInstructors.length > 0) {
            setForm((prev) => ({
              ...prev,
              instructor_id: fetchedInstructors[0].user_id,
            }));
          }
        })
        .catch((err) => {
          console.error("Error fetching instructors:", err);
          setInstructors([]);
        });
    }
  }, [open]);

  // Handle changes to form fields
  const handleChange = (field: keyof CourseForm, value: string | number) => {
    setForm({ ...form, [field]: value });
  };

  const handleBlur = (field: "course_code" | "course_title") => {
    setTouched({ ...touched, [field]: true });
  };

  const addSchedule = () => {
    setSchedules([...schedules, { day_of_week: "Monday", start_time: "08:00", end_time: "09:00" }]);
  };

  const removeSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const updateSchedule = (index: number, field: keyof CourseSchedule, value: string) => {
    const newSchedules = [...schedules];
    newSchedules[index] = { ...newSchedules[index], [field]: value };
    setSchedules(newSchedules);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Send POST request to backend
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/admin/create-course/`,
        {
          course_code: form.course_code,
          course_title: form.course_title,
          description: form.description,
          instructor_id: form.instructor_id,
          schedules: schedules
        },
        { withCredentials: true }
      );

      const selectedInstructor = instructors.find(
        (inst) => inst.user_id === form.instructor_id
      );

      if (selectedInstructor) {
        const newCourseForGrid = {
          course_code: form.course_code,
          course_title: form.course_title,
          description: form.description,
          instructor: `${selectedInstructor.first_name} ${selectedInstructor.last_name}`,
          is_active: form.is_active,
        };
        onAddCourse(newCourseForGrid);
      }

      setSnackbar({
        open: true,
        message: "Course created successfully!",
        severity: "success",
      });

      setForm({
        course_code: "",
        course_title: "",
        description: "",
        instructor_id: instructors.length > 0 ? instructors[0].user_id : "",
        is_active: true,
      });

      setTouched({
        course_code: false,
        course_title: false,
      });
      setSchedules([]);

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error("Error creating course:", error);
      setSnackbar({
        open: true,
        message: "Failed to create course. Please try again.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return form.course_code.trim() !== "" && form.course_title.trim() !== "";
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 flex items-center justify-between border-b border-gray-200">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-gray-800" />
              <h2 className="text-lg font-bold text-gray-800">Add New Course</h2>
            </div>
            <button
              onClick={() => {
                setForm({
                  course_code: "",
                  course_title: "",
                  description: "",
                  instructor_id: instructors.length > 0 ? instructors[0].user_id : "",
                  is_active: true,
                });
                setTouched({
                  course_code: false,
                  course_title: false,
                });
                setSchedules([]);
                onClose();
              }}
              className="text-gray-600 hover:bg-gray-200 rounded-lg p-1.5 transition-all duration-200 hover:rotate-90"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Warning message */}
            <div className="mb-4 flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-800">
                Warning: This action cannot be undone. Please double check your
                inputs before proceeding.
              </p>
            </div>

            <div className="space-y-3">
              {/* Course Code Field */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Course Code <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BookOpen className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={form.course_code}
                    onChange={(e) => handleChange("course_code", e.target.value)}
                    onBlur={() => handleBlur("course_code")}
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="e.g., CS101"
                  />
                </div>
                {touched.course_code && form.course_code.trim() === "" && (
                  <p className="text-xs text-red-600 mt-1">
                    Course code is required.
                  </p>
                )}
              </div>

              {/* Course Title Field */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Course Title <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FileText className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={form.course_title}
                    onChange={(e) => handleChange("course_title", e.target.value)}
                    onBlur={() => handleBlur("course_title")}
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="e.g., Introduction to Computer Science"
                  />
                </div>
                {touched.course_title && form.course_title.trim() === "" && (
                  <p className="text-xs text-red-600 mt-1">
                    Course title is required.
                  </p>
                )}
              </div>

              {/* Description Field */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  placeholder="Enter course description (optional)"
                />
              </div>

              {/* Instructor Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Instructor <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <select
                    value={form.instructor_id}
                    onChange={(e) =>
                      handleChange("instructor_id", Number(e.target.value))
                    }
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white"
                  >
                    {instructors.map((instructor) => (
                      <option key={instructor.user_id} value={instructor.user_id}>
                        {instructor.first_name} {instructor.last_name} (
                        {instructor.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Schedules */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Course Schedules
                </label>
                <div className="space-y-2">
                  {schedules.map((sch, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                      <select 
                        value={sch.day_of_week} 
                        onChange={(e) => updateSchedule(idx, "day_of_week", e.target.value)}
                        className="text-sm border-gray-300 rounded p-1"
                      >
                        <option value="Monday">Monday</option>
                        <option value="Tuesday">Tuesday</option>
                        <option value="Wednesday">Wednesday</option>
                        <option value="Thursday">Thursday</option>
                        <option value="Friday">Friday</option>
                        <option value="Saturday">Saturday</option>
                        <option value="Sunday">Sunday</option>
                      </select>
                      <input 
                        type="time" 
                        value={sch.start_time} 
                        onChange={(e) => updateSchedule(idx, "start_time", e.target.value)}
                        className="text-sm border-gray-300 rounded p-1"
                      />
                      <span className="text-sm text-gray-500">to</span>
                      <input 
                        type="time" 
                        value={sch.end_time} 
                        onChange={(e) => updateSchedule(idx, "end_time", e.target.value)}
                        className="text-sm border-gray-300 rounded p-1"
                      />
                      <button 
                        type="button" 
                        onClick={() => removeSchedule(idx)} 
                        className="ml-auto text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    onClick={addSchedule} 
                    className="text-sm text-blue-600 font-medium mt-1 hover:underline flex items-center gap-1"
                  >
                    + Add Schedule
                  </button>
                </div>
                {schedules.length > 0 && (
                  <div className="mt-4">
                    <WeeklyScheduleGrid 
                      events={schedules.map(s => ({
                        ...s,
                        title: form.course_code || "New Course",
                        subtitle: form.course_title || ""
                      }))} 
                    />
                  </div>
                )}
              </div>

            </div>
          </form>

          {/* Footer */}
          <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setForm({
                  course_code: "",
                  course_title: "",
                  description: "",
                  instructor_id: instructors.length > 0 ? instructors[0].user_id : "",
                  is_active: true,
                });
                setTouched({
                  course_code: false,
                  course_title: false,
                });
                setSchedules([]);
                onClose();
              }}
              disabled={loading}
              className="px-5 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-all duration-200 font-medium hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={!isFormValid() || loading}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Course
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Snackbar */}
      {snackbar?.open && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] animate-in slide-in-from-top duration-300">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
              snackbar.severity === "success"
                ? "bg-green-600 text-white"
                : snackbar.severity === "error"
                ? "bg-red-600 text-white"
                : snackbar.severity === "warning"
                ? "bg-yellow-600 text-white"
                : "bg-blue-600 text-white"
            }`}
          >
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-medium">{snackbar.message}</p>
            <button
              onClick={() => setSnackbar(null)}
              className="ml-2 hover:bg-white/20 rounded p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
