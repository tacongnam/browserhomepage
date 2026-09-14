"use client";
import { useState, useCallback, useRef } from "react";
import type { ToastItem } from "@/types";
import { generateId } from "@/lib/utils";

const UNDO_TIMEOUT_MS = 5000;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastItem["type"] = "info") => {
      const id = generateId();
      setToasts((prev) => [...prev, { id, message, type }]);
      timers.current[id] = setTimeout(() => dismiss(id), 3000);
    },
    [dismiss]
  );

  /**
   * Correct undo pattern:
   * - The DELETE happens IMMEDIATELY (already done by caller before calling this).
   * - `restoreFn` is called if the user clicks Undo — it re-inserts the item.
   * - Toast auto-dismisses after 5s with no further action needed.
   */
  const toastWithUndo = useCallback(
    (message: string, restoreFn: () => Promise<void> | void) => {
      const id = generateId();

      const undoFn = async () => {
        dismiss(id);
        await restoreFn();
      };

      setToasts((prev) => [...prev, { id, message, type: "warning", undoFn }]);
      timers.current[id] = setTimeout(() => dismiss(id), UNDO_TIMEOUT_MS);
    },
    [dismiss]
  );

  return { toasts, toast, toastWithUndo, dismiss };
}