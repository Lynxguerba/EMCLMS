import {
  X,
  Calendar,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import axios from "axios";
import { useEffect, useState } from "react";

export default function AdminCreateSchoolYearModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [schoolYear, setSchoolYear] = useState("");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  } | null>(null);
  const [schoolYears, setSchoolYears] = useState<
    { school_year_id: number; school_year: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setSchoolYear("");
      setTouched(false);
      fetchSchoolYears();
    }
  }, [open]);

  const fetchSchoolYears = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/api/admin/get-post/course-school-years/`,
        { withCredentials: true }
      );
      setSchoolYears(res.data || []);
    } catch (err) {
      console.error("Error fetching school years", err);
      setSchoolYears([]);
    } finally {
      setLoading(false);
    }
  };

  const isValidFormat = (value: string) =>
    /^\d{4}-\d{4} (1st|2nd) semester$/.test(value.trim());

  const isValid = () => schoolYear.trim() !== "" && isValidFormat(schoolYear);

  const handleSubmit = async () => {
    try {
      const res = await axios.post(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/api/admin/get-post/course-school-years/`,
        { school_year: schoolYear },
        { withCredentials: true }
      );

      const createdId = res.data.school_year_id;
      setSchoolYears((prev) => [
        { school_year_id: createdId, school_year: schoolYear },
        ...prev,
      ]);
      setSnackbar({
        open: true,
        message: "School year created successfully!",
        severity: "success",
      });
      setSchoolYear("");
      setTouched(false);
    } catch (err: any) {
      console.error("Error creating school year", err);
      setSnackbar({
        open: true,
        message:
          err?.response?.data?.detail || "Failed to create school year",
        severity: "error",
      });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setDeleting(id);
      await axios.delete(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/api/admin/delete/course-school-years/${id}/`,
        { withCredentials: true }
      );
      setSchoolYears((prev) => prev.filter((sy) => sy.school_year_id !== id));
      setSnackbar({
        open: true,
        message: "School year deleted successfully",
        severity: "success",
      });
    } catch (err: any) {
      console.error("Error deleting school year", err);
      setSnackbar({
        open: true,
        message:
          err?.response?.data?.detail || "Failed to delete school year",
        severity: "error",
      });
    } finally {
      setDeleting(null);
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
              <Calendar className="w-5 h-5 text-gray-800" />
              <h2 className="text-lg font-bold text-gray-800">
                Manage School Year
              </h2>
            </div>
            <button
              onClick={() => {
                setSchoolYear("");
                setTouched(false);
                onClose();
              }}
              className="text-gray-600 hover:bg-gray-200 rounded-lg p-1.5 transition-all duration-200 hover:rotate-90"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Warning message */}
            <div className="mb-4 flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-800">
                Warning: This action cannot be undone. Please double check your
                inputs before proceeding.
              </p>
            </div>

            {/* Input Field */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                School Year <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={schoolYear}
                  onChange={(e) => setSchoolYear(e.target.value)}
                  onBlur={() => setTouched(true)}
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="e.g., 2024-2025 1st semester"
                />
              </div>
              {!schoolYear && !touched && (
                <p className="text-xs text-gray-500 mt-1">
                  Example: 2024-2025 1st semester
                </p>
              )}
              {touched && schoolYear && !isValidFormat(schoolYear) && (
                <p className="text-xs text-red-600 mt-1">
                  Format must be 'YYYY-YYYY 1st semester' or 'YYYY-YYYY 2nd
                  semester'
                </p>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!isValid()}
              className="w-full mb-4 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Add School Year
            </button>

            {/* Divider */}
            <div className="border-t border-gray-200 my-4"></div>

            {/* Existing School Years */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Existing School Years
              </h3>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              ) : schoolYears.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">
                  No school years found.
                </p>
              ) : (
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                  {schoolYears.map((sy, index) => (
                    <div
                      key={sy.school_year_id}
                      className={`flex items-center justify-between p-3 hover:bg-gray-50 transition-colors ${
                        index !== schoolYears.length - 1
                          ? "border-b border-gray-200"
                          : ""
                      }`}
                    >
                      <span className="text-sm text-gray-900">
                        {sy.school_year}
                      </span>
                      <button
                        onClick={() => handleDelete(sy.school_year_id)}
                        disabled={deleting === sy.school_year_id}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deleting === sy.school_year_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-t border-gray-200 flex justify-end">
            <button
              onClick={() => {
                setSchoolYear("");
                setTouched(false);
                onClose();
              }}
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
                : "bg-red-600 text-white"
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
