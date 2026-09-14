"use client";
import { X, Undo2 } from "lucide-react";
import type { ToastItem } from "@/types";

interface Props {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const COLORS: Record<NonNullable<ToastItem["type"]>, string> = {
  info:    "bg-slate-800 border-slate-700 text-slate-100",
  success: "bg-emerald-900/90 border-emerald-700 text-emerald-100",
  warning: "bg-amber-900/90 border-amber-700 text-amber-100",
  error:   "bg-red-900/90 border-red-700 text-red-100",
};

export default function ToastStack({ toasts, onDismiss }: Props) {
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`
            pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-xl
            border shadow-lg text-sm font-medium min-w-[260px] max-w-[90vw]
            animate-in fade-in slide-in-from-bottom-3 duration-200
            ${COLORS[t.type ?? "info"]}
          `}
        >
          <span className="flex-1">{t.message}</span>

          {t.undoFn && (
            <button
              onClick={t.undoFn}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition text-xs font-semibold"
            >
              <Undo2 size={12} />
              Hoàn tác
            </button>
          )}

          <button
            onClick={() => onDismiss(t.id)}
            className="p-1 opacity-60 hover:opacity-100 transition"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}