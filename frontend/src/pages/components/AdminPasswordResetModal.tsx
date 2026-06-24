import { useState } from "react";
import {
  Dialog,
  // DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import {
  Eye,
  EyeOff,
  X,
  CheckCircle2,
  AlertCircle,
  Lock,
  KeyRound,
  ShieldAlert,
} from "lucide-react";
import PasswordStrengthBar from "../../components/PasswordStrengthBar";

import { User } from "../../types/user";
import { PasswordReset } from "../../types/passwordreset";
import { getProfilePictureUrl } from "../../utils/imageUtils";
import { useAuth } from "../../context/AuthContext";

// Component Props Interface
interface PasswordResetModalProps {
  open: boolean;
  onClose: () => void;
  user: User & PasswordReset;
  onResetConfirm: (userId: number, newPass1: string, newPass2: string) => void;
}

// Password Reset Modal Component
function AdminPasswordResetModal({
  open,
  onClose,
  user,
  onResetConfirm,
}: PasswordResetModalProps) {
  const { user: currentUser } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isProtectedTarget = user?.user_type === "Superadmin" || user?.user_type === "Administrator";
  const canReset = currentUser?.user_type === "Superadmin" || !isProtectedTarget;

  const profilePicUrl = getProfilePictureUrl(user.profile_picture);

  const isPasswordValid = (password: string) =>
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    password.length >= 8;

  const passwordRequirements = [
    {
      label: "At least 8 characters",
      met: newPassword.length >= 8,
      show: newPassword.length > 0,
    },
    {
      label: "At least 1 uppercase letter",
      met: /[A-Z]/.test(newPassword),
      show: newPassword.length > 0,
    },
    {
      label: "At least 1 lowercase letter",
      met: /[a-z]/.test(newPassword),
      show: newPassword.length > 0,
    },
    {
      label: "At least 1 number",
      met: /\d/.test(newPassword),
      show: newPassword.length > 0,
    },
  ];

  const handleConfirm = () => {
    if (
      newPassword === "" ||
      newPassword !== confirmPassword ||
      !isPasswordValid(newPassword)
    ) {
      return;
    }
    onResetConfirm(user.user_id, newPassword, confirmPassword);
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleClose = () => {
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  const isFormValid =
    newPassword !== "" &&
    confirmPassword !== "" &&
    newPassword === confirmPassword &&
    isPasswordValid(newPassword);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
        },
      }}
      BackdropProps={{
        sx: {
          backdropFilter: "blur(8px)",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
        },
      }}
    >
      {/* Custom Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Reset Password</h2>
            <p className="text-blue-100 text-sm">
              {user.first_name} {user.last_name}
            </p>
          </div>
        </div>
        <IconButton onClick={handleClose} sx={{ color: "white" }}>
          <X className="w-5 h-5" />
        </IconButton>
      </div>

      <DialogContent className="p-6">
        {/* Permission Warning */}
        {!canReset && (
          <div className="mb-6 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 font-medium">
              Security Policy: Standard Administrators cannot reset passwords for
              Superadmin or Administrator accounts. Please contact a Superadmin for this action.
            </p>
          </div>
        )}

        {/* User Info Card */}
        <div className={`mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 ${!canReset ? "opacity-50" : ""}`}>
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 shrink-0">
              {profilePicUrl ? (
                <img
                  src={profilePicUrl}
                  alt={`${user.first_name} ${user.last_name}`}
                  className="w-full h-full rounded-full object-cover shadow-sm border-2 border-white"
                />
              ) : (
                <div className="bg-blue-600 text-white w-full h-full rounded-full flex items-center justify-center font-bold text-lg">
                  {user.first_name?.charAt(0)}
                  {user.last_name?.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-800">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-sm text-gray-600">{user.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                {user.user_type}
              </span>
            </div>
          </div>
        </div>

        <div className={!canReset ? "opacity-50 pointer-events-none" : ""}>
          {/* New Password Field */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showNewPassword ? "text" : "password"}
                disabled={!canReset}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showNewPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Password Requirements - Only show when user starts typing */}
          {newPassword.length > 0 && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 mb-2">
                Password Requirements:
              </p>
              <div className="space-y-1">
                {passwordRequirements.map((req, index) => (
                  req.show && (
                    <div key={index} className="flex items-center gap-2">
                      {req.met ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      )}
                      <span
                        className={`text-xs ${
                          req.met ? "text-green-700" : "text-red-700"
                        }`}
                      >
                        {req.label}
                      </span>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Password Strength Bar */}
          {newPassword.length > 0 && (
            <div className="mb-4">
              <PasswordStrengthBar
                password={newPassword}
                barColors={["#ef4836", "#ff9800", "#ffeb3b", "#2b90ef", "#25c281"]}
                scoreWords={["Too short", "Weak", "Okay", "Good", "Strong", "Excellent"]}
              />
            </div>
          )}

          {/* Confirm Password Field */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showConfirmPassword ? "text" : "password"}
                disabled={!canReset}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Password Mismatch Warning - Only show when user has typed in confirm field */}
          {confirmPassword.length > 0 && confirmPassword !== newPassword && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">
                Passwords do not match. Please ensure both passwords are identical.
              </p>
            </div>
          )}

          {/* Success Message Preview - Only show when valid */}
          {isFormValid && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">
                Password meets all requirements and matches. Ready to reset!
              </p>
            </div>
          )}
        </div>
      </DialogContent>

      <DialogActions className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <button
          onClick={handleClose}
          className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={!isFormValid}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            isFormValid
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          Confirm Reset
        </button>
      </DialogActions>
    </Dialog>
  );
}

export default AdminPasswordResetModal;