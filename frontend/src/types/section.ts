export interface Section { 
  section_id: number;
  course_id: number;
  section_title: string;
  description?: string; 
  order_in_course?: number; 
  created_at: string;
  updated_at: string; 
  is_completed: boolean;
}
