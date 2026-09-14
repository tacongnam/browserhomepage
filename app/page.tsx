"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Cloud, Mail, ListTodo, Calendar,
  Dumbbell, Book, Plus, Trash2, CircleCheck, Circle, X,
  Sun, Moon, ChevronLeft, ChevronRight, Activity,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

import type { Task, Schedule, Lifestyle, Email, Theme } from "@/types";
import { getDynamicReminder, isTodayOrFuture } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { useGoogleTasks } from "@/hooks/useGoogleTasks";

import ToastStack from "@/components/ToastStack";
import CalendarWidget from "@/components/CalendarWidget";
import QuickLinks from "@/components/QuickLinks";
import EmailCard from "@/components/EmailCard";
import CollapsibleWidget from "@/components/CollapsibleWidget";

// ─── Pagination ────────────────────────────────────────────────────────────────

function Pagination({
  page, total, setPage,
}: { page: number; total: number; setPage: (fn: (p: number) => number) => void }) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-2 mt-auto border-t border-current/10 text-sm flex-none">
      <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1}
        className="p-1.5 rounded-lg hover:bg-current/10 disabled:opacity-30 transition">
        <ChevronLeft size={18} />
      </button>
      <span className="text-xs font-medium opacity-70">Trang {page} / {total}</span>
      <button onClick={() => setPage((p) => Math.min(p + 1, total))} disabled={page === total}
        className="p-1.5 rounded-lg hover:bg-current/10 disabled:opacity-30 transition">
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  // ── Theme & clock ──────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<Theme>("dark");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);
  const [reminder, setReminder] = useState("");

  useEffect(() => {
    setIsMounted(true);
    setCurrentTime(new Date());
    setReminder(getDynamicReminder(new Date()));

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setTheme(mq.matches ? "dark" : "light");
    const handler = (e: MediaQueryListEvent) => setTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);

    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      // Update reminder every 15 min
      if (now.getSeconds() === 0 && now.getMinutes() % 15 === 0) {
        setReminder(getDynamicReminder(now));
      }
    }, 1000);

    return () => { clearInterval(timer); mq.removeEventListener("change", handler); };
  }, []);

  // ── Toast / Undo ───────────────────────────────────────────────────────────
  const { toasts, toast, toastWithUndo, dismiss } = useToast();

  // ── Weather ────────────────────────────────────────────────────────────────
  const [temperature, setTemperature] = useState<number | null>(null);
  useEffect(() => {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=22.48&longitude=103.97&current=temperature_2m")
      .then((r) => r.json())
      .then((d) => { if (d?.current?.temperature_2m != null) setTemperature(Math.round(d.current.temperature_2m)); })
      .catch(() => {});
  }, []);

  // ── Calendar state ─────────────────────────────────────────────────────────
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => { setSchedPage(1); }, [selectedDay]);

  // ── Tasks (Supabase) ───────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskPage, setTaskPage] = useState(1);
  const TASKS_PER_PAGE = 4;

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
    if (data) setTasks(data as Task[]);
  }, []);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    const { data } = await supabase.from("tasks").insert([{ text: newTask }]).select();
    if (data) { setTasks((prev) => [data[0] as Task, ...prev]); setNewTask(""); setIsTaskModalOpen(false); }
  };

  const toggleTask = async (id: string, current: boolean) => {
    await supabase.from("tasks").update({ is_completed: !current }).eq("id", id);
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, is_completed: !current } : t));
  };

  const deleteTask = async (id: string) => {
    const target = tasks.find((t) => t.id === id);
    if (!target) return;
    // 1. Remove from UI immediately
    setTasks((prev) => prev.filter((t) => t.id !== id));
    // 2. Delete from DB immediately
    await supabase.from("tasks").delete().eq("id", id);
    // 3. Show undo toast — if clicked, re-insert into DB and restore UI
    toastWithUndo(`Đã xóa: "${target.text}"`, async () => {
      const { data } = await supabase.from("tasks")
        .insert([{ text: target.text, is_completed: target.is_completed }])
        .select();
      if (data) setTasks((prev) => [data[0] as Task, ...prev]);
    });
  };

  // ── Google Tasks ───────────────────────────────────────────────────────────
  const googleTasks = useGoogleTasks();

  // ── Schedules ──────────────────────────────────────────────────────────────
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [newSchedTitle, setNewSchedTitle] = useState("");
  const [newSchedTime, setNewSchedTime] = useState("");
  const [newSchedDay, setNewSchedDay] = useState("");
  const [isSchedModalOpen, setIsSchedModalOpen] = useState(false);
  const [schedPage, setSchedPage] = useState(1);
  const SCHED_PER_PAGE = 4;

  const fetchSchedules = useCallback(async () => {
    const { data } = await supabase.from("schedules").select("*").order("day_of_month", { ascending: true });
    if (data) setSchedules(data as Schedule[]);
  }, []);

  const addSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchedTitle || !newSchedTime || !newSchedDay) return;
    const { data } = await supabase.from("schedules").insert([{
      title: newSchedTitle,
      time_range: newSchedTime,
      day_of_month: parseInt(newSchedDay),
    }]).select();
    if (data) {
      setSchedules([...schedules, data[0] as Schedule]);
      setNewSchedTitle(""); setNewSchedTime(""); setNewSchedDay("");
      setIsSchedModalOpen(false);
      toast("Đã thêm lịch trình!", "success");
    }
  };

  const deleteSchedule = async (id: string) => {
    const target = schedules.find((s) => s.id === id);
    if (!target) return;
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    await supabase.from("schedules").delete().eq("id", id);
    toastWithUndo(`Đã xóa lịch: "${target.title}"`, async () => {
      const { data } = await supabase.from("schedules")
        .insert([{ title: target.title, time_range: target.time_range, day_of_month: target.day_of_month }])
        .select();
      if (data) setSchedules((prev) => [...prev, data[0] as Schedule].sort((a, b) => a.day_of_month - b.day_of_month));
    });
  };

  // ── Lifestyles ─────────────────────────────────────────────────────────────
  const [lifestyles, setLifestyles] = useState<Lifestyle[]>([]);
  const [newLifestyle, setNewLifestyle] = useState("");
  const [isLifeModalOpen, setIsLifeModalOpen] = useState(false);
  const [lifePage, setLifePage] = useState(1);
  const LIFE_PER_PAGE = 4;

  const fetchLifestyles = useCallback(async () => {
    const { data } = await supabase.from("lifestyles").select("*").order("created_at", { ascending: true });
    if (data) setLifestyles(data as Lifestyle[]);
  }, []);

  const addLifestyle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLifestyle.trim()) return;
    const { data } = await supabase.from("lifestyles").insert([{ text: newLifestyle }]).select();
    if (data) { setLifestyles([...lifestyles, data[0] as Lifestyle]); setNewLifestyle(""); setIsLifeModalOpen(false); }
  };

  const toggleLifestyle = async (id: string, current: boolean) => {
    await supabase.from("lifestyles").update({ is_completed: !current }).eq("id", id);
    setLifestyles((prev) => prev.map((l) => l.id === id ? { ...l, is_completed: !current } : l));
  };

  const deleteLifestyle = async (id: string) => {
    const target = lifestyles.find((l) => l.id === id);
    if (!target) return;
    setLifestyles((prev) => prev.filter((l) => l.id !== id));
    await supabase.from("lifestyles").delete().eq("id", id);
    toastWithUndo(`Đã xóa thói quen: "${target.text}"`, async () => {
      const { data } = await supabase.from("lifestyles")
        .insert([{ text: target.text, is_completed: target.is_completed }])
        .select();
      if (data) setLifestyles((prev) => [...prev, data[0] as Lifestyle]);
    });
  };

  // ── Emails ─────────────────────────────────────────────────────────────────
  const [emails, setEmails] = useState<Email[]>([]);
  const [emailPage, setEmailPage] = useState(1);
  const EMAILS_PER_PAGE = 3;
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  // ── Bootstrap — ref guard prevents double-fetch in React Strict Mode ─────
  const bootstrapped = useRef(false);
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    fetchTasks();
    fetchSchedules();
    fetchLifestyles();
    fetch("/api/emails")
      .then((r) => r.json())
      .then((d: { emails?: Email[] }) => { if (d.emails) setEmails(d.emails); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived data ───────────────────────────────────────────────────────────

  // Only show schedules from today onwards when no day is selected
  const today = new Date();
  const displayedSchedules = selectedDay
    ? schedules.filter((s) => s.day_of_month === selectedDay)
    : schedules.filter((s) =>
        isTodayOrFuture(s.day_of_month, calendarDate.getMonth(), calendarDate.getFullYear())
      );

  const pagedSchedules = displayedSchedules.slice(
    (schedPage - 1) * SCHED_PER_PAGE,
    schedPage * SCHED_PER_PAGE,
  );
  const totalSchedPages = Math.ceil(displayedSchedules.length / SCHED_PER_PAGE) || 1;

  const pagedTasks      = tasks.slice((taskPage - 1) * TASKS_PER_PAGE, taskPage * TASKS_PER_PAGE);
  const totalTaskPages  = Math.ceil(tasks.length / TASKS_PER_PAGE) || 1;

  const pagedLifestyles = lifestyles.slice((lifePage - 1) * LIFE_PER_PAGE, lifePage * LIFE_PER_PAGE);
  const totalLifePages  = Math.ceil(lifestyles.length / LIFE_PER_PAGE) || 1;

  const pagedEmails     = emails.slice((emailPage - 1) * EMAILS_PER_PAGE, emailPage * EMAILS_PER_PAGE);
  const totalEmailPages = Math.ceil(emails.length / EMAILS_PER_PAGE) || 1;

  // ── Theme classes ──────────────────────────────────────────────────────────
  const cardClass = theme === "dark"
    ? "bg-slate-900/80 border border-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm"
    : "bg-white/90 border border-slate-200/80 backdrop-blur-md rounded-2xl shadow-sm";

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className={`
      min-h-screen lg:h-screen flex flex-col
      ${theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"}
      p-3 lg:p-4 overflow-y-auto lg:overflow-hidden transition-colors
    `}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex-none grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">

        {/* Clock */}
        <div className={`${cardClass} p-3.5 lg:p-4 flex items-center justify-between col-span-1 md:col-span-3`}>
          <div>
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">
              {isMounted ? format(currentTime, "HH:mm:ss") : "--:--:--"}
            </h1>
            <p className="text-sm opacity-70 mt-0.5 capitalize">
              {format(currentTime, "eeee, dd MMMM yyyy", { locale: vi })}
            </p>
          </div>
          <div className="text-right flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-xl border border-current/10 hover:bg-current/5 transition"
              title="Chuyển đổi giao diện"
            >
              {theme === "dark"
                ? <Sun size={20} className="text-amber-400" />
                : <Moon size={20} className="text-indigo-600" />}
            </button>
            <div className="hidden sm:block text-left">
              <p className="text-lg font-medium">{temperature != null ? `${temperature}°C` : "--°C"}</p>
              <p className="text-xs opacity-60">Lào Cai, VN</p>
            </div>
            <Cloud size={32} className="opacity-70" />
          </div>
        </div>

        {/* Dynamic reminder */}
        <div className={`${cardClass} p-3.5 lg:p-4 flex flex-col justify-center bg-indigo-500/5 border-indigo-500/10 col-span-1`}>
          <div className="flex items-center gap-2 text-indigo-500 mb-1">
            <Activity size={16} />
            <p className="text-xs font-semibold uppercase tracking-wider">Nhắc nhở</p>
          </div>
          <p className="text-sm italic opacity-90 leading-snug">{reminder || "Hãy chăm sóc bản thân bạn hôm nay!"}</p>
        </div>
      </div>

      {/* ── MOBILE: Quick Links & Schedule first ───────────────────────────── */}
      <div className="lg:hidden flex flex-col gap-3 mb-3">
        <QuickLinks theme={theme} cardClass={cardClass} />

        {/* Schedule — CollapsibleWidget owns the card shell */}
        <CollapsibleWidget
          title={selectedDay ? `Lịch ngày ${selectedDay}` : "Lịch trình sắp tới"}
          icon={<Book size={16} />}
          accentClass="text-purple-500"
          cardClass={cardClass}
          defaultOpen={true}
          headerExtra={
            <button onClick={() => setIsSchedModalOpen(true)}
              className="p-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 rounded-lg transition">
              <Plus size={14} />
            </button>
          }
        >
          <div className="space-y-2 pt-2">
            {pagedSchedules.length === 0 && <p className="text-xs text-center opacity-40 py-4">Không có sự kiện nào.</p>}
            {pagedSchedules.map((sched) => (
              <div key={sched.id} className="group relative pl-3 border-l-2 border-purple-500/40 bg-current/5 py-2 px-3 rounded-r-xl hover:bg-current/10 transition">
                <p className="text-[11px] opacity-60 font-mono mb-0.5">Ngày {sched.day_of_month} • {sched.time_range}</p>
                <p className="text-sm font-medium">{sched.title}</p>
                <button onClick={() => deleteSchedule(sched.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-400 p-1 transition">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <Pagination page={schedPage} total={totalSchedPages} setPage={setSchedPage} />
        </CollapsibleWidget>
      </div>

      {/* ── DESKTOP 3-COLUMN GRID ──────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-3 lg:min-h-0 pb-3 lg:pb-0">

        {/* ── COL 1: Calendar + Lifestyle ──────────────────────────────────── */}
        <div className="flex flex-col gap-3 lg:min-h-0">
          <CalendarWidget
            theme={theme}
            cardClass={cardClass}
            schedules={schedules}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            calendarDate={calendarDate}
            onCalendarDateChange={setCalendarDate}
          />

          {/* Quick Links — desktop only */}
          <div className="hidden lg:block">
            <QuickLinks theme={theme} cardClass={cardClass} />
          </div>

          {/* Lifestyle — widget owns card shell on both breakpoints */}
          <CollapsibleWidget
            title="Lifestyle & Thói quen"
            icon={<Dumbbell size={16} />}
            accentClass="text-amber-500"
            cardClass={cardClass}
            defaultOpen={false}
            className="lg:flex-1"
            headerExtra={
              <button onClick={() => setIsLifeModalOpen(true)}
                className="p-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg transition">
                <Plus size={14} />
              </button>
            }
          >
            <div className="space-y-1.5 flex-1 pt-1">
              {pagedLifestyles.length === 0 && <p className="text-xs text-center opacity-40 py-4">Chưa có thói quen nào.</p>}
              {pagedLifestyles.map((life) => (
                <div key={life.id} className="group flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-current/5 transition">
                  <div className="flex items-center gap-2.5 cursor-pointer flex-1" onClick={() => toggleLifestyle(life.id, life.is_completed)}>
                    <div className={`w-2 h-2 rounded-full flex-none ${life.is_completed ? "bg-emerald-500" : "bg-slate-400"}`} />
                    <p className={`text-sm ${life.is_completed ? "opacity-40 line-through" : ""}`}>{life.text}</p>
                  </div>
                  <button onClick={() => deleteLifestyle(life.id)} className="opacity-0 group-hover:opacity-100 text-red-400 transition p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <Pagination page={lifePage} total={totalLifePages} setPage={setLifePage} />
          </CollapsibleWidget>
        </div>

        {/* ── COL 2: Schedule (desktop only — plain card, no collapse needed) ── */}
        <div className="hidden lg:flex flex-col gap-3 lg:min-h-0">
          <div className={`${cardClass} p-3.5 lg:p-4 flex flex-col lg:flex-1 lg:min-h-0`}>
            <div className="flex items-center justify-between mb-2.5 text-purple-500 flex-none">
              <div className="flex items-center gap-2">
                <Book size={16} />
                <h2 className="font-semibold text-sm tracking-wide">
                  {selectedDay ? `Lịch ngày ${selectedDay}` : "Lịch trình sắp tới"}
                </h2>
              </div>
              <button onClick={() => setIsSchedModalOpen(true)}
                className="p-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 rounded-lg transition">
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-2 flex-1">
              {pagedSchedules.length === 0 && <p className="text-xs text-center opacity-40 py-6">Không có sự kiện nào.</p>}
              {pagedSchedules.map((sched) => (
                <div key={sched.id} className="group relative pl-3 border-l-2 border-purple-500/40 bg-current/5 py-2 px-3 rounded-r-xl hover:bg-current/10 transition">
                  <p className="text-[11px] opacity-60 font-mono mb-0.5">Ngày {sched.day_of_month} • {sched.time_range}</p>
                  <p className="text-sm font-medium">{sched.title}</p>
                  <button onClick={() => deleteSchedule(sched.id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-400 p-1 transition">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <Pagination page={schedPage} total={totalSchedPages} setPage={setSchedPage} />
          </div>
        </div>

        {/* ── COL 3: Tasks + Emails ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 lg:min-h-0">

          {/* Supabase Tasks */}
          <CollapsibleWidget
            title="Công việc cần làm"
            icon={<ListTodo size={16} />}
            accentClass="text-indigo-500"
            cardClass={cardClass}
            defaultOpen={false}
            className="lg:flex-1"
            headerExtra={
              <div className="flex items-center gap-2">
                <span className="text-[11px] bg-indigo-500/10 px-2 py-0.5 rounded font-medium">{tasks.length}</span>
                <button onClick={() => setIsTaskModalOpen(true)}
                  className="p-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 rounded-lg transition">
                  <Plus size={14} />
                </button>
              </div>
            }
          >
            <div className="space-y-1.5 flex-1 pt-1">
              {pagedTasks.length === 0 && <p className="text-xs text-center opacity-40 py-4">Chưa có công việc nào.</p>}
              {pagedTasks.map((task) => (
                <div key={task.id} className="group flex items-center justify-between bg-current/5 py-1.5 px-2.5 rounded-lg border border-current/5 hover:border-current/15 transition">
                  <div className="flex items-center gap-2.5 flex-1 cursor-pointer" onClick={() => toggleTask(task.id, task.is_completed)}>
                    {task.is_completed
                      ? <CircleCheck className="text-emerald-500 flex-none" size={16} />
                      : <Circle className="opacity-40 flex-none" size={16} />}
                    <span className={`text-sm ${task.is_completed ? "line-through opacity-40" : ""}`}>{task.text}</span>
                  </div>
                  <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <Pagination page={taskPage} total={totalTaskPages} setPage={setTaskPage} />
          </CollapsibleWidget>

          {/* Google Tasks */}
          {googleTasks.tasks.length > 0 && (
            <CollapsibleWidget
              title={`Google Tasks ${googleTasks.loading ? "…" : `(${googleTasks.tasks.length})`}`}
              icon={<ListTodo size={16} className="text-green-400" />}
              accentClass="text-green-400"
              cardClass={cardClass}
              defaultOpen={false}
              scrollable
            >
              <div className="space-y-1.5 pt-1">
                {googleTasks.tasks.slice(0, 10).map((t) => (
                  <div key={t.id}
                    className="flex items-start gap-2.5 py-1.5 px-2 rounded-lg hover:bg-current/5 transition cursor-pointer"
                    onClick={() => googleTasks.toggleComplete(t.google_task_id!, t.is_completed)}>
                    {t.is_completed
                      ? <CircleCheck className="text-green-400 flex-none mt-0.5" size={16} />
                      : <Circle className="opacity-40 flex-none mt-0.5" size={16} />}
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm block ${t.is_completed ? "line-through opacity-40" : ""}`}>
                        {t.text}
                      </span>
                      {(t.due || t.notes) && (
                        <div className="flex gap-2 mt-0.5 flex-wrap">
                          {t.due && (
                            <span className="text-[10px] text-green-400/70 font-mono">📅 {t.due}</span>
                          )}
                          {t.notes && (
                            <span className="text-[10px] opacity-50 truncate max-w-[160px]">{t.notes}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleWidget>
          )}

          {/* Emails */}
          <CollapsibleWidget
            title="Emails Quan trọng"
            icon={<Mail size={16} />}
            accentClass="text-blue-500"
            cardClass={cardClass}
            defaultOpen={false}
            scrollable
            className="lg:flex-1"
            headerExtra={<span className="text-[11px] opacity-60">{emails.length} thư</span>}
          >
            <div className="space-y-1.5 pt-1 pr-1">
              {pagedEmails.length === 0 && <p className="text-xs text-center opacity-40 py-4">Không có email mới.</p>}
              {pagedEmails.map((email) => (
                <EmailCard key={email.id} email={email} onClick={() => setSelectedEmail(email)} />
              ))}
            </div>
            <Pagination page={emailPage} total={totalEmailPages} setPage={setEmailPage} />
          </CollapsibleWidget>
        </div>
      </div>

      {/* ── MODALS ─────────────────────────────────────────────────────────── */}

      {/* Email detail */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`${cardClass} w-full max-w-lg p-5 lg:p-6 relative`}>
            <button onClick={() => setSelectedEmail(null)} className="absolute top-4 right-4 p-1.5 opacity-50 hover:opacity-100"><X size={18} /></button>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                selectedEmail.isVerification ? "text-violet-400 bg-violet-500/10"
                : selectedEmail.sender?.includes("hust.edu.vn") ? "text-red-500 bg-red-500/10"
                : "text-blue-500 bg-blue-500/10"}`}>
                {selectedEmail.isVerification ? "Xác minh" : selectedEmail.sender?.includes("hust.edu.vn") ? "HUST" : selectedEmail.type}
              </span>
              <span className="text-xs opacity-60">{selectedEmail.time}</span>
            </div>
            <h3 className="text-base font-semibold mb-1.5">{selectedEmail.subject}</h3>
            <p className="text-sm opacity-70 mb-4 border-b border-current/10 pb-2">Từ: {selectedEmail.sender}</p>
            {selectedEmail.otp && (
              <div className="mb-3 flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-3">
                <span className="text-xs text-violet-400 font-medium">Mã OTP:</span>
                <span className="text-2xl font-bold tracking-[0.4em] text-violet-300 flex-1">{selectedEmail.otp}</span>
              </div>
            )}
            <div className="bg-current/5 p-3 rounded-lg text-sm opacity-90 max-h-[35vh] overflow-y-auto mb-4 whitespace-pre-wrap leading-relaxed">
              {selectedEmail.snippet || "Không có nội dung hiển thị trước."}
            </div>
            <div className="flex justify-end">
              <button onClick={() => setSelectedEmail(null)} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Add task */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`${cardClass} w-full max-w-md p-5 relative`}>
            <button onClick={() => setIsTaskModalOpen(false)} className="absolute top-4 right-4 p-1.5 opacity-50 hover:opacity-100"><X size={18} /></button>
            <h3 className="text-base font-medium mb-4 text-indigo-500">Thêm công việc mới</h3>
            <form onSubmit={addTask} className="space-y-3">
              <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Nhập nội dung công việc..."
                className="w-full bg-current/5 border border-current/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500" autoFocus />
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-3 py-1.5 text-sm font-medium rounded-lg opacity-70 hover:opacity-100">Hủy</button>
                <button type="submit" className="px-4 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition">Thêm</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add schedule */}
      {isSchedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`${cardClass} w-full max-w-md p-5 relative`}>
            <button onClick={() => setIsSchedModalOpen(false)} className="absolute top-4 right-4 p-1.5 opacity-50 hover:opacity-100"><X size={18} /></button>
            <h3 className="text-base font-medium mb-4 text-purple-500">Thêm lịch học / sự kiện</h3>
            <form onSubmit={addSchedule} className="space-y-3">
              <input value={newSchedTitle} onChange={(e) => setNewSchedTitle(e.target.value)} placeholder="Tên môn học / sự kiện"
                className="w-full bg-current/5 border border-current/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500" autoFocus />
              <div className="flex gap-2">
                <input type="number" min="1" max="31" value={newSchedDay} onChange={(e) => setNewSchedDay(e.target.value)} placeholder="Ngày (1-31)"
                  className="w-1/3 bg-current/5 border border-current/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
                <input value={newSchedTime} onChange={(e) => setNewSchedTime(e.target.value)} placeholder="Thời gian (VD: 08:00–10:00)"
                  className="w-2/3 bg-current/5 border border-current/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setIsSchedModalOpen(false)} className="px-3 py-1.5 text-sm font-medium rounded-lg opacity-70 hover:opacity-100">Hủy</button>
                <button type="submit" className="px-4 py-1.5 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition">Thêm lịch</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add lifestyle */}
      {isLifeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`${cardClass} w-full max-w-md p-5 relative`}>
            <button onClick={() => setIsLifeModalOpen(false)} className="absolute top-4 right-4 p-1.5 opacity-50 hover:opacity-100"><X size={18} /></button>
            <h3 className="text-base font-medium mb-4 text-amber-500">Thêm thói quen mục tiêu</h3>
            <form onSubmit={addLifestyle} className="space-y-3">
              <input value={newLifestyle} onChange={(e) => setNewLifestyle(e.target.value)} placeholder="VD: Uống đủ 2L nước..."
                className="w-full bg-current/5 border border-current/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500" autoFocus />
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setIsLifeModalOpen(false)} className="px-3 py-1.5 text-sm font-medium rounded-lg opacity-70 hover:opacity-100">Hủy</button>
                <button type="submit" className="px-4 py-1.5 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition">Thêm</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast stack */}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}