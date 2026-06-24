import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Menu, MenuItem,  CircularProgress } from "@mui/material";
import { formatDistanceToNow } from "date-fns";
import { Menu as MenuIcon, Bell, User, Check } from "lucide-react";
import axios from "axios";
import { getProfilePictureUrl } from "../../utils/imageUtils";
import { useAuth } from "../../context/AuthContext";

import "../css/Navbar.css";

// Interface to match backend response
interface Notification {
  id: number;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const Navbar: React.FC<{ handleSidebarToggle: () => void }> = ({
  handleSidebarToggle,
}) => {
  const navigate = useNavigate();
  const { user, loading: authLoading, checkSession } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Listen for profile updates from other components
  useEffect(() => {
    const handleProfileUpdate = () => {
      checkSession();
    };

    window.addEventListener("profileUpdated", handleProfileUpdate);
    return () => window.removeEventListener("profileUpdated", handleProfileUpdate);
  }, [checkSession]);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;

      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/api/user/get/notifications/`,
          { withCredentials: true }
        );
        setNotifications(res.data);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };

    fetchNotifications();
  }, [user]);

  const userName =
    user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : "User";

  const userAvatarUrl = getProfilePictureUrl(user?.profile_picture);


  const unreadCount = notifications.filter((n) => !n.read).length;

  const [notificationAnchorEl, setNotificationAnchorEl] =
    useState<null | HTMLElement>(null);
  const openNotifications = Boolean(notificationAnchorEl);

  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(
    null
  );
  const openProfile = Boolean(profileAnchorEl);

  const profileMenuItems = [
    {
      label: "Profile Settings",
      icon: <User className="w-4 h-4" />,
      onClick: () => {
        setProfileAnchorEl(null);
        navigate("/profile-settings");
      },
    },
  ];

  const markAllAsRead = async () => {
    try {
      await axios.post(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/api/user/post/mark-all-notifications-read/`,
        {},
        { withCredentials: true }
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const handleNotificationClick = async (id: number) => {
    try {
      await axios.post(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/api/user/post/mark-notification-read/${id}/`,
        {},
        { withCredentials: true }
      );
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error(`Failed to mark notification ${id} as read:`, error);
    }
    setNotificationAnchorEl(null);
  };

  if (authLoading)
    return (
      <Box
        sx={{
          height: { xs: 64, sm: 72, md: 92 },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress size="2rem" />
      </Box>
    );

  return (
    <>
    <Box
      sx={{
        display: "flex",
        justifyContent: { xs: "space-between" },
        [`@media (min-width: 768px)`]: {
          justifyContent: "flex-end",
          left: 200,
        },
        alignItems: "center",
        position: "fixed", // Changed from "sticky" to "fixed"
        height: { xs: 64, sm: 72, md: 92 },
        top: 0,
        right: 0,
        left: 0,
        zIndex: 4,
        px: { xs: 1, sm: 2 },
        // backgroundColor: "background.default", // Add background
        pointerEvents: "none",
      }}
    >
      {/* Mobile Sidebar Button */}
      <div className="md:hidden pointer-events-auto">
        <button
          onClick={handleSidebarToggle}
          className="group relative w-9 h-9 rounded-xl bg-transparent backdrop-blur-sm
                     border border-black/30 hover:border-black/50
                     flex items-center justify-center
                     transition-all duration-300 ease-out
                     hover:scale-105 active:scale-95
                     hover:shadow-lg hover:shadow-blue-500/20"
        >
          <MenuIcon className="w-4 h-4 text-gray-900 group-hover:text-white transition-colors duration-300" />
        </button>
      </div>

      {/* Profile + Notifications */}
      <div className="flex items-center gap-1.5 sm:gap-2 sm:mr-3 pointer-events-auto">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={(e) => setNotificationAnchorEl(e.currentTarget)}
            className="group relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-transparent backdrop-blur-sm
                       border border-black/20 hover:border-black/40
                       flex items-center justify-center
                       transition-all duration-300 ease-out
                       hover:scale-105 active:scale-95
                       hover:shadow-lg hover:shadow-blue-500/20"
          >
            <Bell
              className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-800 group-hover:text-black transition-all duration-300
                         ${
                           unreadCount > 0
                             ? "animate-[swing_1s_ease-in-out_infinite]"
                             : ""
                         }`}
            />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-4 h-4 sm:w-5 sm:h-5
                             bg-gradient-to-br from-red-500 to-pink-600
                             rounded-full flex items-center justify-center
                             text-[9px] sm:text-[10px] font-bold text-white
                             animate-[pulse_2s_ease-in-out_infinite]
                             shadow-lg shadow-red-500/50"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <Menu
            anchorEl={notificationAnchorEl}
            open={openNotifications}
            onClose={() => setNotificationAnchorEl(null)}
            PaperProps={{
              sx: {
                width: { xs: "calc(100vw - 32px)", sm: 380 },
                maxWidth: 380,
                maxHeight: { xs: "calc(100vh - 100px)", sm: 520 },
                borderRadius: { xs: 4, sm: 5 },
                marginTop: 2,
                background: "linear-gradient(to bottom, #0f172a, #1e293b)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                boxShadow:
                  "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
              },
            }}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            {/* Header */}
            <div className="p-3 sm:p-5 border-b border-blue-800/30 bg-gradient-to-r from-slate-800/50 to-blue-900/30">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 
                      flex items-center justify-center shadow-lg shadow-blue-900/50 flex-shrink-0"
                  >
                    <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-white truncate">
                      Notifications
                    </h3>
                    <p className="text-xs text-blue-300">
                      {unreadCount > 0
                        ? `${unreadCount} unread`
                        : "All caught up"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold
                 transition-all duration-200 flex-shrink-0
                 ${
                   unreadCount === 0
                     ? "text-slate-600 cursor-not-allowed bg-slate-800/30"
                     : "text-blue-300 bg-blue-900/40 hover:bg-blue-800/60 hover:text-white active:scale-95 shadow-lg shadow-blue-900/20"
                 }`}
                >
                  <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Mark all</span>
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[50vh] sm:max-h-[400px] overflow-y-auto scrollbar-hide">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 sm:px-6">
                  <div
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-900/50 to-slate-800/50 
                      flex items-center justify-center mb-3 sm:mb-4 shadow-inner"
                  >
                    <Bell className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400/50" />
                  </div>
                  <p className="text-sm sm:text-base font-semibold text-slate-300 text-center mb-1">
                    You're all caught up!
                  </p>
                  <p className="text-xs sm:text-sm text-slate-500 text-center">
                    No new notifications
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-blue-900/20">
                  {notifications.map((n, index) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n.id)}
                      className={`relative p-3 sm:p-4 cursor-pointer transition-all duration-300 group
                       hover:bg-gradient-to-r hover:from-blue-900/40 hover:to-slate-800/40
                       active:scale-[0.98] sm:hover:scale-[1.02]
                       ${
                         !n.read
                           ? "bg-gradient-to-r from-blue-950/60 to-slate-900/60"
                           : "bg-transparent"
                       }
                       ${index === 0 ? "animate-[slideIn_0.3s_ease-out]" : ""}`}
                      style={{
                        animationDelay: `${index * 50}ms`,
                      }}
                    >
                      {/* Unread Indicator */}
                      {!n.read && (
                        <div
                          className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-2 h-2 sm:w-2.5 sm:h-2.5
                            bg-gradient-to-r from-blue-400 to-blue-500 rounded-full 
                            animate-pulse shadow-lg shadow-blue-500/50"
                        />
                      )}

                      {/* Hover Border Effect */}
                      <div
                        className="absolute inset-0 rounded-lg border-2 border-transparent 
                          group-hover:border-blue-500/30 transition-all duration-300 pointer-events-none"
                      />

                      <div className={`${!n.read ? "ml-4 sm:ml-5" : "ml-1"}`}>
                        {/* Title */}
                        <h4
                          className={`text-xs sm:text-sm mb-1 sm:mb-1.5 transition-colors
                           ${
                             !n.read
                               ? "font-bold text-white"
                               : "font-semibold text-slate-300 group-hover:text-white"
                           }`}
                        >
                          {n.title}
                        </h4>

                        {/* Message */}
                        <p
                          className="text-xs sm:text-sm text-slate-400 group-hover:text-slate-300 
                          line-clamp-2 mb-2 sm:mb-2.5 transition-colors"
                        >
                          {n.message}
                        </p>

                        {/* Timestamp */}
                        <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-blue-400/70 group-hover:text-blue-300 transition-colors">
                          <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-blue-400/50" />
                          {formatDistanceToNow(new Date(n.createdAt), {
                            addSuffix: true,
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Menu>
        </div>

        {/* Profile Menu */}
        <div className="relative">
          <button
            onClick={(e) => setProfileAnchorEl(e.currentTarget)}
            className="group relative w-9 h-9 sm:w-10 sm:h-10 rounded-full
                hover:border-gray-400
               flex items-center justify-center overflow-hidden
               transition-all duration-300 ease-out
               hover:scale-110 active:scale-95
               border border-gray-300"
          >
            {userAvatarUrl ? (
              <img
                src={userAvatarUrl}
                alt={userName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center
                    bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600
                    group-hover:from-blue-500 group-hover:to-purple-500
                    transition-all duration-300"
              >
                <span className="text-white text-xs sm:text-sm font-bold tracking-wide">
                  {`${user?.first_name?.[0] || ""}${
                    user?.last_name?.[0] || ""
                  }`}
                </span>
              </div>
            )}
          </button>

          <Menu
            anchorEl={profileAnchorEl}
            open={openProfile}
            onClose={() => setProfileAnchorEl(null)}
            PaperProps={{
              sx: {
                minWidth: { xs: "calc(100vw - 64px)", sm: 220 },
                maxWidth: 220,
                borderRadius: 4,
                marginTop: 3,
                background: "linear-gradient(to bottom, #0f172a, #1e293b)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                boxShadow:
                  "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
                padding: "8px",
              },
            }}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            {/* User Info Header */}
            <div className="px-3 sm:px-4 py-2 sm:py-3 mb-2">
              <div className="flex items-center gap-2 sm:gap-3">
                {userAvatarUrl ? (
                  <img
                    src={userAvatarUrl}
                    alt={userName}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 
                        flex items-center justify-center flex-shrink-0"
                  >
                    <span className="text-white text-sm sm:text-base font-bold">
                      {`${user?.first_name?.[0] || ""}${
                        user?.last_name?.[0] || ""
                      }`}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-white truncate">
                    {userName || "User Name"}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                    {user?.email || "user@gmail.com"}
                  </p>
                  <p className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
                    user?.user_type === "Superadmin" ? "text-purple-400" : "text-blue-400"
                  }`}>
                    {user?.user_type}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            {profileMenuItems.map((item) => (
              <MenuItem
                key={item.label}
                onClick={item.onClick}
                sx={{
                  borderRadius: "10px",
                  margin: "2px 0",
                  padding: { xs: "8px 12px", sm: "10px 16px" },
                  color: "#cbd5e1",
                  fontSize: { xs: "13px", sm: "14px" },
                  fontWeight: 500,
                  transition: "all 0.2s",
                  "&:hover": {
                    backgroundColor: "rgba(59, 130, 246, 0.15)",
                    color: "#ffffff",
                    transform: "translateX(4px)",
                  },
                  "&:active": {
                    transform: "scale(0.98)",
                  },
                }}
              >
                <span className="flex items-center gap-2 sm:gap-3 w-full">
                  <span className="text-blue-400 group-hover:text-blue-300 transition-colors">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </span>
              </MenuItem>
            ))}
          </Menu>
        </div>
      </div>

      <style>{`
        @keyframes swing {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(15deg); }
          75% { transform: rotate(-15deg); }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </Box>
    </>
  );
};

export default Navbar;
