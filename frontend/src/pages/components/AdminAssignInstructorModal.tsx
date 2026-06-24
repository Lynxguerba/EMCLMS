import { X, User, Search, Check, AlertCircle, Users } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { Course } from "../../types/course";
import { getFileUrl } from "../../utils/fileUtils";

type Instructor = {
  user_id: number;
  first_name: string;
  last_name: string;
  email?: string;
  profile_picture_url?: string;
};

interface Props {
  open: boolean;
  onClose: () => void;
  course: Course | null;
  onSuccess: (instructor: Instructor) => void;
}

const AdminAssignInstructorModal = ({
  open,
  onClose,
  course,
  onSuccess,
}: Props) => {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning" | "info";
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoadingList(true);
    setSearchQuery("");
    axios
      .get(
        `${import.meta.env.VITE_API_BASE_URL}/api/admin/get-all-instructors/`,
        {
          withCredentials: true,
        }
      )
      .then((res) => {
        setInstructors(res.data || []);
        if (course && (course as any).instructor_id) {
          setSelectedId((course as any).instructor_id);
        } else {
          setSelectedId(null);
        }
      })
      .catch((err) => {
        console.error("Failed to load instructors", err);
        setSnackbar({
          open: true,
          message: "Failed to load instructors.",
          severity: "error",
        });
      })
      .finally(() => setLoadingList(false));
  }, [open, course]);

  const handleSubmit = async () => {
    if (!course) return;
    if (!selectedId) {
      setSnackbar({
        open: true,
        message: "Please select an instructor.",
        severity: "warning",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/admin/reassign-instructor/${
          course.course_id
        }/`,
        { new_instructor_id: selectedId },
        { withCredentials: true }
      );

      if (res.data?.success) {
        const selected = instructors.find((i) => i.user_id === selectedId)!;
        setSnackbar({
          open: true,
          message: "Instructor assigned successfully!",
          severity: "success",
        });
        setTimeout(() => {
          onSuccess(selected);
          onClose();
        }, 1000);
      } else {
        setSnackbar({
          open: true,
          message: res.data?.detail || "Failed to reassign instructor",
          severity: "error",
        });
      }
    } catch (err: any) {
      console.error("Reassign failed", err);
      setSnackbar({
        open: true,
        message:
          err.response?.data?.detail ||
          err.message ||
          "Error reassigning instructor",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredInstructors = instructors.filter((instructor) => {
    const fullName =
      `${instructor.first_name} ${instructor.last_name}`.toLowerCase();
    const email = instructor.email?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 flex items-center justify-between border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-800" />
              <h2 className="text-lg font-bold text-gray-800">
                Assign Instructor
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

            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Search instructors by name or email..."
                />
              </div>
            </div>

            {/* Instructors List */}
            {loadingList ? (
              <div className="flex justify-center items-center py-12">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {filteredInstructors.length === 0 ? (
                  <div className="text-center py-8">
                    <User className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      {searchQuery
                        ? "No instructors found matching your search."
                        : "No instructors available."}
                    </p>
                  </div>
                ) : (
                  filteredInstructors.map((instructor) => (
                    <button
                      key={instructor.user_id}
                      onClick={() => setSelectedId(instructor.user_id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200 ${
                        selectedId === instructor.user_id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {instructor.profile_picture_url ? (
                          <img
                            src={getFileUrl(instructor.profile_picture_url)}
                            alt={`${instructor.first_name} ${instructor.last_name}`}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                            {instructor.first_name?.[0]}
                            {instructor.last_name?.[0]}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold text-gray-900">
                          {instructor.first_name} {instructor.last_name}
                        </p>
                        {instructor.email && (
                          <p className="text-xs text-gray-600">
                            {instructor.email}
                          </p>
                        )}
                      </div>

                      {/* Radio Indicator */}
                      <div className="flex-shrink-0">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            selectedId === instructor.user_id
                              ? "border-blue-500 bg-blue-500"
                              : "border-gray-300"
                          }`}
                        >
                          {selectedId === instructor.user_id && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-all duration-200 font-medium hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedId || loading || loadingList}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Assign Instructor
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
};

export default AdminAssignInstructorModal;
