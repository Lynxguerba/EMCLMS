import { Box, Button, Modal, Typography } from "@mui/material";

interface AdminReportModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AdminReportModal({
  open,
  onClose,
}: AdminReportModalProps) {
  const handleGenerate = (endpoint: string) => {
    window.open(
      `${import.meta.env.VITE_API_BASE_URL}/api/admin/${endpoint}`,
      "_blank"
    );
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "90%", sm: "70%", md: "400px" },
          maxWidth: "95vw",
          bgcolor: "background.paper",
          boxShadow: 24,
          p: { xs: 2, sm: 3, md: 4 },
          borderRadius: 2,
        }}
      >
        <Typography variant="h6" mb={2}>
          Choose Report to Generate
        </Typography>

        <Button
          fullWidth
          variant="contained"
          sx={{ mb: 2 }}
          onClick={() => handleGenerate("get/allusers-report/")}
        >
          All Users
        </Button>

        <Button
          fullWidth
          variant="contained"
          sx={{ mb: 2 }}
          onClick={() => handleGenerate("get/allcourses-report/")}
        >
          All Courses
        </Button>

        <Button
          fullWidth
          variant="contained"
          sx={{ mb: 2 }}
          onClick={() => handleGenerate("get/allenrollments-report/")}
        >
          All Enrollments
        </Button>

        <Button
          fullWidth
          variant="contained"
          sx={{ mb: 2 }}
          onClick={() => handleGenerate("get/passwordresetrequests-report/")}
        >
          Password Reset Requests
        </Button>

        <Button
          fullWidth
          variant="contained"
          sx={{ mb: 2 }}
          onClick={() => handleGenerate("get/studentlogs-report/")}
        >
          Student Logs
        </Button>

        <Button
          fullWidth
          variant="contained"
          sx={{ mb: 2 }}
          onClick={() => handleGenerate("get/facultylogs-report/")}
        >
          Faculty Logs
        </Button>

        <Button
          fullWidth
          variant="contained"
          sx={{ mb: 2 }}
          onClick={() => handleGenerate("get/booksdata-report/")}
        >
          Books Data
        </Button>
      </Box>
    </Modal>
  );
}
