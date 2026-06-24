// InstructorCourseIntroduction.tsx
import { useState } from "react";
import { Box, Typography, IconButton, Collapse } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import CustomBox from "./CustomBox";

interface InstructorCourseIntroductionProps {
  courseId: number;
  courseTitle: string | undefined;
  courseDescription: string | undefined;
}

export default function InstructorCourseIntroduction({
  courseTitle,
  courseDescription,
}: InstructorCourseIntroductionProps) {
  const theme = useTheme();
  const [courseOpen, setCourseOpen] = useState(true);

  return (
    <CustomBox
      onClick={() => setCourseOpen(!courseOpen)}
      sx={{
        border: `3px solid ${theme.palette.border.main}`,
        transition: "border-color 0.3s",
        "&:hover": {
          borderColor: "secondary.main",
        },
        p: 2,
        cursor: "pointer",
        margin: theme.spacing(1),
        marginLeft: { xs: theme.spacing(1), sm: theme.spacing(27) },
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          onClick={(e) => {
            e.stopPropagation();
            setCourseOpen(!courseOpen);
          }}
          sx={{ cursor: "pointer", fontWeight: "bold" }}
        >
          {courseTitle || "Loading..."}
        </Typography>
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            setCourseOpen(!courseOpen);
          }}
        >
          <ExpandMoreIcon
            sx={{
              transform: courseOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "0.3s",
            }}
          />
        </IconButton>
      </Box>
      <Collapse in={courseOpen}>
        <Box mt={1}>
          <Typography variant="body2">{courseDescription}</Typography>
        </Box>
      </Collapse>
    </CustomBox>
  );
}