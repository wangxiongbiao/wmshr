export type AdminEmailAuthMode = "login" | "register";

export interface AdminEmailAuthPayload {
  mode: AdminEmailAuthMode;
  email: string;
  password: string;
  confirmPassword: string;
}
