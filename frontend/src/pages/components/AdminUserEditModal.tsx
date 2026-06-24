import { X, User as UserIcon, Mail, Save, AlertCircle, ShieldAlert } from "lucide-react";
import { User } from "../../types/user";
import { useState, useEffect } from "react";
import axios from "axios";
import { getProfilePictureUrl } from "../../utils/imageUtils";
import { useAuth } from "../../context/AuthContext";

interface AdminUserEditModalProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onSuccess: () => void;
  onError: (message: string) => void;
}

const AdminUserEditModal = ({
  open,
  onClose,
  user,
  onSuccess,
  onError,
}: AdminUserEditModalProps) => {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    user_type: "",
    program: "",
  });

  const [programs, setPrograms] = useState<string[]>([]);
  const [userTypes, setUserTypes] = useState<string[]>([]);

  const isProtectedTarget = user?.user_type === "Superadmin" || user?.user_type === "Administrator";
  const canEdit = currentUser?.user_type === "Superadmin" || !isProtectedTarget;

  useEffect(() => {
    const fetchChoices = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/api/admin/get/user-choices/`,
          { withCredentials: true }
        );
        const fetchedPrograms = response.data.programs;
        setPrograms(fetchedPrograms);

        let fetchedUserTypes = response.data.user_types;
        // Filter out Superadmin and Administrator if the current user is not a Superadmin
        if (currentUser?.user_type !== "Superadmin") {
          fetchedUserTypes = fetchedUserTypes.filter((type: string) => type !== "Superadmin" && type !== "Administrator");
        }
        setUserTypes(fetchedUserTypes);
      } catch (error) {
        console.error("Failed to fetch user choices", error);
      }
    };
    if (open) {
      fetchChoices();
    }
  }, [open, currentUser]);

  useEffect(() => {
    if (user && open) {
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        user_type: user.user_type || "",
        program: user.program || "",
      });
    }
  }, [user, open]);

  if (!open || !user) return null;

  const profilePicUrl = getProfilePictureUrl(user.profile_picture);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      onError("You do not have permission to edit this user.");
      return;
    }
    setLoading(true);

    try {
      const res = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/api/admin/update/user/${
          user.user_id
        }/`,
        formData,
        { withCredentials: true }
      );

      if (res.data.success) {
        onSuccess();
        onClose();
      } else {
        onError(`Failed to update user: ${res.data.detail || "Unknown error"}`);
      }
    } catch (err: any) {
      console.error(err);
      onError(
        `An error occurred while updating the user: ${
          err.response?.data?.detail || err.message
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-gray-800" />
            <h2 className="text-lg font-bold text-gray-800">Edit User</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:bg-gray-200 rounded-lg p-1.5 transition-all duration-200 hover:rotate-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form
          onSubmit={handleSubmit}
          className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]"
        >
          {/* User Info Badge */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2">
              <div className="relative w-10 h-10 shrink-0">
                {profilePicUrl ? (
                  <img
                    src={profilePicUrl}
                    alt={`${user.first_name} ${user.last_name}`}
                    className="w-full h-full rounded-full object-cover shadow-sm border border-gray-200"
                  />
                ) : (
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-full w-full h-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {user.first_name?.charAt(0)}
                    {user.last_name?.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">
                  Editing User
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {user.first_name} {user.last_name}
                </p>
              </div>
            </div>
          </div>

          {/* Permission Warning */}
          {!canEdit && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-800">
                Security Policy: Standard Administrators cannot edit Superadmin or Administrator
                accounts. Please contact a Superadmin for modifications.
              </p>
            </div>
          )}

          {/* Form Fields */}
          <div className={`space-y-3 ${!canEdit ? "opacity-50 pointer-events-none" : ""}`}>
            {/* First Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  disabled={!canEdit}
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData({ ...formData, first_name: e.target.value })
                  }
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="Enter first name"
                />
              </div>
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  disabled={!canEdit}
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData({ ...formData, last_name: e.target.value })
                  }
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="Enter last name"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  disabled={!canEdit}
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="Enter email address"
                />
              </div>
            </div>

            {/* User Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                User Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                disabled={!canEdit}
                value={formData.user_type}
                onChange={(e) =>
                  setFormData({ ...formData, user_type: e.target.value })
                }
                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              >
                <option value="">Select user type</option>
                {userTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Program (only for students) */}
            {formData.user_type === "Student" && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Program
                </label>
                <select
                  disabled={!canEdit}
                  value={formData.program || (programs.length > 0 ? programs[0] : "")}
                  onChange={(e) =>
                    setFormData({ ...formData, program: e.target.value })
                  }
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                >
                  {programs.map((program) => (
                    <option key={program} value={program}>
                      {program}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Info Alert */}
          <div className="mt-4 flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800">
              Make sure all information is correct before saving. Changes will
              be applied immediately.
            </p>
          </div>
        </form>

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
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !canEdit}
            className="group relative overflow-hidden px-5 py-2 bg-green-600 text-white rounded-lg
             hover:bg-green-700 transition-all duration-200 font-medium shadow-sm
             hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed
             flex items-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {/* Shine effect */}
            <span
              className="pointer-events-none absolute inset-0 z-0
               bg-gradient-to-r from-transparent via-white/30 to-transparent
               translate-x-[-100%] group-hover:translate-x-[100%]
               transition-transform duration-1000"
            />

            {/* Button content */}
            <span className="relative z-10 flex items-center gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminUserEditModal;
