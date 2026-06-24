import {
  X,
  UserPlus,
  Mail,
  User,
  Shield,
  BookOpen,
  AlertCircle,
  Save,
  Lock,
  Eye,
  EyeOff,
  Check,
  Circle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { User as UserType } from "../../types/user";
import axios from "axios";
import PasswordStrengthBar from "../../components/PasswordStrengthBar";
import { useAuth } from "../../context/AuthContext";

export default function AdminCreateUserModal({
  open,
  onClose,
  onSaveUser,
  users,
}: {
  open: boolean;
  onClose: () => void;
  onSaveUser: (newUser: UserType) => void;
  users: UserType[];
}) {
  const { user: currentUser } = useAuth();
  const [form, setForm] = useState({
    user_id: 0,
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    confirm_password: "",
    user_type: "Student" as UserType["user_type"],
    program: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Password validation criteria
  const passwordValidations = {
    length: form.password.length >= 8,
    uppercase: /[A-Z]/.test(form.password),
    lowercase: /[a-z]/.test(form.password),
    number: /\d/.test(form.password),
  };

  const isPasswordValid =
    passwordValidations.length &&
    passwordValidations.uppercase &&
    passwordValidations.lowercase &&
    passwordValidations.number;

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  } | null>(null);
  const [userTypes, setUserTypes] = useState<string[]>([]);
  const [programs, setPrograms] = useState<string[]>([]);

  // Track which fields have been touched
  const [touched, setTouched] = useState({
    email: false,
    first_name: false,
    last_name: false,
    password: false,
    confirm_password: false,
  });

  useEffect(() => {
    const fetchChoices = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/api/admin/get/user-choices/`,
          { withCredentials: true }
        );
        
        let fetchedUserTypes = response.data.user_types;
        // Filter out Superadmin and Administrator if the current user is not a Superadmin
        if (currentUser?.user_type !== "Superadmin") {
          fetchedUserTypes = fetchedUserTypes.filter((type: string) => type !== "Superadmin" && type !== "Administrator");
        }
        
        setUserTypes(fetchedUserTypes);
        const fetchedPrograms = response.data.programs;
        setPrograms(fetchedPrograms);
        if (fetchedPrograms.length > 0) {
          setForm((prev) => ({
            ...prev,
            program: prev.program || fetchedPrograms[0],
          }));
        }
      } catch (error) {
        console.error("Failed to fetch user choices", error);
        setSnackbar({
          open: true,
          message: "Failed to load form data. Please try again.",
          severity: "error",
        });
      }
    };

    if (open) {
      fetchChoices();
      const nextId = computeNextUserId();
      setForm((prev) => ({ ...prev, user_id: nextId }));
    }
  }, [open, users, currentUser]);

  const computeNextUserId = () => {
    if (!users || users.length === 0) {
      const year = new Date().getFullYear();
      return parseInt(`${year}000`);
    }
    const currentYear = new Date().getFullYear();
    const yearUsers = users.filter((u) =>
      u.user_id.toString().startsWith(`${currentYear}`)
    );
    if (yearUsers.length === 0) {
      return parseInt(`${currentYear}000`);
    }
    const maxId = Math.max(...yearUsers.map((u) => u.user_id));
    return maxId + 1;
  };

  const handleChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
  };

  const handleBlur = (field: "email" | "first_name" | "last_name" | "password" | "confirm_password") => {
    setTouched({ ...touched, [field]: true });
  };

  const handleSave = async () => {
    if (form.password !== form.confirm_password) {
      setSnackbar({
        open: true,
        message: "Passwords do not match.",
        severity: "error",
      });
      return;
    }

    if (!isPasswordValid) {
      setSnackbar({
        open: true,
        message: "Password does not meet all requirements.",
        severity: "error",
      });
      return;
    }

    setLoading(true);
    const newUserPayload = {
      user_id: form.user_id,
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      password: form.password,
      user_type: form.user_type,
      program: form.program,
    };

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/admin/create-user/`,
        newUserPayload,
        { withCredentials: true }
      );

      onSaveUser(response.data);

      setSnackbar({
        open: true,
        message: "User created successfully!",
        severity: "success",
      });

      setForm({
        user_id: 0,
        email: "",
        first_name: "",
        last_name: "",
        password: "",
        confirm_password: "",
        user_type: "Student",
        program: "",
      });
      setTouched({
        email: false,
        first_name: false,
        last_name: false,
        password: false,
        confirm_password: false,
      });

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setSnackbar({
          open: true,
          message: error.response?.data?.detail || error.message,
          severity: "error",
        });
      } else {
        setSnackbar({
          open: true,
          message: "An unexpected error occurred",
          severity: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Email validation function
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
    return emailRegex.test(email);
  };

  // Check if form is valid
  const isFormValid = () => {
    return (
      form.email.trim() !== "" &&
      form.first_name.trim() !== "" &&
      form.last_name.trim() !== "" &&
      form.password !== "" &&
      form.password === form.confirm_password &&
      isPasswordValid &&
      isValidEmail(form.email)
    );
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 flex items-center justify-between border-b border-gray-200">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-gray-800" />
              <h2 className="text-lg font-bold text-gray-800">
                Create New User
              </h2>
            </div>
            <button
              onClick={() => {
                setForm({
                  user_id: 0,
                  email: "",
                  first_name: "",
                  last_name: "",
                  password: "",
                  confirm_password: "",
                  user_type: "Student",
                  program: "",
                });
                setTouched({
                  email: false,
                  first_name: false,
                  last_name: false,
                  password: false,
                  confirm_password: false,
                });
                onClose();
              }}
              className="text-gray-600 hover:bg-gray-200 rounded-lg p-1.5 transition-all duration-200 hover:rotate-90"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <form className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Warning message */}
            <div className="mb-4 flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-800">
                Warning: This action cannot be undone. Please double check your
                inputs before proceeding to create a new user account
                {form.first_name && form.last_name && (
                  <>
                    {" "}
                    for:{" "}
                    <strong>
                      {form.first_name} {form.last_name}
                    </strong>
                  </>
                )}
                .
              </p>
            </div>

            <div className="space-y-3">
              {/* Email Field */}
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
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    onBlur={() => handleBlur("email")}
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-400"
                    placeholder="user@gmail.com"
                  />
                </div>
                {touched.email && form.email.trim() === "" && (
                  <p className="text-xs text-red-600 mt-1">
                    Email is required.
                  </p>
                )}
                {touched.email &&
                  form.email.trim() !== "" &&
                  !isValidEmail(form.email) && (
                    <p className="text-xs text-red-600 mt-1">
                      Please enter a valid email address.
                    </p>
                  )}
              </div>

              {/* First Name Field */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={form.first_name}
                    onChange={(e) => handleChange("first_name", e.target.value)}
                    onBlur={() => handleBlur("first_name")}
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-400"
                    placeholder="Enter first name"
                  />
                </div>
                {touched.first_name && form.first_name.trim() === "" && (
                  <p className="text-xs text-red-600 mt-1">
                    First name is required.
                  </p>
                )}
              </div>

              {/* Last Name Field */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={form.last_name}
                    onChange={(e) => handleChange("last_name", e.target.value)}
                    onBlur={() => handleBlur("last_name")}
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-400"
                    placeholder="Enter last name"
                  />
                </div>
                {touched.last_name && form.last_name.trim() === "" && (
                  <p className="text-xs text-red-600 mt-1">
                    Last name is required.
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={form.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    onBlur={() => handleBlur("password")}
                    className="block w-full pl-9 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none placeholder:text-gray-400"
                    placeholder="Min. 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {form.password && (
                  <div className="mt-2 space-y-2">
                    <PasswordStrengthBar
                      password={form.password}
                    />
                    
                    {/* Checklist */}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className={`flex items-center gap-1.5 text-[11px] ${passwordValidations.length ? 'text-green-600' : 'text-gray-500'}`}>
                        {passwordValidations.length ? <Check className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                        8+ characters
                      </div>
                      <div className={`flex items-center gap-1.5 text-[11px] ${passwordValidations.uppercase ? 'text-green-600' : 'text-gray-500'}`}>
                        {passwordValidations.uppercase ? <Check className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                        Uppercase
                      </div>
                      <div className={`flex items-center gap-1.5 text-[11px] ${passwordValidations.lowercase ? 'text-green-600' : 'text-gray-500'}`}>
                        {passwordValidations.lowercase ? <Check className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                        Lowercase
                      </div>
                      <div className={`flex items-center gap-1.5 text-[11px] ${passwordValidations.number ? 'text-green-600' : 'text-gray-500'}`}>
                        {passwordValidations.number ? <Check className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                        Number
                      </div>
                    </div>
                  </div>
                )}
                {touched.password && form.password === "" && (
                  <p className="text-xs text-red-600">Password is required.</p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={form.confirm_password}
                    onChange={(e) =>
                      handleChange("confirm_password", e.target.value)
                    }
                    onBlur={() => handleBlur("confirm_password")}
                    className="block w-full pl-9 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none placeholder:text-gray-400"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {touched.confirm_password &&
                  form.password !== form.confirm_password && (
                    <p className="text-xs text-red-600">
                      Passwords do not match.
                    </p>
                  )}
              </div>

              {/* User Type Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  User Type <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Shield className="h-4 w-4 text-gray-400" />
                  </div>
                  <select
                    value={form.user_type}
                    onChange={(e) => handleChange("user_type", e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white"
                  >
                    {userTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Program Dropdown (only for students) */}
              {form.user_type === "Student" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Program
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <BookOpen className="h-4 w-4 text-gray-400" />
                    </div>
                    <select
                      value={form.program}
                      onChange={(e) => handleChange("program", e.target.value)}
                      className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white"
                    >
                      {programs.map((program) => (
                        <option key={program} value={program}>
                          {program}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </form>

          {/* Footer */}
          <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setForm({
                  user_id: 0,
                  email: "",
                  first_name: "",
                  last_name: "",
                  password: "",
                  confirm_password: "",
                  user_type: "Student",
                  program: "",
                });
                setTouched({
                  email: false,
                  first_name: false,
                  last_name: false,
                  password: false,
                  confirm_password: false,
                });
                onClose();
              }}
              disabled={loading}
              className="px-5 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-all duration-200 font-medium hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isFormValid() || loading}
              className="group relative overflow-hidden px-5 py-2 bg-blue-600 text-white rounded-lg
             hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm
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

              {/* Content */}
              <span className="relative z-10 flex items-center gap-2">
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save User
                  </>
                )}
              </span>
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
