import {
  X,
  Trash2,
  Copy,
  RefreshCw,
  User,
  AlertCircle,
  Settings,
} from "lucide-react";
import { Course } from "../../types/course";
import { useState, useEffect } from "react";
import axios from "axios";
import ConfirmationModal from "./ConfirmationModal";

interface AdminCourseOptionsModalProps {
  open: boolean;
  onClose: () => void;
  course: Course | null;
}

interface Instructor {
  user_id: number;
  first_name: string;
  last_name: string;
}

const AdminCourseOptionsModal = ({
  open,
  onClose,
  course,
}: AdminCourseOptionsModalProps) => {
  const [loading, setLoading] = useState(false);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState<
    number | string
  >("");

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning" | "info";
  } | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isReuseAndDeleteDialogOpen, setIsReuseAndDeleteDialogOpen] =
    useState(false);

  useEffect(() => {
    const fetchInstructors = async () => {
      if (open) {
        try {
          const res = await axios.get(
            `${
              import.meta.env.VITE_API_BASE_URL
            }/api/admin/get-all-instructors/`,
            { withCredentials: true }
          );
          setInstructors(res.data);
          if (course) {
            setSelectedInstructorId(course.instructor);
          }
        } catch (err) {
          console.error("Failed to fetch instructors", err);
        }
      }
    };
    fetchInstructors();
  }, [open, course]);

  const handleClone = async () => {
    if (!course || !selectedInstructorId) return;

    setLoading(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/admin/post/course-clone/${
          course.course_id
        }/`,
        { new_instructor_id: selectedInstructorId },
        { withCredentials: true }
      );

      if (res.data.success) {
        setSnackbar({
          open: true,
          message: `Course cloned successfully! Course Code: ${res.data.course_code} School Year: ${res.data.school_year}`,
          severity: "success",
        });
        setTimeout(() => onClose(), 1500);
      } else {
        setSnackbar({
          open: true,
          message: `Failed to clone course: ${
            res.data.detail || "Unknown error"
          }`,
          severity: "error",
        });
      }
    } catch (err: any) {
      console.error(err);
      setSnackbar({
        open: true,
        message: `An error occurred while cloning the course: ${
          err.response?.data?.detail || err.message
        }`,
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setIsDeleteDialogOpen(false);
    if (!course) return;

    setLoading(true);
    try {
      const res = await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL}/api/admin/delete/course/${
          course.course_id
        }/`,
        { withCredentials: true }
      );

      if (res.data.success) {
        setSnackbar({
          open: true,
          message: "Course deleted successfully.",
          severity: "success",
        });
        setTimeout(() => onClose(), 1500);
      } else {
        setSnackbar({
          open: true,
          message: `Failed to delete course: ${
            res.data.detail || "Unknown error"
          }`,
          severity: "error",
        });
      }
    } catch (err: any) {
      console.error(err);
      setSnackbar({
        open: true,
        message: `An error occurred while deleting the course: ${
          err.response?.data?.detail || err.message
        }`,
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReuseAndDeleteConfirmed = async () => {
    setIsReuseAndDeleteDialogOpen(false);
    if (!course || !selectedInstructorId) return;

    setLoading(true);
    try {
      const cloneRes = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/admin/post/course-clone/${
          course.course_id
        }/`,
        { new_instructor_id: selectedInstructorId },
        { withCredentials: true }
      );

      if (!cloneRes.data.success) {
        setSnackbar({
          open: true,
          message: `Failed to clone course: ${
            cloneRes.data.detail || "Unknown error"
          }`,
          severity: "error",
        });
        return;
      }

      const deleteRes = await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL}/api/admin/delete/course/${
          course.course_id
        }/`,
        { withCredentials: true }
      );

      if (deleteRes.data.success) {
        setSnackbar({
          open: true,
          message: `Course reused and deleted successfully! New Course Code: ${cloneRes.data.course_code} School Year: ${cloneRes.data.school_year}`,
          severity: "success",
        });
        setTimeout(() => onClose(), 1500);
      } else {
        setSnackbar({
          open: true,
          message: `Clone succeeded but delete failed: ${
            deleteRes.data.detail || "Unknown error"
          }`,
          severity: "error",
        });
      }
    } catch (err: any) {
      console.error(err);
      setSnackbar({
        open: true,
        message: `An error occurred during reuse + delete: ${
          err.response?.data?.detail || err.message
        }`,
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 flex items-center justify-between border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-800" />
              <h2 className="text-lg font-bold text-gray-800">
                Course Options
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-600 hover:bg-gray-200 rounded-lg p-1.5 transition-all duration-200 hover:rotate-90"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Course Info */}
            {course && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-blue-900">
                  {course.course_title}
                </p>
                <p className="text-xs text-blue-700 mt-0.5">
                  {course.course_code}
                </p>
              </div>
            )}

            {/* Instructor Selection */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Assign Instructor for Clone/Reuse{" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
                <select
                  value={selectedInstructorId}
                  onChange={(e) => setSelectedInstructorId(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white"
                >
                  {instructors.map((instructor) => (
                    <option key={instructor.user_id} value={instructor.user_id}>
                      {instructor.first_name} {instructor.last_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Delete Button */}
              <button
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Course
                  </>
                )}
              </button>

              {/* Clone Button */}
              <button
                onClick={handleClone}
                disabled={loading || !selectedInstructorId}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Clone Course
                  </>
                )}
              </button>

              {/* Reuse + Delete Button */}
              <button
                onClick={() => setIsReuseAndDeleteDialogOpen(true)}
                disabled={loading || !selectedInstructorId}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Reuse + Delete
                  </>
                )}
              </button>
            </div>

            {/* Info Message */}
            <div className="mt-4 flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-800">
                <strong>Reuse + Delete:</strong> Creates a copy of this course
                for the latest school year, then permanently deletes the
                original.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-t border-gray-200 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-all duration-200 font-medium hover:shadow-md"
            >
              Close
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

      {/* Confirmation Modals */}
      <ConfirmationModal
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Confirm Deletion"
        message={`Are you sure you want to permanently delete the course "${course?.course_title}"? This action cannot be undone.`}
        confirmButtonText="Delete"
      />

      <ConfirmationModal
        open={isReuseAndDeleteDialogOpen}
        onClose={() => setIsReuseAndDeleteDialogOpen(false)}
        onConfirm={handleReuseAndDeleteConfirmed}
        title="Confirm Reuse and Delete"
        message={`Are you sure you want to REUSE then DELETE the course "${course?.course_title}"?\n\nThis will duplicate it to the latest school year, then permanently delete the original.`}
        confirmButtonText="Reuse and Delete"
      />
    </>
  );
};

export default AdminCourseOptionsModal;
