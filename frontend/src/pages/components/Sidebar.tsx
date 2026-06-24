// React and routing
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import LogoutModal from "./LogoutModal";
// Lucide React icons (replace MUI icons)
import {
  LayoutDashboard,
  GraduationCap,
  Award,
  Settings,
  LogOut,
  FileText,
  BarChart3,
  Search,
  ChevronDown,
  ChevronUp,
  BookOpen,
  X,
  Repeat,
  Users,
  CreditCard,
  Calendar,
  Database,
} from "lucide-react";

// Axios for API calls
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

// Sidebar prop types
interface SidebarProps {
  userRole: "student" | "instructor" | "admin" | "librarian" | "superadmin" | "accounting";
  currentPath: string;
  open: boolean;
  onClose: () => void;
}

export const drawerWidth = 200;

const Sidebar: React.FC<SidebarProps> = ({
  userRole,
  currentPath,
  open,
  onClose,
}) => {
  const navigate = useNavigate();
  const { logout, user, stopImpersonating } = useAuth();

  // const [settingsOpen, setSettingsOpen] = useState(false);
  // const handleSettingsClick = () => setSettingsOpen((open) => !open);
  // const [logsOpen, setLogsOpen] = useState(false);
  // const handleLogsClick = () => setLogsOpen((open) => !open);

  // // Logout confirmation modal state
  // const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Log activity BEFORE clearing session
      try {
        if (userRole === "student") {
          await axios.post(
            `${import.meta.env.VITE_API_BASE_URL
            }/api/student/post/add-student-log/`,
            { message: "Logged out" },
            { withCredentials: true },
          );
        } else if (userRole === "instructor") {
          await axios.post(
            `${import.meta.env.VITE_API_BASE_URL
            }/api/instructor/post/add-instructor-log/`,
            { message: "Logged out" },
            { withCredentials: true },
          );
        }
      } catch (logErr) {
        console.warn("Log creation failed:", logErr);
      }

      // Clear session AFTER logging
      await logout();

    } catch (error) {
      console.error("Logout failed", error);
      navigate("/");
    } finally {
      setIsLoggingOut(false);
      setLogoutConfirmOpen(false);
    }
  };

  const adminSettingsChildren = [
    {
      path: "/AdminManageUsers",
      label: "Manage Users",
      icon: <Users className="w-4 h-4 mr-2" />,
    },
    {
      path: "/AdminManageCourses",
      label: "Manage Courses",
      icon: <BookOpen className="w-4 h-4 mr-2" />,
    },
    {
      path: "/AdminChangePasswords",
      label: "Reset Passwords",
      icon: <Repeat className="w-4 h-4 mr-2" />,
    },
    {
      path: "/AdminManageRegistrationRequests",
      label: "Registration Requests",
      icon: <FileText className="w-4 h-4 mr-2" />,
    },
    {
      path: "/AdminDatabase",
      label: "Database",
      icon: <Database className="w-4 h-4 mr-2" />,
    },
  ];

  const adminLogsChildren = [
    {
      path: "/AdminStudentLogs",
      label: "Student logs",
      icon: <Users className="w-4 h-4 mr-2" />,
    },
    {
      path: "/AdminFacultyLogs",
      label: "Faculty logs",
      icon: <GraduationCap className="w-4 h-4 mr-2" />,
    },
  ];

  const userlibraryServicesChildren = [
    {
      path: "/BookSearch",
      label: "Book Search",
      icon: <Search className="w-4 h-4 mr-2" />,
    },
    {
      path: "/UserBorrowBooks",
      label: "Borrow Books",
      icon: <BookOpen className="w-4 h-4 mr-2" />,
    },
    {
      path: "/UserReturnBooks",
      label: "Return Books",
      icon: <Repeat className="w-4 h-4 mr-2" />,
    },
  ];

  const instructorLibraryServicesChildren = [
    {
      path: "/InstructorBookSearch",
      label: "Book Search",
      icon: <Search className="w-4 h-4 mr-2" />,
    },
    {
      path: "/InstructorBorrowBooks",
      label: "Borrow Books",
      icon: <BookOpen className="w-4 h-4 mr-2" />,
    },
    {
      path: "/InstructorReturnBooks",
      label: "Return Books",
      icon: <Repeat className="w-4 h-4 mr-2" />,
    },
  ];

  // INITIALIZE DROPDOWN - Always open by default
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [logsOpen, setLogsOpen] = useState(true);
  const [libraryServicesOpen, setLibraryServicesOpen] = useState(true);

  const handleSettingsClick = () => setSettingsOpen((prev) => !prev);
  const handleLogsClick = () => setLogsOpen((prev) => !prev);
  const handleLibraryServicesClick = () =>
    setLibraryServicesOpen((prev) => !prev);

  // LOGOUT Confirmataion state
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleOpenLogoutConfirm = () => setLogoutConfirmOpen(true);
  const handleCloseLogoutConfirm = () => {
    if (!isLoggingOut) {
      setLogoutConfirmOpen(false);
    }
  };

  // Role-based navigation links
  let links: {
    [x: string]: any;
    path?: string;
    label: string;
    icon: React.ReactNode;
    onClick?: () => void;
  }[] = [];

  switch (userRole) {
    case "student":
      links = [
        {
          path: "/StudentDashboard",
          label: "Dashboard",
          icon: <LayoutDashboard className="w-5 h-5" />,
        },
        {
          path: "/StudentCourses",
          label: "Courses",
          icon: <GraduationCap className="w-5 h-5" />,
        },
        {
          path: "/StudentPerformance",
          label: "Performance",
          icon: <Award className="w-5 h-5" />,
        },
        {
          path: "/MyAccount",
          label: "My Account",
          icon: <CreditCard className="w-5 h-5" />,
        },
        {
          path: "/StudentSchedule",
          label: "My Schedule",
          icon: <Calendar className="w-5 h-5" />,
        },
        {
          path: "/BookSearch",
          label: "Library Services",
          icon: <BookOpen className="w-5 h-5" />,
          isLibraryServicesParent: true,
        },
      ];
      break;
    case "instructor":
      links = [
        {
          path: "/InstructorDashboard",
          label: "Dashboard",
          icon: <LayoutDashboard className="w-5 h-5" />,
        },
        {
          path: "/InstructorCourses",
          label: "Courses",
          icon: <GraduationCap className="w-5 h-5" />,
        },
        {
          path: "/InstructorGrade",
          label: "Score",
          icon: <Award className="w-5 h-5" />,
        },
        {
          path: "/InstructorReports",
          label: "Reports",
          icon: <BarChart3 className="w-5 h-5" />,
        },
        {
          path: "/InstructorSchedule",
          label: "My Schedule",
          icon: <Calendar className="w-5 h-5" />,
        },
        {
          path: "/InstructorBookSearch",
          label: "Library Services",
          icon: <BookOpen className="w-5 h-5" />,
          isLibraryServicesParent: true,
        },
      ];
      break;
    case "admin":
    case "superadmin":
      links = [
        {
          path: "/AdminDashboard",
          label: "Dashboard",
          icon: <LayoutDashboard className="w-5 h-5" />,
        },
        {
          path: "/AdminSettings",
          label: userRole === "superadmin" ? "Super Settings" : "Settings",
          icon: <Settings className="w-5 h-5" />,
          isParent: true,
        },
        {
          path: "/AdminLogs",
          label: "Logs",
          icon: <FileText className="w-5 h-5" />,
          isLogsParent: true,
        },
        {
          path: "/AdminReports",
          label: "Reports",
          icon: <BarChart3 className="w-5 h-5" />,
        },
      ];
      break;
      break;
    case "accounting":
      links = [
        {
          path: "/AccountingDashboard",
          label: "Dashboard",
          icon: <LayoutDashboard className="w-5 h-5" />,
        },
        {
          path: "/AccountingStudents",
          label: "Students",
          icon: <Users className="w-5 h-5" />,
        },
        {
          path: "/AccountingFees",
          label: "Fee Management",
          icon: <Settings className="w-5 h-5" />,
        },
      ];
      break;
    case "librarian":
      links = [
        {
          path: "/LibrarianDashboard",
          label: "Dashboard",
          icon: <LayoutDashboard className="w-5 h-5" />,
        },
        {
          path: "/LibrarianManageBooks",
          label: "Manage Books",
          icon: <BookOpen className="w-5 h-5" />,
        },
        {
          path: "/LibrarianBorrowReturn",
          label: "Borrow/Return",
          icon: <Repeat className="w-5 h-5" />,
        },
        {
          path: "/LibrarianBookRequests",
          label: "Book Requests",
          icon: <BookOpen className="w-5 h-5" />,
        },
        {
          path: "/LibrarianReport",
          label: "Report",
          icon: <BarChart3 className="w-5 h-5" />,
        },
      ];
      break;
    default:
      links = [];
  }

  // Drawer content UI
  const drawerContent = (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-800 to-slate-900">
      {/* Header with Logo */}
      <div className="grid items-center justify-start px-3 py-5 bg-slate-850 relative">
        <div className="flex flex-row items-center gap-1">
          <img src="/emc_logo.png" alt="Logo" className="h-12 w-auto" />
          <span className="text-xl font-bold text-white">EMC</span>
        </div>

        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="md:hidden absolute right-3 top-5 p-2 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-slate-300" />
        </button>
      </div>

      {/* Impersonation Label */}
      {user?.is_impersonating && (
        <div className="mx-3 my-2 px-3 py-3 bg-indigo-500/20 border border-indigo-500/30 rounded-xl flex flex-col gap-3 overflow-hidden">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Impersonating</p>
              <p className="text-sm font-semibold text-white truncate">
                {user.first_name} {user.last_name}
              </p>
            </div>
          </div>
          <button
            onClick={stopImpersonating}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-indigo-900/40"
          >
            <LogOut className="w-3 h-3" />
            Switch Back
          </button>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-2">
        {links.map((link) => {
          // Check if any settings child is active
          const isSettingsActive = adminSettingsChildren.some(
            (child) => currentPath === child.path,
          );

          // Check if any logs child is active
          const isLogsActive = adminLogsChildren.some(
            (child) => currentPath === child.path,
          );

          // Check if any library services child is active (Student)
          const isLibraryServicesActive = userlibraryServicesChildren.some(
            (child) => currentPath === child.path,
          );

          // Check if any instructor library services child is active
          const isInstructorLibraryServicesActive =
            instructorLibraryServicesChildren.some(
              (child) => currentPath === child.path,
            );

          // Parent: Settings
          if (link.isParent) {
            return (
              <div key={link.label}>
                <button
                  onClick={handleSettingsClick}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 font-medium group ${isSettingsActive
                      ? "bg-blue-100/40 text-blue-400"
                      : "text-slate-200 hover:bg-slate-700/50"
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="group-hover:scale-110 transition-transform duration-200">
                      {link.icon}
                    </div>
                    <span className="text-sm">{link.label}</span>
                  </div>
                  {settingsOpen ? (
                    <ChevronUp className="w-4 h-4 transition-transform duration-300" />
                  ) : (
                    <ChevronDown className="w-4 h-4 transition-transform duration-300" />
                  )}
                </button>

                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${settingsOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
                    }`}
                >
                  <div className="mt-2 space-y-1 ml-3">
                    {adminSettingsChildren.map((child, index) => (
                      <Link
                        key={child.path}
                        to={child.path}
                        onClick={onClose}
                        style={{
                          transitionDelay: settingsOpen
                            ? `${index * 50}ms`
                            : "0ms",
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-200 ${currentPath === child.path
                            ? "bg-blue-100/40 text-blue-400 font-semibold"
                            : "bg-slate-700/30 text-slate-300 hover:bg-slate-600/50 hover:text-white"
                          }`}
                      >
                        {child.icon}
                        <span>{child.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          }

          // Parent: Logs
          if (link.isLogsParent) {
            return (
              <div key={link.label}>
                <button
                  onClick={handleLogsClick}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 font-medium group ${isLogsActive
                      ? "bg-blue-100/40 text-blue-400"
                      : "text-slate-200 hover:bg-slate-700/50"
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="group-hover:scale-110 transition-transform duration-200">
                      {link.icon}
                    </div>
                    <span className="text-sm">{link.label}</span>
                  </div>
                  {logsOpen ? (
                    <ChevronUp className="w-4 h-4 transition-transform duration-300" />
                  ) : (
                    <ChevronDown className="w-4 h-4 transition-transform duration-300" />
                  )}
                </button>

                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${logsOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
                    }`}
                >
                  <div className="mt-2 space-y-1 ml-3">
                    {adminLogsChildren.map((child, index) => (
                      <Link
                        key={child.path}
                        to={child.path}
                        onClick={onClose}
                        style={{
                          transitionDelay: logsOpen ? `${index * 50}ms` : "0ms",
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-200 ${currentPath === child.path
                            ? "bg-blue-100/40 text-blue-400 font-semibold"
                            : "bg-slate-700/30 text-slate-300 hover:bg-slate-600/50 hover:text-white"
                          }`}
                      >
                        {child.icon}
                        <span>{child.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          }

          // Parent: Library Services (Student)
          if (link.isLibraryServicesParent && userRole === "student") {
            return (
              <div key={link.label}>
                <button
                  onClick={handleLibraryServicesClick}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 font-medium group ${isLibraryServicesActive
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-900/50"
                      : "text-slate-200 hover:bg-slate-700/50"
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="group-hover:scale-110 transition-transform duration-200">
                      {link.icon}
                    </div>
                    <span className="text-sm">{link.label}</span>
                  </div>
                  {libraryServicesOpen ? (
                    <ChevronUp className="w-4 h-4 transition-transform duration-300" />
                  ) : (
                    <ChevronDown className="w-4 h-4 transition-transform duration-300" />
                  )}
                </button>

                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${libraryServicesOpen
                      ? "max-h-64 opacity-100"
                      : "max-h-0 opacity-0"
                    }`}
                >
                  <div className="mt-2 space-y-1 ml-3">
                    {userlibraryServicesChildren.map((child, index) => (
                      <Link
                        key={child.path}
                        to={child.path}
                        onClick={onClose}
                        style={{
                          transitionDelay: libraryServicesOpen
                            ? `${index * 50}ms`
                            : "0ms",
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-200 ${currentPath === child.path
                            ? "bg-blue-100/40 text-blue-400 font-semibold"
                            : "bg-slate-700/30 text-slate-300 hover:bg-slate-600/50 hover:text-white"
                          }`}
                      >
                        {child.icon}
                        <span>{child.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          }

          // Parent: Library Services (Instructor)
          if (link.isLibraryServicesParent && userRole === "instructor") {
            return (
              <div key={link.label}>
                <button
                  onClick={handleLibraryServicesClick}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 font-medium group ${isInstructorLibraryServicesActive
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-900/50"
                      : "text-slate-200 hover:bg-slate-700/50"
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="group-hover:scale-110 transition-transform duration-200">
                      {link.icon}
                    </div>
                    <span className="text-sm">{link.label}</span>
                  </div>
                  {libraryServicesOpen ? (
                    <ChevronUp className="w-4 h-4 transition-transform duration-300" />
                  ) : (
                    <ChevronDown className="w-4 h-4 transition-transform duration-300" />
                  )}
                </button>

                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${libraryServicesOpen
                      ? "max-h-64 opacity-100"
                      : "max-h-0 opacity-0"
                    }`}
                >
                  <div className="mt-2 space-y-1 ml-3">
                    {instructorLibraryServicesChildren.map((child, index) => (
                      <Link
                        key={child.path}
                        to={child.path}
                        onClick={onClose}
                        style={{
                          transitionDelay: libraryServicesOpen
                            ? `${index * 50}ms`
                            : "0ms",
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-200 ${currentPath === child.path
                            ? "bg-blue-100/40 text-blue-400 font-semibold"
                            : "bg-slate-700/30 text-slate-300 hover:bg-slate-600/50 hover:text-white"
                          }`}
                      >
                        {child.icon}
                        <span>{child.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          }

          // Normal link (with or without path)
          if (link.path) {
            return (
              <Link
                key={link.label}
                to={link.path}
                onClick={onClose}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium group ${currentPath === link.path
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-900/50"
                    : "text-slate-200 hover:bg-slate-700/50"
                  }`}
              >
                <div className="group-hover:scale-110 transition-transform duration-200">
                  {link.icon}
                </div>
                <span className="text-sm">{link.label}</span>
              </Link>
            );
          } else {
            // Button without path (like Librarian Reports that opens new window)
            return (
              <button
                key={link.label}
                onClick={link.onClick || onClose}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-200 hover:bg-slate-700/50 transition-all duration-200 font-medium group"
              >
                <div className="group-hover:scale-110 transition-transform duration-200">
                  {link.icon}
                </div>
                <span className="text-sm">{link.label}</span>
              </button>
            );
          }
        })}
      </nav>

      {/* Logout Section */}
      <div className="border-t border-slate-700 p-2 bg-slate-800">
        <button
          onClick={handleOpenLogoutConfirm}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-red-400 hover:bg-slate-700/50 rounded-xl transition-all duration-200 font-medium group"
        >
          <div className="group-hover:scale-110 transition-transform duration-200">
            <LogOut className="w-5 h-5" />
          </div>
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed left-0 h-full w-50 bg-slate-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out md:hidden ${open ? "translate-x-0" : "-translate-x-full"
          }`}
        style={{ top: 0 }}
      >
        {drawerContent}
      </aside>

      {/* Desktop Drawer */}
      <aside 
        className="hidden md:block fixed left-0 h-full w-50 bg-slate-900 shadow-lg border-r border-slate-700 z-40"
        style={{ top: 0 }}
      >
        {drawerContent}
      </aside>

      {/* Logout Confirmation Modal - Rendered via Portal to document.body */}
      {createPortal(
        <LogoutModal
          isOpen={logoutConfirmOpen}
          onClose={handleCloseLogoutConfirm}
          onConfirm={handleConfirmLogout}
          isLoading={isLoggingOut}
        />,
        document.body,
      )}
    </>
  );
};

export default Sidebar;
