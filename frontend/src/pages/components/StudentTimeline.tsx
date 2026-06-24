import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Clock, BookOpen, AlertCircle, CheckCircle } from "lucide-react";

// Interfaces
interface Content {
  content_id: number;
  section: number;
  content_title: string;
  content_type: "Activity" | "File" | "Announcement";
  due_date?: string;
  order_in_section?: number;
  file_path?: string;
  is_active: boolean;
  content_description?: string;
  grade_status?: "Pending" | "Submitted" | "Graded" | "Late";
}

interface Section {
  section_id: number;
  course: number;
  section_title: string;
  description?: string;
  order_in_course?: number;
}

interface Course {
  course_id: number;
  course_code: string;
  course_title: string;
  description?: string;
  instructor: number;
}

interface ActivityItem {
  date: string;
  time: string;
  activityName: string;
  courseCode: string;
  courseId: number;
  isOverdue: boolean;
  contentId: number;
  sectionId: number;
}

interface StudentTimelineProps {
  contents: Content[];
  sections: Section[];
  courses: Course[];
}

// Utility functions
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const getRelativeDate = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  if (date.getTime() === today.getTime()) return "Today";
  if (date.getTime() === tomorrow.getTime()) return "Tomorrow";
  return null;
};

const StudentTimeline: React.FC<StudentTimelineProps> = ({
  contents,
  sections,
  courses,
}) => {
  // Include only activities that are not yet submitted/graded/late
  const activities: ActivityItem[] = contents
    .filter(
      (c) =>
        c.content_type === "Activity" &&
        (!c.grade_status || c.grade_status === "Pending") // only show pending
    )
    .map((c) => {
      const dueDate = c.due_date ? new Date(c.due_date) : null;
      const date = dueDate
        ? dueDate.toISOString().split("T")[0]
        : "No Due Date";
      const time = dueDate
        ? dueDate.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        : "N/A";

      const section = sections.find((s) => s.section_id === c.section);
      const course = section
        ? courses.find((cr) => cr.course_id === section.course)
        : undefined;

      return {
        date,
        time,
        activityName: c.content_title,
        courseCode: course?.course_code || "UNKNOWN",
        courseId: course?.course_id || -1,
        isOverdue: !!dueDate && dueDate < new Date(),
        contentId: c.content_id,
        sectionId: c.section,
      };
    });

  // Group activities by date
  const grouped = activities.reduce<Record<string, ActivityItem[]>>(
    (acc, a) => {
      (acc[a.date] = acc[a.date] || []).push(a);
      return acc;
    },
    {}
  );

  // Sort dates for ordered access
  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="space-y-4">
      {/* Container for the activities list with scroll */}
      <div className="max-h-[500px] overflow-y-auto pr-2 space-y-6">
        {sortedDates.length === 0 ? (
          // No activities message
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <CheckCircle className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-sm">No pending activities at the moment.</p>
          </div>
        ) : (
          // Map over each date
          sortedDates.map((date) => {
            const relativeDate = getRelativeDate(date);
            const formattedDate = formatDate(date);

            return (
              <div key={date} className="space-y-3">
                {/* Date header with badge */}
                <div className="flex items-center gap-3 sticky top-0 bg-white pb-2 z-10">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-1xl  text-gray-900">{formattedDate}</h3>
                    {relativeDate && (
                      <span className="inline-block px-2 py-0.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full">
                        {relativeDate}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-gray-500">
                    {grouped[date].length}{" "}
                    {grouped[date].length === 1 ? "activity" : "activities"}
                  </div>
                </div>

                {/* List activities for the date */}
                <div className="space-y-3 ml-6 pl-6 border-l-2 border-gray-200">
                  {grouped[date].map((activity, idx) => (
                    <RouterLink
                      key={idx}
                      to={`/Course/${activity.courseId}`}
                      state={{
                        sectionId: activity.sectionId,
                        contentId: activity.contentId,
                      }}
                      className="block group"
                    >
                      <div
                        className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
                          activity.isOverdue
                            ? "bg-red-50 border-red-200 hover:border-red-400 hover:shadow-lg hover:shadow-red-100"
                            : "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100"
                        }`}
                      >
                        {/* Overdue indicator */}
                        {activity.isOverdue && (
                          <div className="absolute -left-3 top-1/2 -translate-y-1/2">
                            <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
                              <AlertCircle className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {/* Activity title */}
                            <h4
                              className={`text-base font-bold mb-1 group-hover:underline ${
                                activity.isOverdue
                                  ? "text-red-700"
                                  : "text-gray-900"
                              }`}
                            >
                              {activity.activityName}
                            </h4>

                            {/* Course and time info */}
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <BookOpen className="w-4 h-4" />
                                <span className="font-medium">
                                  {activity.courseCode}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <Clock className="w-4 h-4" />
                                <span>Due: {activity.time}</span>
                              </div>
                            </div>
                          </div>

                          {/* Status badge */}
                          <div className="flex-shrink-0">
                            {activity.isOverdue ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-red-700 bg-red-200">
                                <AlertCircle className="w-3 h-3" />
                                Overdue
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-blue-700 bg-blue-200">
                                Pending
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </RouterLink>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default StudentTimeline;
