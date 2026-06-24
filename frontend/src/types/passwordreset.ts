export interface PasswordReset {
  password_reset_id: number;
  user: number;
  created_at: string;
  updated_at: string;
  status: "Pending" | "Completed";
}
