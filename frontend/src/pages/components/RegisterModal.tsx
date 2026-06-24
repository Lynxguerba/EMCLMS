import React, { useState } from "react";
import { X, Mail, User } from "lucide-react";
import axios from "axios";

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function RegisterModal({ isOpen, onClose }: RegisterModalProps) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim())
      newErrors.first_name = "First name is required";
    if (!formData.last_name.trim())
      newErrors.last_name = "Last name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = "Invalid email format";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/post/register/`,
        formData
      );

      setSuccessMessage("Registration successful! Please sign in.");
      setTimeout(() => {
        onClose();
        setFormData({
          first_name: "",
          last_name: "",
          email: "",
        });
        setSuccessMessage("");
      }, 2000);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setErrors({
          submit: err.response.data.detail || "Registration failed.",
        });
      } else {
        setErrors({
          submit: "Registration failed. Please try again.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Blur Background */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8 transform animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-all duration-200"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6 text-center mb-5">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-900 via-blue-800 to-blue-950 bg-clip-text text-transparent">
            Register Account
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Join EMC LMS to get started
          </p>
        </div>

        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {successMessage}
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          {/* First Name & Last Name Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                First Name
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User
                    className={`w-4 h-4 ${
                      errors.first_name
                        ? "text-red-500"
                        : "text-gray-400 group-focus-within:text-blue-900"
                    }`}
                  />
                </div>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 py-2 border-2 rounded-lg outline-none text-sm transition-all ${
                    errors.first_name
                      ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                      : "border-gray-200 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20"
                  }`}
                  placeholder="First Name"
                />
              </div>
              {errors.first_name && (
                <p className="text-red-600 text-xs">{errors.first_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Last Name
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User
                    className={`w-4 h-4 ${
                      errors.last_name
                        ? "text-red-500"
                        : "text-gray-400 group-focus-within:text-blue-900"
                    }`}
                  />
                </div>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 py-2 border-2 rounded-lg outline-none text-sm transition-all ${
                    errors.last_name
                      ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                      : "border-gray-200 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20"
                  }`}
                  placeholder="Last Name"
                />
              </div>
              {errors.last_name && (
                <p className="text-red-600 text-xs">{errors.last_name}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Email
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail
                  className={`w-4 h-4 ${
                    errors.email
                      ? "text-red-500"
                      : "text-gray-400 group-focus-within:text-blue-900"
                  }`}
                />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-3 py-2 border-2 rounded-lg outline-none text-sm transition-all ${
                  errors.email
                    ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                    : "border-gray-200 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20"
                }`}
                placeholder="your@email.com"
              />
            </div>
            {errors.email && (
              <p className="text-red-600 text-xs">{errors.email}</p>
            )}
          </div>

          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {errors.submit}
            </div>
          )}

          {/* Submit Button with Shine Effect */}
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="relative w-full bg-gradient-to-r from-blue-900 via-blue-800 to-blue-950 hover:from-blue-950 hover:via-blue-900 hover:to-blue-950 text-white font-semibold py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-6 overflow-hidden group"
          >
            <span className="relative z-10">
              {isLoading ? "Creating Account..." : "Submit"}
            </span>
            {/* Shine Effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"></div>
          </button>

          <p className="text-center text-gray-600 text-sm">
            Already have an account?{" "}
            <button
              type="button"
              onClick={onClose}
              className="text-blue-900 font-semibold hover:underline"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterModal;
