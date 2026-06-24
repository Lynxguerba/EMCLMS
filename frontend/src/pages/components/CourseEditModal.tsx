import React, { useState, useEffect } from "react";
import { X, Save, Type, FileText, AlertCircle, Hash } from "lucide-react";
import { useUpdateCourse } from "../../hooks/useQueries";

import { CourseSchedule } from "../../types/course";
import WeeklyScheduleGrid from "./WeeklyScheduleGrid";

interface CourseEditModalProps {
  open: boolean;
  onClose: () => void;
  course: {
    course_id: number;
    course_code: string;
    course_title: string;
    course_description: string;
    schedules?: CourseSchedule[];
  };
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

const CourseEditModal: React.FC<CourseEditModalProps> = ({ 
  open, 
  onClose, 
  course,
  onSuccess,
  onError
}) => {
  const [code, setCode] = useState(course.course_code);
  const [title, setTitle] = useState(course.course_title);
  const [description, setDescription] = useState(course.course_description || "");
  const [schedules, setSchedules] = useState<CourseSchedule[]>(course.schedules || []);
  const [touched, setTouched] = useState({ code: false, title: false });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const updateCourseMutation = useUpdateCourse(course.course_id);

  useEffect(() => {
    if (open) {
      setCode(course.course_code);
      setTitle(course.course_title);
      setDescription(course.course_description || "");
      setSchedules(course.schedules || []);
      setTouched({ code: false, title: false });
    }
  }, [open, course]);

  const addSchedule = () => {
    setSchedules([...schedules, { day_of_week: "Monday", start_time: "08:00", end_time: "09:00" }]);
  };

  const removeSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const updateSchedule = (index: number, field: keyof CourseSchedule, value: string) => {
    const newSchedules = [...schedules];
    newSchedules[index] = { ...newSchedules[index], [field]: value };
    setSchedules(newSchedules);
  };

  if (!open) return null;

  const handleSave = async () => {
    if (!code.trim() || !title.trim()) {
      setTouched({ code: true, title: true });
      return;
    }

    try {
      await updateCourseMutation.mutateAsync({
        course_code: code,
        course_title: title,
        course_description: description,
        schedules: schedules
      });
      
      if (onSuccess) {
        onSuccess("Course updated successfully!");
      }
      onClose();
    } catch (error: any) {
      console.error("Failed to update course:", error);
      const errorMessage = error.response?.data?.detail || "Failed to update course. Please try again.";
      
      if (onError) {
        onError(errorMessage);
      } else {
        setSnackbar({
          open: true,
          message: errorMessage,
          severity: "error",
        });
      }
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden transform animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 flex items-center justify-between border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Type className="w-5 h-5 text-gray-800" />
              <h2 className="text-lg font-bold text-gray-800">Edit Course Details</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-600 hover:bg-gray-200 rounded-lg p-1.5 transition-all duration-200 hover:rotate-90"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="mb-4 flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800">
                Note: Updating the course details will be reflected for all students enrolled in this course.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Course Code <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Hash className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, code: true }))}
                    placeholder="e.g. MATH101"
                    className={`block w-full pl-9 pr-3 py-2 text-sm border ${
                      touched.code && !code.trim()
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    } rounded-lg focus:ring-2 focus:border-transparent transition-all outline-none`}
                  />
                </div>
                {touched.code && !code.trim() && (
                  <p className="text-[10px] text-red-500 mt-1 ml-1 flex items-center gap-1">
                    Course code is required
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Course Title <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Type className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, title: true }))}
                    placeholder="e.g. Advanced Mathematics"
                    className={`block w-full pl-9 pr-3 py-2 text-sm border ${
                      touched.title && !title.trim()
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    } rounded-lg focus:ring-2 focus:border-transparent transition-all outline-none`}
                  />
                </div>
                {touched.title && !title.trim() && (
                  <p className="text-[10px] text-red-500 mt-1 ml-1 flex items-center gap-1">
                    Course title is required
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Course Description
                </label>
                <div className="relative">
                  <div className="absolute top-2.5 left-3 pointer-events-none">
                    <FileText className="w-4 h-4 text-gray-400" />
                  </div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide a brief overview of the course..."
                    rows={4}
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none"
                  />
                </div>
              </div>

              {/* Schedules */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Course Schedules
                </label>
                <div className="space-y-2">
                  {schedules.map((sch, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                      <select 
                        value={sch.day_of_week} 
                        onChange={(e) => updateSchedule(idx, "day_of_week", e.target.value)}
                        className="text-sm border-gray-300 rounded p-1"
                      >
                        <option value="Monday">Monday</option>
                        <option value="Tuesday">Tuesday</option>
                        <option value="Wednesday">Wednesday</option>
                        <option value="Thursday">Thursday</option>
                        <option value="Friday">Friday</option>
                        <option value="Saturday">Saturday</option>
                        <option value="Sunday">Sunday</option>
                      </select>
                      <input 
                        type="time" 
                        value={sch.start_time} 
                        onChange={(e) => updateSchedule(idx, "start_time", e.target.value)}
                        className="text-sm border-gray-300 rounded p-1"
                      />
                      <span className="text-sm text-gray-500">to</span>
                      <input 
                        type="time" 
                        value={sch.end_time} 
                        onChange={(e) => updateSchedule(idx, "end_time", e.target.value)}
                        className="text-sm border-gray-300 rounded p-1"
                      />
                      <button 
                        type="button" 
                        onClick={() => removeSchedule(idx)} 
                        className="ml-auto text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    onClick={addSchedule} 
                    className="text-sm text-blue-600 font-medium mt-1 hover:underline flex items-center gap-1"
                  >
                    + Add Schedule
                  </button>
                </div>
                {schedules.length > 0 && (
                  <div className="mt-4">
                    <WeeklyScheduleGrid 
                      events={schedules.map(s => ({
                        ...s,
                        title: code || "New Course",
                        subtitle: title || ""
                      }))} 
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-all duration-200 font-medium hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={updateCourseMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={
                updateCourseMutation.isPending || !title.trim() || !code.trim()
              }
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {updateCourseMutation.isPending ? (
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
            </button>
          </div>
        </div>
      </div>

      {/* Snackbar */}
      {snackbar.open && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[110] animate-in slide-in-from-top duration-300">
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
              onClick={() => setSnackbar((prev) => ({ ...prev, open: false }))}
              className="ml-2 hover:bg-white/20 rounded p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default CourseEditModal;
