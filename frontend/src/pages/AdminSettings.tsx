// React and hooks
import { useEffect, useState } from "react";

// Routing
import { useLocation, useNavigate } from "react-router-dom";

// Auth context
import { useAuth } from "../context/AuthContext";

// MUI components and theming
import { Box, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";

// Custom components
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import CustomBox from "./components/CustomBox";
import { SettingsSkeleton } from "./components/Skeletons";

// MUI icons
import PeopleIcon from "@mui/icons-material/People";
import SchoolIcon from "@mui/icons-material/School";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import { Database } from "lucide-react";

export default function AdminSettings() {
  // Hooks
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.user_type !== "Administrator" && user.user_type !== "Superadmin")) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  // State
  const currentPath = location.pathname;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Sidebar toggle handler
  const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);

  if (authLoading) return <SettingsSkeleton />;

  return (
    <Box
      sx={{
        height: "100vh",
        overflowY: "auto",
        backgroundColor: theme.palette.background.default,
      }}
    >
      {/* Sidebar and Navbar */}
      <Sidebar
        userRole={user?.user_type === "Superadmin" ? "superadmin" : "admin"}
        currentPath={currentPath}
        open={isSidebarOpen}
        onClose={handleSidebarToggle}
      />
      <Navbar handleSidebarToggle={handleSidebarToggle} />

      {/* Page Title */}
      <Typography
        variant="h3"
        component="h2"
        color={theme.palette.text.primary}
        sx={{
          marginLeft: { xs: theme.spacing(6), sm: theme.spacing(31) },
        }}
      >
        Settings
      </Typography>

      {/* Main Content Container */}
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        mt={4}
        ml={{ xs: 0, sm: 31 }}
        px={2}
      >
        <Stack spacing={4} alignItems="center">
          {/* Top Row - Manage Users and Courses */}
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={4}
            alignItems="center"
          >
            {/* Manage Users Box */}
            <CustomBox
              onClick={() => navigate("/AdminManageUsers")}
              sx={{
                width: "230px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                transition: "border-color 0.3s",
                cursor: "pointer",
                p: 4,
                boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)",
                "&:hover": {
                  boxShadow: "0px 0px 4px rgba(0, 0, 0, 0.25)",
                },
              }}
            >
              <PeopleIcon sx={{ fontSize: { xs: 40, md: 48 } }} />
              <Typography
                variant="h4"
                sx={{ mt: 1, textAlign: "center", fontWeight: "600" }}
              >
                Manage Users
              </Typography>
            </CustomBox>

            {/* Manage Courses Box */}
            <CustomBox
              onClick={() => navigate("/AdminManageCourses")}
              sx={{
                width: "230px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                transition: "border-color 0.3s",
                cursor: "pointer",
                p: 4,
                boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)",
                "&:hover": {
                  boxShadow: "0px 0px 4px rgba(0, 0, 0, 0.25)",
                },
              }}
            >
              <SchoolIcon sx={{ fontSize: { xs: 40, md: 48 } }} />
              <Typography
                variant="h4"
                sx={{ mt: 1, textAlign: "center", fontWeight: "600" }}
              >
                Manage Courses
              </Typography>
            </CustomBox>
          </Stack>

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={4}
            alignItems="center"
          >
            {/* Bottom Centered Box - Reset Passwords */}
            <CustomBox
              onClick={() => navigate("/AdminChangePasswords")}
              sx={{
                width: "230px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                transition: "border-color 0.3s",
                cursor: "pointer",
                p: 4,
                boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)",
                "&:hover": {
                  boxShadow: "0px 0px 4px rgba(0, 0, 0, 0.25)",
                },
              }}
            >
              <ManageAccountsIcon sx={{ fontSize: { xs: 40, md: 48 } }} />
              <Typography
                variant="h4"
                sx={{ mt: 1, textAlign: "center", fontWeight: "600" }}
              >
                Reset Passwords
              </Typography>
            </CustomBox>

            {/* Database Management Box */}
            <CustomBox
              onClick={() => navigate("/AdminDatabase")}
              sx={{
                width: "230px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                transition: "border-color 0.3s",
                cursor: "pointer",
                p: 4,
                boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)",
                "&:hover": {
                  boxShadow: "0px 0px 4px rgba(0, 0, 0, 0.25)",
                },
              }}
            >
              <Database className="w-10 h-10 md:w-12 md:h-12" />
              <Typography
                variant="h4"
                sx={{ mt: 1, textAlign: "center", fontWeight: "600" }}
              >
                Database
              </Typography>
            </CustomBox>
          </Stack>
        </Stack>
      </Box>

      {/* Spacer at the Bottom */}
      <Box sx={{ height: { xs: "40px", md: "60px" } }}></Box>
    </Box>
  );
}
