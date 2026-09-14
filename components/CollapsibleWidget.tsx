"use client";
import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface Props {
  title: string;
  icon: React.ReactNode;
  accentClass?: string;
  cardClass: string;
  headerExtra?: React.ReactNode;
  defaultOpen?: boolean;
  scrollable?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Always renders as a self-contained card with a clickable header.
 *
 * Mobile  → collapsible: clicking the header toggles the body open/closed.
 *           When closed, only the header bar is visible (card collapses fully).
 * Desktop → always expanded, chevron hidden, full-height flex column.
 */
export default function CollapsibleWidget({
  title,
  icon,
  accentClass = "text-slate-400",
  cardClass,
  headerExtra,
  defaultOpen = false,
  scrollable = false,
  className = "",
  children,
}: Props) {
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const effectiveOpen = !isMobile || isOpen;

  return (
    <div
      className={`
        ${cardClass} overflow-hidden
        ${!isMobile ? "flex flex-col flex-1 min-h-0" : ""}
        ${className}
      `}
    >
      {/* ── Header — always visible, clickable on mobile ── */}
      <div
        className={`
          flex items-center justify-between px-3.5 py-3 ${accentClass}
          ${isMobile ? "cursor-pointer select-none" : ""}
        `}
        onClick={() => isMobile && setIsOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="font-semibold text-sm tracking-wide">{title}</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Stop clicks on buttons inside headerExtra from toggling the card */}
          <div onClick={(e) => e.stopPropagation()}>{headerExtra}</div>

          {isMobile && (
            <ChevronDown
              size={15}
              className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            />
          )}
        </div>
      </div>

      {/* ── Body ── */}
      {effectiveOpen && (
        <div
          className={`
            px-3.5 pb-3.5
            ${!isMobile ? "flex-1 min-h-0 flex flex-col" : ""}
            ${scrollable ? "overflow-y-auto max-h-72 lg:max-h-none" : ""}
          `}
        >
          {children}
        </div>
      )}
    </div>
  );
}