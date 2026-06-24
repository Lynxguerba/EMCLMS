import {
  X,
  Trash2,
  AlertTriangle,
  Info,
  UserX,
  ChevronDown,
  ShieldAlert,
} from "lucide-react";
import { User } from "../../types/user";
import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

interface AdminUserDeleteModalProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onSuccess: () => void;
  onError: (message: string) => void;
}

interface Instructor {
  user_id: number;
  first_name: string;
  last_name: string;
}

const AdminUserDeleteModal = ({
  open,
  onClose,
  user,
  onSuccess,
  onError,
}: AdminUserDeleteModalProps) => {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState<
    number | string
  >("");

  const isProtectedTarget = user?.user_type === "Superadmin" || user?.user_type === "Administrator";
  const canDelete = currentUser?.user_type === "Superadmin" || !isProtectedTarget;

  useEffect(() => {
    const fetchInstructors = async () => {
      if (open && user?.user_type === "Instructor") {
        try {
          const res = await axios.get(
            `${
              import.meta.env.VITE_API_BASE_URL
            }/api/admin/get-all-instructors/`,
            { withCredentials: true }
          );
          // Filter out the current user from the list
          const filteredInstructors = res.data.filter(
            (inst: Instructor) => inst.user_id !== user.user_id
          );
          setInstructors(filteredInstructors);
        } catch (err) {
          console.error("Failed to fetch instructors", err);
        }
      }
    };
    fetchInstructors();
  }, [open, user]);

  const handleDelete = async (reassignId?: number) => {
    if (!user) return;

    setLoading(true);
    try {
      const payload = reassignId ? { reassign_instructor_id: reassignId } : {};

      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/admin/delete/user/${
          user.user_id
        }/`,
        payload,
        { withCredentials: true }
      );

      if (res.data.success) {
        onSuccess();
        onClose();
      } else {
        onError(`Failed to delete user: ${res.data.detail || "Unknown error"}`);
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      onError(
        `An error occurred while deleting the user: ${
          err.response?.data?.detail || err.message
        }`
      );
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!open || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-gray-800" />
            <h2 className="text-lg font-bold text-gray-800">Delete User</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:bg-gray-200 rounded-lg p-1.5 transition-all duration-200 hover:rotate-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Permission Warning */}
          {!canDelete && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-800">
                Security Policy: Standard Administrators cannot delete Superadmin or Administrator
                accounts. Please contact a Superadmin for this action.
              </p>
            </div>
          )}

          {/* User Info */}
          <div className={`mb-4 p-3 bg-red-50 rounded-lg border border-red-200 ${!canDelete ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-full w-10 h-10 flex items-center justify-center text-white shadow-sm">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-red-700">
                  Deleting User
                </p>
                <p className="text-sm font-bold text-red-900">
                  {user.first_name} {user.last_name}{" "}
                  <span className="text-xs font-medium">
                    ({user.user_type})
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className={!canDelete ? "opacity-50 pointer-events-none" : ""}>
            {/* Warning Messages */}
            {user.user_type === "Student" && (
              <div className="mb-3 flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-yellow-900 mb-0.5">
                    Warning
                  </p>
                  <p className="text-xs text-yellow-800">
                    This action will delete all enrollments, scores, and physical
                    submission files. Student logs will be preserved.
                  </p>
                </div>
              </div>
            )}

            {user.user_type === "Administrator" && (
              <div className="mb-3 flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-blue-900 mb-0.5">
                    Information
                  </p>
                  <p className="text-xs text-blue-800">
                    Administrator logs will be preserved.
                  </p>
                </div>
              </div>
            )}

            {user.user_type === "Instructor" && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-yellow-900 mb-0.5">
                      Warning
                    </p>
                    <p className="text-xs text-yellow-800">
                      Deleting an instructor affects their courses. You can
                      reassign them below.
                    </p>
                  </div>
                </div>

                {/* Instructor Selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Reassign Courses To (Optional)
                  </label>
                  <div className="relative">
                    <select
                      value={selectedInstructorId}
                      disabled={!canDelete}
                      onChange={(e) => setSelectedInstructorId(e.target.value)}
                      className="block w-full px-3 py-2 pr-8 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all appearance-none bg-white"
                    >
                      <option value="">None (Delete Courses)</option>
                      {instructors.map((instructor) => (
                        <option
                          key={instructor.user_id}
                          value={instructor.user_id}
                        >
                          {`${instructor.first_name} ${instructor.last_name}`}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-t border-gray-200">
          {user.user_type === "Instructor" ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => handleDelete(Number(selectedInstructorId))}
                disabled={loading || !selectedInstructorId || !canDelete}
                className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Reassign & Delete"
                )}
              </button>
              <button
                onClick={() => handleDelete()}
                disabled={loading || !canDelete}
                className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete All
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-all duration-200 font-medium hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-2 justify-end">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-5 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-all duration-200 font-medium hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete()}
                disabled={loading || !canDelete}
                className="group relative overflow-hidden px-5 py-2 bg-red-600 text-white rounded-lg
             hover:bg-red-700 transition-all duration-200 font-medium shadow-sm
             hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed
             flex items-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {/* Shine layer */}
                <span
                  className="pointer-events-none absolute inset-0 z-0
               bg-gradient-to-r from-transparent via-white/25 to-transparent
               translate-x-[-100%] group-hover:translate-x-[100%]
               transition-transform duration-1000"
                />
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Confirm Delete
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUserDeleteModal;
