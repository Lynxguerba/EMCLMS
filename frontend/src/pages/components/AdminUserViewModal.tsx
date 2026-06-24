import { X, User as UserIcon, Mail, Hash, Calendar, Shield } from "lucide-react";
import { User } from "../../types/user";
import { format, parseISO } from "date-fns";
import { getProfilePictureUrl } from "../../utils/imageUtils";

interface AdminUserViewModalProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
}

const AdminUserViewModal = ({
  open,
  onClose,
  user,
}: AdminUserViewModalProps) => {
  if (!open || !user) return null;

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "—";
    try {
      return format(parseISO(dateString), "MMM dd, yyyy 'at' hh:mm a");
    } catch {
      return "—";
    }
  };

  const getRoleColor = (userType?: string) => {
    switch (userType) {
      case "Administrator":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "Superadmin":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "Instructor":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "Student":
        return "bg-green-100 text-green-800 border-green-300";
      case "Librarian":
        return "bg-orange-100 text-orange-800 border-orange-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "?";
    const firstInitial = firstName?.charAt(0) || "";
    const lastInitial = lastName?.charAt(0) || "";
    return `${firstInitial}${lastInitial}`.toUpperCase();
  };

  const profilePicUrl = getProfilePictureUrl(user.profile_picture);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-gray-800" />
            <h2 className="text-lg font-bold text-gray-800">User Details</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:bg-gray-200 rounded-lg p-1.5 transition-all duration-200 hover:rotate-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Profile Section */}
          <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-200">
            <div className="relative w-16 h-16 shrink-0">
              {profilePicUrl ? (
                <img
                  src={profilePicUrl}
                  alt={`${user.first_name} ${user.last_name}`}
                  className="w-full h-full rounded-full object-cover shadow-md border-2 border-white"
                />
              ) : (
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-full w-full h-full flex items-center justify-center text-white text-xl font-bold shadow-md">
                  {getInitials(user.first_name, user.last_name)}
                </div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {user.first_name} {user.last_name}
              </h3>
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getRoleColor(
                  user.user_type
                )}`}
              >
                {user.user_type}
              </span>
            </div>
          </div>

          {/* Information Grid */}
          <div className="space-y-2">
            {/* User ID */}
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <Hash className="w-4 h-4 text-gray-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 mb-0.5">
                  User ID
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {user.user_id}
                </p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <Mail className="w-4 h-4 text-gray-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 mb-0.5">Email</p>
                <p className="text-sm font-semibold text-gray-900">
                  {user.email}
                </p>
              </div>
            </div>

            {/* Role */}
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <Shield className="w-4 h-4 text-gray-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 mb-0.5">Role</p>
                <p className="text-sm font-semibold text-gray-900">
                  {user.user_type || "—"}
                </p>
              </div>
            </div>

            {/* Program (if student) */}
            {user.user_type === "Student" && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <UserIcon className="w-4 h-4 text-gray-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500 mb-0.5">
                    Program
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {user.program || "—"}
                  </p>
                </div>
              </div>
            )}

            {/* Created At */}
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <Calendar className="w-4 h-4 text-gray-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 mb-0.5">
                  Account Created
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatDate(user.created_at)}
                </p>
              </div>
            </div>

            {/* Last Online */}
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <Calendar className="w-4 h-4 text-gray-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 mb-0.5">
                  Last Online
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatDate(user.last_online)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        {/* <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Close
          </button>
        </div> */}
      </div>
    </div>
  );
};

export default AdminUserViewModal;
