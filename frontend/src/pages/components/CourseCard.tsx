import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { InstructorStudentCourseCollapsibleDataGrid_User as DisplayUser } from "../../types/user";
import { InstructorStudentCourseCollapsibleDataGrid_Course as DisplayCourse } from "../../types/course";

interface DisplayCourseWithUsers extends DisplayCourse {
  users: DisplayUser[];
}

interface CourseCardProps {
  course: DisplayCourseWithUsers;
}

const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
  return (
    <Card sx={{ mb: 2, borderRadius: 4 }}>
      <CardContent>
        <Typography variant="h6">{course.course_title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {course.course_code}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {course.users.length} Students
        </Typography>
      </CardContent>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1a-content"
          id="panel1a-header"
        >
          <Typography>Enrolled Students</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <List>
            {course.users.map((user) => (
              <ListItem key={user.user_id}>
                <ListItemAvatar>
                  <Avatar src={user.profile_picture_url || undefined}>
                    {`${user.first_name?.[0] ?? ""}${
                      user.last_name?.[0] ?? ""
                    }`}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`${user.first_name} ${user.last_name}`}
                  secondary={user.email}
                />
              </ListItem>
            ))}
          </List>
        </AccordionDetails>
      </Accordion>
    </Card>
  );
};

export default CourseCard;
