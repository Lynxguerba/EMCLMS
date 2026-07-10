// types/content.ts
export interface Content {
  content_id: number;
  section: number;
  content_title: string;
  content_type: "Activity" | "File" | "Announcement";
  due_date?: string | null;
  order_in_section?: number | null;
  created_at: string;
  updated_at: string;
  file_path?: string;
  is_active: boolean;
  content_description?: string;
}

// for InstructorCourse.tsx and child

export interface ContentFile {
  path?: any; // kept for backward compatibility with older callers
  id: number;
  file: string;
  file_url?: string;
  file_name?: string;
  uploaded_at: string;
}

// for InstructorCourse.tsx and child
export interface InstructorCourse_Content {
  content_id: number;
  content_title: string;
  content_type: "Activity" | "File" | "Announcement";
  due_date: string | null;
  order_in_section: number;
  is_active: boolean;
  total_score?: number | string | null;
  content_description: string;
  files?: ContentFile[];
  download_count?: number;
  submission_count?: number;
  total_enrolled?: number;
}

export interface InstructorCourse_Section {
  section_id: number;
  section_title: string;
  description: string;
  order_in_course: number | null;
  contents?: InstructorCourse_Content[];
  is_completed: boolean;
}
