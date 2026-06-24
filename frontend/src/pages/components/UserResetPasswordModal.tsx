import React from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import { X, Mail, AlertCircle, CheckCircle } from "lucide-react";

const UserResetPasswordModal = () => {
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [touched, setTouched] = React.useState(false);

  const [snackbarOpen, setSnackbarOpen] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState("");
  const [snackbarSeverity, setSnackbarSeverity] = React.useState<"info" | "error">("info");

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setEmail("");
    setEmailError(null);
    setTouched(false);
  };

  const validateEmail = (value: string) => {
    if (!value) {
      setEmailError("Email is required");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError("Enter a valid email address");
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleSend = async () => {
    setTouched(true);
    
    if (!validateEmail(email)) return;

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/post/password-reset-request/`,
        { email }
      );

      setSnackbarMessage(
        response.data.detail ||
          "If the email exists, we've sent a password reset link."
      );
      setSnackbarSeverity("info");
    } catch (error: any) {
      console.error("Error requesting password reset:", error);

      if (error.response) {
        setSnackbarMessage(
          error.response.data.detail ||
            "Something went wrong. Please try again."
        );
      } else if (error.request) {
        setSnackbarMessage("Network error. Please check your connection.");
      } else {
        setSnackbarMessage("Unexpected error occurred.");
      }

      setSnackbarSeverity("error");
    } finally {
      setSnackbarOpen(true);
      handleClose();
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Modal content to be rendered in a portal
  const modalContent = open ? (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
      {/* Modal Content */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-start items-center mb-6">
          <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-900 via-blue-800 to-blue-950 bg-clip-text text-transparent">
            Reset Password
          </h2>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-6 leading-relaxed text-justify">
          Enter your email address and click 'Send'. Once sent, please visit
          an administrator to confirm your identity and complete the password
          reset process.
        </p>

        {/* Email Input */}
        <div className="space-y-2 mb-6">
          <label
            htmlFor="reset-email"
            className="block text-sm font-semibold text-gray-700 text-left"
          >
            Email Address
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className={`w-5 h-5 transition-colors duration-200 ${
                emailError 
                  ? 'text-red-500' 
                  : 'text-gray-400 group-focus-within:text-blue-900'
              }`} />
            </div>
            <input
              type="email"
              id="reset-email"
              value={email}
              onChange={(e) => {
                const value = e.target.value;
                setEmail(value);
                if (touched) {
                  validateEmail(value);
                }
              }}
              onBlur={() => {
                setTouched(true);
                validateEmail(email);
              }}
              className={`w-full pl-12 pr-4 py-3.5 border-2 rounded-xl transition-all duration-200 outline-none placeholder-gray-400 ${
                emailError && touched
                  ? 'border-red-500 focus:ring-4 focus:ring-red-500/20 bg-red-50'
                  : 'border-gray-200 focus:border-blue-900 focus:ring-4 focus:ring-blue-900/20 bg-gray-50 hover:bg-white hover:border-gray-300'
              }`}
              placeholder="your.email@gmail.com"
            />
          </div>
          {/* Error Message */}
          {emailError && touched && (
            <p className="text-red-600 text-sm mt-2 flex items-center gap-1.5 animate-in slide-in-from-top-1 duration-200">
              <AlertCircle className="w-4 h-4" />
              {emailError}
            </p>
          )}
          {/* Helper Text (when no error) */}
          {!emailError && email && touched && (
            <p className="text-green-600 text-sm mt-2 flex items-center gap-1.5 animate-in slide-in-from-top-1 duration-200">
              <CheckCircle className="w-4 h-4" />
              Email format is valid
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-950 hover:from-blue-950 hover:via-blue-900 hover:to-blue-950 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:shadow-gray-500/50 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 relative overflow-hidden group"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
            <span className="relative z-10">Send</span>
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Forgot Password Link */}
      <button
        type="button"
        onClick={handleOpen}
        className="text-sm text-blue-900 hover:text-blue-700 font-medium hover:underline transition-colors duration-200"
      >
        Forgot Password?
      </button>

      {/* Render modal in portal to escape parent container */}
      {modalContent && ReactDOM.createPortal(modalContent, document.body)}

      {/* Snackbar Notification */}
      {snackbarOpen && ReactDOM.createPortal(
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[10000] animate-in slide-in-from-bottom-5 duration-300">
          <div className={`px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-[300px] max-w-md border ${
            snackbarSeverity === "error"
              ? "bg-gradient-to-r from-red-600 to-rose-600 text-white border-red-400/20"
              : "bg-gradient-to-r from-blue-900 via-blue-800 to-blue-950 text-white border-blue-400/20"
          }`}>
            <div className="flex-shrink-0">
              {snackbarSeverity === "error" ? (
                <AlertCircle className="w-6 h-6" />
              ) : (
                <CheckCircle className="w-6 h-6" />
              )}
            </div>
            <p className="flex-1 font-medium">{snackbarMessage}</p>
            <button
              onClick={handleSnackbarClose}
              className={`flex-shrink-0 rounded-lg p-1 transition-colors duration-200 ${
                snackbarSeverity === "error"
                  ? "hover:bg-red-700/50"
                  : "hover:bg-blue-950/50"
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default UserResetPasswordModal;