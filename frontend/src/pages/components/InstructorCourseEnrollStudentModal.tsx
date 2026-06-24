// InstructorCourseEnrollStudentModal.tsx
import { useState, useMemo } from "react";
import { X, UserPlus, UserMinus, Search, Users, CheckCircle2, AlertCircle } from "lucide-react";
import axios from "axios";
import { getProfilePictureUrl } from "../../utils/imageUtils";

interface Student {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  profile_picture?: string;
  is_enrolled: boolean;
}

interface InstructorEnrollStudentModalProps {
  open: boolean;
  onClose: () => void;
  students: Student[];
  courseId: number;
}

const InstructorCourseEnrollStudentModal = ({
  open,
  onClose,
  students,
  courseId,
}: InstructorEnrollStudentModalProps) => {
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isUnenrollMode, setIsUnenrollMode] = useState(false); // ✨ New state for toggle
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error" | "warning";
  }>({ show: false, message: "", type: "success" });

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    
    const query = searchQuery.toLowerCase();
    return students.filter(
      (student) =>
        (student.first_name || "").toLowerCase().includes(query) ||
        (student.last_name || "").toLowerCase().includes(query) ||
        (student.email || "").toLowerCase().includes(query)
    );
  }, [students, searchQuery]);

  const getInitials = (firstName: string, lastName: string): string => {
    if (!firstName && !lastName) return "?";
    const firstInitial = firstName?.charAt(0) || "";
    const lastInitial = lastName?.charAt(0) || "";
    return `${firstInitial}${lastInitial}`.toUpperCase();
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select only eligible students based on mode
      const eligibleStudents = filteredStudents.filter(s => 
        isUnenrollMode ? s.is_enrolled : !s.is_enrolled
      );
      setSelectedStudents(new Set(eligibleStudents.map((s) => s.user_id)));
    } else {
      setSelectedStudents(new Set());
    }
  };

  const handleSelectStudent = (userId: number, checked: boolean) => {
    const newSelection = new Set(selectedStudents);
    if (checked) {
      newSelection.add(userId);
    } else {
      newSelection.delete(userId);
    }
    setSelectedStudents(newSelection);
  };

  const toggleMode = () => {
    setIsUnenrollMode(!isUnenrollMode);
    setSelectedStudents(new Set()); // Clear selection on mode switch
  };

  const showNotification = (message: string, type: "success" | "error" | "warning") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "success" }), 4000);
  };

  const handleActionClick = () => {
    if (selectedStudents.size === 0) {
      showNotification(`Please select at least one student to ${isUnenrollMode ? "unenroll" : "enroll"}.`, "warning");
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirmAction = async () => {
    setShowConfirmation(false);
    setIsLoading(true);

    try {
      const studentIds = Array.from(selectedStudents);
      const endpoint = isUnenrollMode 
        ? `${import.meta.env.VITE_API_BASE_URL}/api/instructor/unenroll-students/`
        : `${import.meta.env.VITE_API_BASE_URL}/api/instructor/enroll-students/`;

      const response = await axios.post(
        endpoint,
        {
          course_id: courseId,
          student_ids: studentIds,
        }
      );
      
      showNotification(response.data.message || `Students ${isUnenrollMode ? "unenrolled" : "enrolled"} successfully!`, "success");
      setSelectedStudents(new Set());
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        showNotification(
          error.response?.data?.detail || `Error ${isUnenrollMode ? "unenrolling" : "enrolling"} students.`,
          "error"
        );
      } else {
        showNotification("An unexpected error occurred.", "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedStudents(new Set());
    setSearchQuery("");
    setIsUnenrollMode(false);
    onClose();
  };

  if (!open) return null;

  // Calculate if all eligible students are selected
  const eligibleStudents = filteredStudents.filter(s => 
    isUnenrollMode ? s.is_enrolled : !s.is_enrolled
  );
  
  const allFilteredSelected =
    eligibleStudents.length > 0 &&
    eligibleStudents.every((s) => selectedStudents.has(s.user_id));

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden">
          {/* Header */}
          <div className={`px-5 py-4 flex items-center justify-between border-b border-gray-200 transition-colors duration-300 ${
            isUnenrollMode ? "bg-gradient-to-r from-red-50 to-orange-50" : "bg-gradient-to-r from-emerald-50 to-teal-50"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 transition-colors duration-300 ${
                isUnenrollMode ? "bg-red-500" : "bg-emerald-500"
              }`}>
                {isUnenrollMode ? <UserMinus className="w-5 h-5 text-white" /> : <UserPlus className="w-5 h-5 text-white" />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {isUnenrollMode ? "Unenroll Students" : "Enroll Students"}
                </h2>
                <p className="text-sm text-gray-600">
                  {selectedStudents.size} student{selectedStudents.size !== 1 ? "s" : ""} selected
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
               {/* Mode Toggle Switch */}
               <div className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-full border border-gray-200">
                  <span className={`text-xs font-semibold ${!isUnenrollMode ? "text-emerald-700" : "text-gray-400"}`}>Enroll</span>
                  <button 
                    onClick={toggleMode}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      isUnenrollMode ? 'bg-red-500 focus:ring-red-500' : 'bg-emerald-500 focus:ring-emerald-500'
                    }`}
                  >
                    <span className="sr-only">Toggle Unenroll Mode</span>
                    <span
                      className={`${
                        isUnenrollMode ? 'translate-x-6' : 'translate-x-1'
                      } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                    />
                  </button>
                  <span className={`text-xs font-semibold ${isUnenrollMode ? "text-red-700" : "text-gray-400"}`}>Unenroll</span>
               </div>

              <button
                onClick={handleClose}
                className="text-gray-600 hover:bg-gray-200 rounded-lg p-1.5 transition-all duration-200 hover:rotate-90"
                disabled={isLoading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className={`w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all text-sm text-gray-900 placeholder-gray-400 ${
                  isUnenrollMode ? "focus:ring-red-500" : "focus:ring-emerald-500"
                }`}
              />
            </div>
          </div>

          {/* Student List */}
          <div className="overflow-y-auto max-h-[calc(85vh-260px)]">
            {filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Users className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">
                  {searchQuery ? "No students found matching your search." : "No students available."}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className={`sticky top-0 z-10 ${
                  isUnenrollMode ? "bg-gradient-to-r from-red-100 to-orange-100" : "bg-gradient-to-r from-emerald-100 to-teal-100"
                }`}>
                  <tr>
                    <th className="w-12 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className={`w-4 h-4 bg-white border-gray-300 rounded focus:ring-2 cursor-pointer ${
                          isUnenrollMode ? "text-red-600 focus:ring-red-500" : "text-emerald-600 focus:ring-emerald-500"
                        }`}
                      />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredStudents.map((student) => {
                    const isSelected = selectedStudents.has(student.user_id);
                    const profilePictureUrl = getProfilePictureUrl(
                      student.profile_picture
                    );
                    
                    // Determine if row is disabled/selectable based on mode
                    // Enroll Mode: Can select only unenrolled (!is_enrolled)
                    // Unenroll Mode: Can select only enrolled (is_enrolled)
                    const isSelectable = isUnenrollMode ? student.is_enrolled : !student.is_enrolled;
                    const isDisabled = !isSelectable;
                    
                    // Visual state:
                    // If disabled in Enroll Mode (already enrolled): Checked, Grayed out
                    // If disabled in Unenroll Mode (not enrolled): Unchecked, Grayed out
                    const isChecked = isSelected || (!isUnenrollMode && student.is_enrolled);

                    return (
                      <tr
                        key={student.user_id}
                        className={`transition-colors ${
                          isDisabled 
                            ? "bg-gray-100 opacity-60 cursor-not-allowed" 
                            : `cursor-pointer hover:bg-gray-50 ${isSelected ? (isUnenrollMode ? "bg-red-50" : "bg-emerald-50") : ""}`
                        }`}
                        onClick={() => {
                          if (!isDisabled) handleSelectStudent(student.user_id, !isSelected);
                        }}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isDisabled}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleSelectStudent(student.user_id, e.target.checked);
                            }}
                            className={`w-4 h-4 bg-white border-gray-300 rounded focus:ring-2 ${
                              isDisabled ? "cursor-not-allowed text-gray-400" : "cursor-pointer"
                            } ${
                                isUnenrollMode ? "text-red-600 focus:ring-red-500" : "text-emerald-600 focus:ring-emerald-500"
                            }`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {profilePictureUrl ? (
                              <img
                                src={profilePictureUrl}
                                alt={`${student.first_name} ${student.last_name}`}
                                className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                              />
                            ) : (
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold border-2 border-gray-200 ${
                                isUnenrollMode 
                                  ? "bg-gradient-to-br from-red-500 to-orange-600"
                                  : "bg-gradient-to-br from-emerald-500 to-teal-600"
                              }`}>
                                {getInitials(student.first_name, student.last_name)}
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {student.first_name} {student.last_name}
                              </p>
                              <p className="text-xs text-gray-500">{student.email}</p>
                            </div>
                          </div>
                        </td>
                         <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                student.is_enrolled 
                                ? "bg-green-100 text-green-800" 
                                : "bg-gray-100 text-gray-800"
                            }`}>
                                {student.is_enrolled ? "Enrolled" : "Not Enrolled"}
                            </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className={`px-5 py-4 border-t border-gray-200 flex justify-between items-center transition-colors duration-300 ${
             isUnenrollMode ? "bg-gradient-to-r from-red-50 to-orange-50" : "bg-gradient-to-r from-emerald-50 to-teal-50"
          }`}>
            <p className="text-sm text-gray-600">
              {filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""} available
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleActionClick}
                disabled={selectedStudents.size === 0 || isLoading}
                className={`px-5 py-2 text-white rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2 ${
                    isUnenrollMode 
                        ? "bg-red-600 hover:bg-red-700" 
                        : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {isUnenrollMode ? "Unenrolling..." : "Enrolling..."}
                  </>
                ) : (
                  <>
                    {isUnenrollMode ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    {isUnenrollMode ? "Unenroll Selected" : "Enroll Selected"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className={`px-5 py-4 border-b border-gray-200 ${
                isUnenrollMode ? "bg-gradient-to-r from-red-50 to-orange-50" : "bg-gradient-to-r from-emerald-50 to-teal-50"
            }`}>
              <h3 className="text-lg font-bold text-gray-800">
                  {isUnenrollMode ? "Confirm Unenrollment" : "Confirm Enrollment"}
              </h3>
            </div>
            <div className="p-5">
              <p className="text-gray-700 mb-4">
                Are you sure you want to {isUnenrollMode ? "unenroll" : "enroll"}{" "}
                <span className={`font-semibold ${isUnenrollMode ? "text-red-600" : "text-emerald-600"}`}>
                  {selectedStudents.size} student{selectedStudents.size !== 1 ? "s" : ""}
                </span>{" "}
                {isUnenrollMode ? "from" : "in"} this course?
              </p>
            </div>
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-5 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className={`px-5 py-2 text-white rounded-lg transition-all duration-200 font-medium flex items-center gap-2 ${
                    isUnenrollMode 
                        ? "bg-red-600 hover:bg-red-700" 
                        : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-[70] animate-in slide-in-from-top-2">
          <div
            className={`rounded-lg shadow-lg px-5 py-3 flex items-center gap-3 ${
              notification.type === "success"
                ? "bg-green-50 border border-green-200"
                : notification.type === "error"
                ? "bg-red-50 border border-red-200"
                : "bg-yellow-50 border border-yellow-200"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            )}
            <p
              className={`text-sm font-medium ${
                notification.type === "success"
                  ? "text-green-800"
                  : notification.type === "error"
                  ? "text-red-800"
                  : "text-yellow-800"
              }`}
            >
              {notification.message}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default InstructorCourseEnrollStudentModal;