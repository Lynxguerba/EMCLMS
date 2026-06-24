import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Eye, EyeOff, X, Lock, Mail } from "lucide-react";
import UserResetPasswordModal from "./components/UserResetPasswordModal";
import RegisterModal from "./components/RegisterModal";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const navigate = useNavigate();
  const { login, user, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // Redirect if user is already logged in
  useEffect(() => {
    if (!loading && user) {
      if (user.user_type === "Student") {
        navigate("/StudentDashboard");
      } else if (user.user_type === "Instructor") {
        navigate("/InstructorDashboard");
      } else if (user.user_type === "Librarian") {
        navigate("/LibrarianDashboard");
      } else if (user.user_type === "Administrator" || user.user_type === "Superadmin") {
        navigate("/AdminDashboard");
      } else if (user.user_type === "Accounting") {
        navigate("/AccountingDashboard");
      }
    }
  }, [user, loading, navigate]);

  // Custom validation states
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  // Custom validation functions
  const validateEmail = (value: string) => {
    if (!value.trim()) {
      setEmailError("Email is required");
      return false;
    }
    // Basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError("Invalid email format");
      return false;
    }
    setEmailError("");
    return true;
  };

  const validatePassword = (value: string) => {
    if (!value) {
      setPasswordError("Password is required");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const handleEmailBlur = () => {
    if (email) {
      validateEmail(email);
    }
  };

  const handlePasswordBlur = () => {
    if (password) {
      validatePassword(password);
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate all fields
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setIsLoading(true);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/login/`,
        { email: email, password },
        { withCredentials: true }
      );

      const userData = res.data;
      if (!userData || !userData.user_type) {
        throw new Error("Invalid login response");
      }

      // Update global auth state
      login(userData);

      if (userData.user_type === "Student") {
        try {
          await axios.post(
            `${
              import.meta.env.VITE_API_BASE_URL
            }/api/student/post/add-student-log/`,
            { message: "Logged in" },
            { withCredentials: true }
          );
        } catch (logErr) {
          console.error("Failed to create student login log:", logErr);
        }
        navigate("/StudentDashboard");
      } else if (userData.user_type === "Instructor") {
        try {
          await axios.post(
            `${
              import.meta.env.VITE_API_BASE_URL
            }/api/instructor/post/add-instructor-log/`,
            { message: "Logged in" },
            { withCredentials: true }
          );
        } catch (logErr) {
          console.error("Failed to create instructor login log:", logErr);
        }
        navigate("/InstructorDashboard");
      } else if (userData.user_type === "Librarian") {
        navigate("/LibrarianDashboard");
      } else if (userData.user_type === "Administrator" || userData.user_type === "Superadmin") {
        navigate("/AdminDashboard");
      } else if (userData.user_type === "Accounting") {
        navigate("/AccountingDashboard");
      }
    } catch (err: any) {
      if (err.response && err.response.status === 429) {
        setErrorMessage("Too many login attempts. Please wait a moment.");
      } else {
        setErrorMessage("Invalid credentials");
      }
      setErrorOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* RegisterModal */}
      <RegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
      />

      {/* Main Container */}
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8">
        {/* Background Image with Reduced Opacity */}
        <div
          className="absolute inset-0 bg-cover bg-center blur-md scale-110"
          style={{ backgroundImage: "url('/emc_campus.JPG')" }}
        ></div>

        {/* Bottom Shadow Gradient Effect */}
        <div className="absolute bottom-0 left-0 right-0 h-full bg-gradient-to-t from-blue-950/90 via-blue-900/30 to-transparent pointer-events-none"></div>

        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden"></div>

        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-900 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-800 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-blue-950 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        {/* Login Card */}
        <div className="relative w-full max-w-md z-10">
          {/* Pulse Animation Circles Behind Card - Emergency Style */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute w-[500px] h-[500px] bg-blue-500/10 rounded-full animate-emergency-pulse"></div>
            <div className="absolute w-[500px] h-[500px] bg-blue-500/10 rounded-full animate-emergency-pulse animation-delay-1000"></div>
            <div className="absolute w-[500px] h-[500px] bg-blue-500/10 rounded-full animate-emergency-pulse animation-delay-2000"></div>
          </div>

          <div
            className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8 transform transition-all duration-300 hover:shadow-3xl border border-white/20 w-full"
            style={{
              boxShadow:
                "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
            }}
          >
            {/* Logo and Welcome Section */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-4 group cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-300 to-blue-400 rounded-full blur-xl opacity-60 animate-pulse group-hover:opacity-80 transition-opacity duration-300"></div>
                <img
                  src="/emc_logo.png"
                  alt="EMC Logo"
                  className="relative w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-full bg-white p-2 shadow-lg ring-4 ring-blue-900/20 transform transition-all duration-300 group-hover:scale-110 group-hover:ring-8 group-hover:ring-blue-900/30"
                />
              </div>
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-900 via-blue-800 to-blue-950 bg-clip-text text-transparent mb-1">
                Welcome!
              </h1>
              <p className="text-gray-600 text-xs sm:text-sm text-center">
                Sign in to access your account
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              {/* Email Input */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Email
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail
                      className={`w-5 h-5 transition-colors duration-200 ${
                        emailError
                          ? "text-red-500"
                          : "text-gray-400 group-focus-within:text-blue-900"
                      }`}
                    />
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError("");
                    }}
                    onBlur={handleEmailBlur}
                    className={`w-full pl-12 pr-4 py-2.5 border-2 rounded-xl focus:ring-4 transition-all duration-200 outline-none text-gray-800 placeholder-gray-400 bg-gray-50/50 hover:bg-white ${
                      emailError
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                        : "border-gray-200 focus:border-blue-900 focus:ring-blue-900/20 hover:border-gray-300"
                    }`}
                    placeholder="Enter your Email"
                  />
                </div>
                {emailError && (
                  <p className="text-red-600 text-sm mt-1 flex items-center gap-1 animate-in slide-in-from-top-1 duration-200">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {emailError}
                  </p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock
                      className={`w-5 h-5 transition-colors duration-200 ${
                        passwordError
                          ? "text-red-500"
                          : "text-gray-400 group-focus-within:text-blue-900"
                      }`}
                    />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError("");
                    }}
                    onBlur={handlePasswordBlur}
                    className={`w-full pl-12 pr-14 py-2.5 border-2 rounded-xl focus:ring-4 transition-all duration-200 outline-none text-gray-800 placeholder-gray-400 bg-gray-50/50 hover:bg-white ${
                      passwordError
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                        : "border-gray-200 focus:border-blue-900 focus:ring-blue-900/20 hover:border-gray-300"
                    }`}
                    placeholder="Enter your Password"
                  />
                  <button
                    type="button"
                    onClick={handleTogglePassword}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 hover:bg-blue-50 rounded-lg transition-all duration-200 group"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-gray-500 group-hover:text-blue-900 transition-colors duration-200" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-500 group-hover:text-blue-900 transition-colors duration-200" />
                    )}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-red-600 text-sm mt-1 flex items-center gap-1 animate-in slide-in-from-top-1 duration-200">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {passwordError}
                  </p>
                )}
                <div className="text-left mt-2">
                  <UserResetPasswordModal />
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-900 via-blue-800 to-blue-950 hover:from-blue-950 hover:via-blue-900 hover:to-blue-950 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl hover:shadow-gray-500/50 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mt-6 relative overflow-hidden group"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
                {isLoading ? (
                  <span className="flex items-center justify-center relative z-10">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  <span className="relative z-10">Sign In</span>
                )}
              </button>

              {/* Divider with Or */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gray-300"></div>
                <span className="text-gray-500 text-sm font-medium">or</span>
                <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gray-300"></div>
              </div>

              {/* Register as Text Button */}
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(true)}
                disabled={isLoading}
                className="w-full text-blue-900 font-semibold py-3 hover:text-blue-950 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Please wait..." : "Register Account"}
              </button>
            </form>
          </div>
          {/* Footer */}
          <div className="mt-3 text-center">
            <p className="text-white text-xs font-medium tracking-wide">
              © 2025 EMC · LMS
            </p>
          </div>

          {/* Decorative Elements */}
          <div className="absolute -z-10 top-0 left-0 w-full h-full bg-gradient-to-br from-blue-900/30 to-blue-950/30 rounded-3xl blur-2xl transform -translate-y-2"></div>
        </div>
      </div>

      {/* Error Toast Notification */}
      {errorOpen && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 error-toast-enter">
          <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-[300px] max-w-md border border-red-400/20 relative overflow-hidden">
            {/* Animated shine effect */}
            <div className="absolute inset-0 shine-effect"></div>

            {/* Pulsing glow border */}
            <div className="absolute inset-0 rounded-xl border-2 border-red-300/50 pulse-glow"></div>

            <div className="flex-shrink-0 relative z-10 icon-shake">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
            </div>
            <p className="flex-1 font-medium relative z-10">{errorMessage}</p>
            <button
              onClick={() => setErrorOpen(false)}
              className="flex-shrink-0 hover:bg-red-700/50 rounded-lg p-1 transition-colors duration-200 relative z-10 hover:rotate-90 transition-transform"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animation-delay-1000 {
          animation-delay: 1s;
        }
        @keyframes pulseRing {
          0% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          50% {
            transform: scale(1);
            opacity: 0.3;
          }
          100% {
            transform: scale(1.2);
            opacity: 0;
          }
        }
        .animate-pulse-ring {
          animation: pulseRing 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes emergencyPulse {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
        .animate-emergency-pulse {
          animation: emergencyPulse 2s ease-out infinite;
        }
      `}</style>
    </>
  );
}

export default LoginPage;
