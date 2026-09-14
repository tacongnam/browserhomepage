// ─── Domain Types ─────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  text: string;
  is_completed: boolean;
  created_at: string;
  source?: "supabase" | "google";
  google_task_id?: string;
  due?: string;    // formatted date string for Google Tasks
  notes?: string;  // task description/notes from Google Tasks
}

export interface Schedule {
  id: string;
  title: string;
  time_range: string;
  day_of_month: number;
  month?: number; // optional: support multi-month schedules
  created_at?: string;
}

export interface Lifestyle {
  id: string;
  text: string;
  is_completed: boolean;
  created_at: string;
}

export interface Email {
  id: string;
  sender: string;
  subject: string;
  time: string;
  type: string;
  snippet?: string;
  otp?: string;            // extracted OTP code if found
  magicLink?: string;      // extracted magic link if found
  isVerification?: boolean;
}

export interface QuickLink {
  id: string;
  label: string;
  url: string;
  icon?: string;  // legacy emoji — ignored now, favicon is used instead
  color?: string; // legacy — ignored now
}

export interface GoogleTask {
  id: string;
  title: string;
  status: "needsAction" | "completed";
  due?: string;
  notes?: string;
}

// ─── UI / Component Types ─────────────────────────────────────────────────────

export type Theme = "dark" | "light";

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export interface ToastItem {
  id: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  undoFn?: () => void;
}

export interface CalendarState {
  year: number;
  month: number; // 0-indexed
}