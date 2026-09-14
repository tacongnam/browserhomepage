"use client";
import { ChevronLeft, ChevronRight, Calendar, RotateCcw } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { vi } from "date-fns/locale";
import type { Schedule, Theme } from "@/types";

interface Props {
  theme: Theme;
  cardClass: string;
  schedules: Schedule[];
  selectedDay: number | null;
  onSelectDay: (day: number | null) => void;
  calendarDate: Date;          // controlled from parent
  onCalendarDateChange: (d: Date) => void;
}

export default function CalendarWidget({
  cardClass,
  schedules,
  selectedDay,
  onSelectDay,
  calendarDate,
  onCalendarDateChange,
}: Props) {
  const today = new Date();
  const isCurrentMonth =
    calendarDate.getFullYear() === today.getFullYear() &&
    calendarDate.getMonth() === today.getMonth();

  const year  = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const firstDayIdx  = new Date(year, month, 1).getDay();
  const startOffset  = (firstDayIdx + 6) % 7; // Mon=0 … Sun=6

  const goToPrev  = () => onCalendarDateChange(subMonths(calendarDate, 1));
  const goToNext  = () => onCalendarDateChange(addMonths(calendarDate, 1));
  const goToToday = () => {
    onCalendarDateChange(new Date());
    onSelectDay(null);
  };

  return (
    <div className={`${cardClass} p-3.5 lg:p-4 flex-none`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5 text-emerald-500">
        <div className="flex items-center gap-2">
          <Calendar size={16} />
          <h2 className="font-semibold text-sm tracking-wide capitalize">
            {format(calendarDate, "MMMM yyyy", { locale: vi })}
          </h2>
        </div>

        <div className="flex items-center gap-1">
          {/* Back to today */}
          {!isCurrentMonth && (
            <button
              onClick={goToToday}
              className="p-1 rounded-lg hover:bg-current/10 transition text-xs font-medium text-emerald-500"
              title="Về tháng hiện tại"
            >
              <RotateCcw size={13} />
            </button>
          )}

          {/* Clear filter */}
          {selectedDay && (
            <button
              onClick={() => onSelectDay(null)}
              className="text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-lg text-emerald-600 hover:bg-emerald-500/20 transition"
            >
              Bỏ lọc
            </button>
          )}

          {/* Month nav */}
          <button onClick={goToPrev} className="p-1 rounded-lg hover:bg-current/10 transition">
            <ChevronLeft size={15} />
          </button>
          <button onClick={goToNext} className="p-1 rounded-lg hover:bg-current/10 transition">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
        {["T2","T3","T4","T5","T6","T7","CN"].map((d) => (
          <div key={d} className="opacity-40 pb-1 font-medium">{d}</div>
        ))}

        {/* Leading empty cells */}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`e-${i}`} className="py-1 px-1" />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const hasEvent  = schedules.some(
            (s) => s.day_of_month === day && (s.month == null || s.month === month)
          );
          const isSelected = selectedDay === day && isCurrentMonth;
          const isToday    = isCurrentMonth && day === today.getDate();

          return (
            <div
              key={day}
              onClick={() => {
                if (!isCurrentMonth) return; // Only allow selecting days in current month view
                onSelectDay(isSelected ? null : day);
              }}
              className={`
                py-1 px-1 rounded-lg text-[12px] relative transition-all select-none
                ${isCurrentMonth ? "cursor-pointer hover:bg-current/5" : "opacity-40 cursor-default"}
                ${isSelected ? "bg-emerald-600 text-white font-semibold shadow-md" : ""}
                ${isToday && !isSelected ? "ring-1 ring-emerald-500 font-semibold" : ""}
              `}
            >
              {day}
              {hasEvent && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-amber-400 rounded-full" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}