export type UserType = "Student" | "Instructor" | "Administrator" | "Librarian" | "Superadmin" | "Accounting";
export type ProgramType = "AB-Theology" | "Master of Divinity programs" | "";

export interface User {
  user_id: number;
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  user_type: UserType;
  updated_at?: string;
  created_at?: string;
  profile_picture_url?: string;
  profile_picture?: string;
  program?: ProgramType;
  last_online?: string | null;
}

// for AdminCreateCourseModal.tsx
export type Instructor = Pick<
  User,
  "user_id" | "first_name" | "last_name" | "email"
>;

// for InstructorStudentCourseCollapsibleDataGrid.tsx
export type InstructorStudentCourseCollapsibleDataGrid_User = Omit<
  User,
  "password_hash" | "user_type"
>;

// for Registration Requests
export interface RegistrationRequest {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  created_at?: string;
  updated_at?: string;
}
