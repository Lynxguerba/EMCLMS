import * as React from "react";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { getProfilePictureUrl } from "../../utils/imageUtils";

// Hooks
import { useInstructorCoursesWithStudents } from "../../hooks/useQueries";
import { useSchoolYear } from "../../context/SchoolYearContext";

// Lucide Icons
import {
  ChevronDown,
  BookOpen,
  Users,
  Mail,
  User,
  Search,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// Data model for user and course
import { InstructorStudentCourseCollapsibleDataGrid_User as DisplayUser } from "../../types/user";
import { InstructorStudentCourseCollapsibleDataGrid_Course as DisplayCourse } from "../../types/course";
import CourseCard from "./CourseCard";

interface DisplayCourseWithUsers extends DisplayCourse {
  users: DisplayUser[];
}

function Row(props: { course: DisplayCourseWithUsers }) {
  const { course } = props;
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const navigate = useNavigate();

  // Filter students based on search query
  const filteredUsers = course.users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(query) ||
      user.first_name?.toLowerCase().includes(query) ||
      user.last_name?.toLowerCase().includes(query)
    );
  });

  return (
    <React.Fragment>
      {/* Main Course Row */}
      <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-200">
        <td className="px-6 py-4">
          <button
            onClick={() => setOpen(!open)}
            className="p-2 rounded-lg hover:bg-blue-50 transition-all duration-200 transform hover:scale-110"
            aria-label="expand row"
          >
            <div
              className={`transition-transform duration-300 ${open ? "rotate-180" : ""
                }`}
            >
              <ChevronDown className="w-5 h-5 text-gray-600" />
            </div>
          </button>
        </td>
        <td
          className="px-6 py-4 cursor-pointer font-semibold text-blue-700"
          onClick={() => setOpen(!open)}
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            {course.course_code}
          </div>
        </td>
        <td
          className="px-6 py-4 cursor-pointer text-gray-800"
          onClick={() => setOpen(!open)}
        >
          {course.course_title}
        </td>
        <td className="px-6 py-4 cursor-pointer" onClick={() => setOpen(!open)}>
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-semibold">
            <Users className="w-4 h-4" />
            {course.users.length}
          </div>
        </td>
      </tr>

      {/* Expandable Student Details */}
      <tr>
        <td colSpan={4} className="p-0">
          <div
            className={`overflow-hidden transition-all duration-500 ease-in-out ${open ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
              }`}
            style={{
              maxHeight: open ? "1000px" : "0px",
            }}
          >
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 px-6 py-4">
              <div className="animate-fadeIn">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-700" />
                    <h3 className="text-lg font-bold text-gray-800">
                      Students
                    </h3>
                    <span className="text-sm text-gray-600">
                      ({filteredUsers.length}{" "}
                      {filteredUsers.length === 1 ? "student" : "students"})
                    </span>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search students..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 w-64"
                    />
                  </div>
                </div>

                {/* Students Table */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {filteredUsers.length > 0 ? (
                    <table className="min-w-full">
                      <thead className="bg-white">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Profile
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-700" />
                              First Name
                            </div>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-700" />
                              Last Name
                            </div>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-slate-700" />
                              Email
                            </div>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredUsers.map((userRow, index) => (
                          <tr
                            key={userRow.user_id}
                            className="hover:bg-blue-50 transition-colors duration-150"
                            style={{
                              animation: `slideIn 0.3s ease-out ${index * 0.05
                                }s both`,
                            }}
                          >
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <Avatar
                                    src={getProfilePictureUrl(userRow.profile_picture || userRow.profile_picture_url)}
                                    alt={`${userRow.first_name} ${userRow.last_name}`}
                                    sx={{ width: 40, height: 40 }}
                                  >
                                    {`${userRow.first_name?.[0] ?? ""}${userRow.last_name?.[0] ?? ""
                                      }`}
                                  </Avatar>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-gray-700 font-medium">
                                {userRow.first_name}
                              </td>
                              <td className="px-6 py-4 text-gray-700 font-medium">
                                {userRow.last_name}
                              </td>
                              <td className="px-6 py-4 text-gray-700">
                                {userRow.email}
                              </td>
                              <td className="px-6 py-4 text-gray-700">
                                <button
                                  onClick={() => navigate(`/InstructorStudentPerformance/${userRow.user_id}`)}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-semibold shadow-sm"
                                >
                                  <TrendingUp className="w-4 h-4" />
                                  View Performance
                                </button>
                              </td>
                            </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                      <Search className="w-12 h-12 mb-3 opacity-50" />
                      <p className="text-center">
                        No students found matching "{searchQuery}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    </React.Fragment>
  );
}

// Main component rendering the collapsible course table
export default function InstructorStudentCourseCollapsibleDataGrid() {
  const { selectedSchoolYear } = useSchoolYear();
  const { data: rows = [], isLoading } = useInstructorCoursesWithStudents(selectedSchoolYear);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  if (isLoading) return null;

  if (isMobile) {
    return (
      <Box>
        {rows.map((row: any) => (
          <CourseCard key={row.course_id} course={row} />
        ))}
      </Box>
    );
  }

  return (
    <div className="w-full">
      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-out;
          }
        `}
      </style>

      <div className="overflow-x-auto rounded-xl shadow-lg">
        <table className="min-w-full bg-white">
          <thead className="bg-gradient-to-r from-blue-600 to-indigo-600">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider w-16"></th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Course Code
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                Course Title
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Student Count
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any) => (
              <Row key={row.course_id} course={row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
