import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { useAuth } from "../context/AuthContext";
import PasswordStrengthBar from "../components/PasswordStrengthBar";
import axios from "axios";
import { getProfilePictureUrl } from "../utils/imageUtils";
import { useGlobalMutation, queryKeys } from "../hooks/useQueries";
import { ProfileSettingsSkeleton } from "./components/Skeletons";
import {
  Eye,
  EyeOff,
  ArrowLeft,
  Upload,
  Check,
  X,
  Lock,
  ImageIcon,
  CheckCircle,
  XCircle,
  ZoomIn,
} from "lucide-react";

const getInitials = (firstName: string, lastName: string) => {
  const firstInitial = firstName?.[0]?.toUpperCase() || "";
  const lastInitial = lastName?.[0]?.toUpperCase() || "";
  return firstInitial + lastInitial;
};

const ProfileSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user, login, loading: authLoading } = useAuth();

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Touch states for validation
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "error" | "info" | "warning"
  >("success");
  const [profilePicModalOpen, setProfilePicModalOpen] = useState(false);

  // Mutation for updating profile
  const updateProfileMutation = useGlobalMutation(
    async (formData: FormData) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/user/post/update-profile/`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress(percentCompleted);
            }
          },
        }
      );
      return response.data;
    },
    [queryKeys.session],
    {
      onSuccess: (data: any) => {
        if (user) {
          const updatedUser = {
            ...user,
            profile_picture: data.user.profile_picture,
          };
          login(updatedUser);
        }
        setUploadedFile(null);
        setNewPassword("");
        setConfirmPassword("");
        setPasswordTouched(false);
        setConfirmPasswordTouched(false);
        setSnackbarMessage("Profile updated successfully!");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
      },
      onError: (error: any) => {
        setSnackbarMessage(
          error.response?.data?.detail ||
            "Failed to update profile. Please try again."
        );
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      },
      onSettled: () => {
        setIsUploading(false);
        setUploadProgress(0);
      },
    }
  );

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setUploadedFile(file);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".png", ".jpg", ".gif"] },
    multiple: false,
  });

  const handleSave = () => {
    if (!user) return;

    setIsUploading(true);
    setUploadProgress(0);
    const formData = new FormData();

    if (newPassword.trim() !== "") {
      formData.append("new_password", newPassword);
    }

    if (uploadedFile) {
      formData.append("profile_picture", uploadedFile);
    }

    updateProfileMutation.mutate(formData);
  };

  const getAvatarSrc = (
    uploaded: File | null,
    profilePicture?: string | null
  ) => {
    if (uploaded) return URL.createObjectURL(uploaded);
    return getProfilePictureUrl(profilePicture);
  };

  const isPasswordValid = (password: string) =>
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    password.length >= 8;

  const isPasswordUsed = newPassword !== "" || confirmPassword !== "";

  const isSaveEnabled = isPasswordUsed
    ? newPassword === confirmPassword && isPasswordValid(newPassword)
    : uploadedFile !== null;

  // Password validation checks
  const passwordChecks = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /\d/.test(newPassword),
    length12: newPassword.length >= 12,
  };

  const showPasswordMismatch =
    confirmPasswordTouched &&
    confirmPassword !== "" &&
    confirmPassword !== newPassword;

  if (authLoading) {
    return <ProfileSettingsSkeleton />;
  }

  if (!user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100">
        <p className="text-base text-gray-600">No user data found.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 flex items-center justify-center p-4">
      {/* Snackbar */}
      {snackbarOpen && (
        <div className="fixed top-4 right-4 z-50 animate-[slideIn_0.3s_ease-out]">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm ${
              snackbarSeverity === "success"
                ? "bg-green-500/90 text-white"
                : "bg-red-500/90 text-white"
            }`}
          >
            {snackbarSeverity === "success" ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            <span className="font-medium text-sm">{snackbarMessage}</span>
            <button
              onClick={() => setSnackbarOpen(false)}
              className="ml-2 hover:opacity-70 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 left-4 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md hover:shadow-lg hover:bg-white transition-all duration-300 hover:scale-110 group z-10"
        aria-label="go back"
      >
        <ArrowLeft className="w-4 h-4 text-sky-600 group-hover:text-sky-700" />
      </button>

      {/* Main Content */}
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-6 md:p-8 border border-sky-100">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent mb-1">
              Profile Settings
            </h1>
            <p className="text-sm text-gray-600">
              Manage your account preferences
            </p>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LEFT COLUMN - Profile Picture & User Info */}
            <div className="space-y-5">
              {/* Avatar Section */}
              <div className="flex flex-col items-center">
                <div
                  className="relative group cursor-pointer"
                  onClick={() => {
                    if (getAvatarSrc(uploadedFile, user?.profile_picture)) {
                      setProfilePicModalOpen(true);
                    }
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-sky-400 to-blue-500 rounded-full blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                  {getAvatarSrc(uploadedFile, user?.profile_picture) ? (
                    <>
                      <img
                        src={getAvatarSrc(
                          uploadedFile,
                          user?.profile_picture
                        )}
                        alt="profile"
                        className="relative w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg ring-2 ring-sky-200 group-hover:brightness-90 transition-all duration-300"
                      />
                      <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                        <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    </>
                  ) : (
                    <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center border-4 border-white shadow-lg ring-2 ring-sky-200">
                      <span className="text-4xl font-bold text-white">
                        {getInitials(user.first_name, user.last_name)}
                      </span>
                    </div>
                  )}
                </div>
                <p className="mt-3 text-lg font-semibold text-gray-800">
                  {user.first_name} {user.last_name}
                </p>
                {user.email && (
                  <p className="text-sm text-gray-600 mt-1">{user.email}</p>
                )}
                <p className={`text-[10px] font-bold uppercase tracking-widest mt-2 px-3 py-1 rounded-full border ${
                  user?.user_type === "Superadmin" 
                    ? "text-purple-600 border-purple-200 bg-purple-50" 
                    : "text-blue-600 border-blue-200 bg-blue-50"
                }`}>
                  {user?.user_type}
                </p>
              </div>

              {/* Upload Section */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon className="w-4 h-4 text-sky-600" />
                  <h2 className="text-base font-semibold text-gray-800">
                    Profile Picture
                  </h2>
                </div>

                <div
                  {...getRootProps()}
                  className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 ${
                    isUploading
                      ? "border-sky-300 bg-sky-50/30 cursor-wait"
                      : isDragActive
                      ? "border-sky-500 bg-sky-50 scale-[1.02]"
                      : "border-gray-300 hover:border-sky-400 hover:bg-sky-50/50"
                  }`}
                >
                  <input {...getInputProps()} disabled={isUploading} />
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-4 w-full py-2 animate-[fadeIn_0.3s_ease-out]">
                      <div className="flex items-center justify-between w-full mb-1 px-1">
                        <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                          uploadProgress === 100 ? "text-purple-600" : "text-sky-700"
                        }`}>
                          <div className={`w-2 h-2 rounded-full animate-pulse ${
                            uploadProgress === 100 ? "bg-purple-500" : "bg-sky-500"
                          }`}></div>
                          {uploadProgress === 100 ? "Processing..." : "Uploading..."}
                        </span>
                        <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                          uploadProgress === 100 ? "text-purple-700 bg-purple-100" : "text-sky-700 bg-sky-100"
                        }`}>
                          {uploadProgress}%
                        </span>
                      </div>
                      <div className={`w-full h-3 bg-gray-100 rounded-full overflow-hidden border shadow-inner relative ${
                        uploadProgress === 100 ? "border-purple-100" : "border-sky-100"
                      }`}>
                        <div
                          className={`h-full bg-gradient-to-r rounded-full transition-all duration-500 ease-out relative shadow-[0_0_10px_rgba(14,165,233,0.3)] ${
                            uploadProgress === 100 
                              ? "from-purple-500 via-fuchsia-500 to-pink-500" 
                              : "from-sky-400 via-blue-500 to-indigo-600"
                          }`}
                          style={{ width: `${Math.max(uploadProgress, 5)}%` }}
                        >
                          {/* Shimmer Effect */}
                          <div className="absolute inset-0 w-full h-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium">
                        {uploadProgress === 100 
                          ? "Finalizing and saving your profile..." 
                          : "Optimizing and transferring your image"}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-gradient-to-br from-sky-100 to-blue-100 rounded-full">
                        <Upload className="w-5 h-5 text-sky-600" />
                      </div>
                      {isDragActive ? (
                        <p className="text-sky-600 text-sm font-medium">
                          Drop image here...
                        </p>
                      ) : uploadedFile ? (
                        <div className="space-y-0.5">
                          <p className="text-gray-800 text-sm font-medium">
                            📎 {uploadedFile.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            Click or drag to change
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <p className="text-gray-700 text-sm font-medium">
                            Click to upload
                          </p>
                          <p className="text-xs text-gray-500">JPG, PNG, GIF</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN - Password Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-sky-600" />
                <h2 className="text-base font-semibold text-gray-800">
                  Change Password
                </h2>
              </div>

              {/* New Password */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onBlur={() => setPasswordTouched(true)}
                    className="w-full px-3 py-2 pr-10 text-sm border-2 border-gray-200 rounded-lg focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all duration-300"
                    placeholder="Enter new password"
                    disabled={isUploading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4 text-gray-500" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </div>

                {/* Password Requirements */}
                {passwordTouched && newPassword && (
                  <div className="space-y-1 mt-2 animate-[fadeIn_0.3s_ease-out]">
                    <PasswordRequirement
                      met={passwordChecks.length}
                      text="8+ chars"
                    />
                    <PasswordRequirement
                      met={passwordChecks.uppercase}
                      text="1 Uppercase"
                    />
                    <PasswordRequirement
                      met={passwordChecks.lowercase}
                      text="1 Lowercase"
                    />
                    <PasswordRequirement
                      met={passwordChecks.number}
                      text="1 Number"
                    />
                  </div>
                )}

                {newPassword && (
                  <div className="mt-1">
                    <PasswordStrengthBar
                      password={newPassword}
                      barColors={[
                        "#ef4836",
                        "#ff9800",
                        "#ffeb3b",
                        "#2b90ef",
                        "#25c281",
                      ]}
                      scoreWords={[
                        "Too short",
                        "Weak",
                        "Okay",
                        "Good",
                        "Strong",
                        "Excellent",
                      ]}
                      className="h-1"
                    />
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => setConfirmPasswordTouched(true)}
                    className={`w-full px-3 py-2 pr-10 text-sm border-2 rounded-lg outline-none transition-all duration-300 ${
                      showPasswordMismatch
                        ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                        : "border-gray-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    }`}
                    placeholder="Confirm password"
                    disabled={isUploading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4 text-gray-500" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </div>

                {/* Password Mismatch Error */}
                {showPasswordMismatch && (
                  <div className="flex items-center gap-1 text-red-600 text-xs animate-[shake_0.3s_ease-in-out]">
                    <XCircle className="w-3 h-3" />
                    <span>Passwords do not match</span>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className="pt-2">
                <button
                  onClick={handleSave}
                  disabled={!isSaveEnabled || isUploading}
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-300 transform ${
                    isSaveEnabled && !isUploading
                      ? "bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                      : "bg-gray-300 cursor-not-allowed opacity-60"
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    {isUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Picture Modal */}
      {profilePicModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setProfilePicModalOpen(false)}
        >
          {/* Blur Background */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setProfilePicModalOpen(false)}
          ></div>

          {/* Modal Content */}
          <div
            className="relative z-10 flex flex-col items-center animate-[fadeIn_0.3s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setProfilePicModalOpen(false)}
              className="absolute -top-12 right-0 p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-all duration-300 hover:scale-110 z-10"
              aria-label="close modal"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Image Container */}
            <div className="relative max-w-2xl max-h-[80vh] rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
              <img
                src={getAvatarSrc(uploadedFile, user?.profile_picture)}
                alt="profile"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};

// Password Requirement Component
const PasswordRequirement: React.FC<{ met: boolean; text: string }> = ({
  met,
  text,
}) => (
  <div
    className={`flex items-center gap-1.5 text-xs transition-colors duration-300 ${
      met ? "text-green-600" : "text-gray-500"
    }`}
  >
    {met ? (
      <CheckCircle className="w-3 h-3" />
    ) : (
      <div className="w-3 h-3 rounded-full border-2 border-current" />
    )}
    <span>{text}</span>
  </div>
);

export default ProfileSettings;
