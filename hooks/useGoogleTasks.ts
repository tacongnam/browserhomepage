import { useState, useEffect, useCallback, useRef } from "react";
import type { Task } from "@/types";

interface GoogleTaskItem {
  id: string;
  title: string;
  status: "needsAction" | "completed";
  due?: string;      // RFC 3339 timestamp
  notes?: string;
}

interface UseGoogleTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  toggleComplete: (googleTaskId: string, currentCompleted: boolean) => Promise<void>;
  createTask: (title: string) => Promise<Task | null>;
}

export function useGoogleTasks(): UseGoogleTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Prevent double-fetch in React Strict Mode (dev only double-mount)
  const hasFetched = useRef(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/google-tasks", { cache: "no-store" });
      const data = await res.json() as { tasks: GoogleTaskItem[]; error?: string };
      if (data.error) { setError(data.error); return; }

      const mapped: Task[] = (data.tasks ?? []).map((t) => ({
        id: `gtask_${t.id}`,
        google_task_id: t.id,
        text: t.title,
        is_completed: t.status === "completed",
        created_at: new Date().toISOString(),
        source: "google" as const,
        due: t.due ? new Date(t.due).toLocaleDateString("vi-VN") : undefined,
        notes: t.notes,
      }));

      setTasks(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Guard against React Strict Mode double-invoke in development
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchTasks();
  }, [fetchTasks]);

  const toggleComplete = useCallback(
    async (googleTaskId: string, currentCompleted: boolean) => {
      // Optimistic
      setTasks((prev) =>
        prev.map((t) =>
          t.google_task_id === googleTaskId ? { ...t, is_completed: !currentCompleted } : t
        )
      );
      try {
        const res = await fetch("/api/google-tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ googleTaskId, completed: !currentCompleted }),
        });
        if (!res.ok) throw new Error("Toggle failed");
      } catch {
        // Rollback
        setTasks((prev) =>
          prev.map((t) =>
            t.google_task_id === googleTaskId ? { ...t, is_completed: currentCompleted } : t
          )
        );
      }
    },
    []
  );

  const createTask = useCallback(async (title: string): Promise<Task | null> => {
    try {
      const res = await fetch("/api/google-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json() as { task?: GoogleTaskItem };
      if (!data.task) return null;

      const newTask: Task = {
        id: `gtask_${data.task.id}`,
        google_task_id: data.task.id,
        text: data.task.title,
        is_completed: false,
        created_at: new Date().toISOString(),
        source: "google" as const,
      };
      setTasks((prev) => [newTask, ...prev]);
      return newTask;
    } catch {
      return null;
    }
  }, []);

  return { tasks, loading, error, refetch: fetchTasks, toggleComplete, createTask };
}