export interface Course {
  course_id: number;
  course_code: string;
  course_title: string;
  description: string;
  instructor: number | string;
  created_at: string;
  updated_at: string;
  is_active: boolean;

  instructor_name?: string;    // Fullname returned by your API
  school_year?: string;        // School year assigned to the course
  progress?: number;           // Computed in frontend
  hasNoSections?: boolean;     // Computed in frontend
  schedules?: CourseSchedule[];
}

export interface CourseSchedule {
  day_of_week: string;
  start_time: string;
  end_time: string;
}

// for AdminCreateCourseModal.tsx
export type NewCourse = Omit<Course, "course_id" | "created_at" | "updated_at">;

export interface CourseForm {
  course_code: string;
  course_title: string;
  description: string;
  instructor_id: number | "";
  is_active: boolean;
}

// for InstructorStudentCourseCollapsibleDataGrid.tsx
export type InstructorStudentCourseCollapsibleDataGrid_Course = Omit<
  Course,
  "created_at" | "updated_at" | "is_active" | "instructor"
>;

// for InstructorCourse.tsx
export type InstructorCourse_Course = Pick<
  Course,
  "course_id" | "course_title" | "course_code" | "description"
>;
