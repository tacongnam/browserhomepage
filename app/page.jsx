"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Cloud, Mail, ListTodo, Calendar, 
  Dumbbell, Book, Plus, Trash2, CircleCheck, Circle, X, Sun, Moon,
  ChevronLeft, ChevronRight, Activity 
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

// Reusable Pagination Component (Thu nhỏ khoảng cách trên/dưới)
const Pagination = ({ page, total, setPage }) => {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-2 mt-auto border-t border-current/10 text-sm flex-none">
      <button 
        onClick={() => setPage(p => Math.max(p - 1, 1))}
        disabled={page === 1}
        className="p-1.5 rounded-lg hover:bg-current/10 disabled:opacity-30 transition"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="text-xs font-medium opacity-70">Trang {page} / {total}</span>
      <button 
        onClick={() => setPage(p => Math.min(p + 1, total))}
        disabled={page === total}
        className="p-1.5 rounded-lg hover:bg-current/10 disabled:opacity-30 transition"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
};

export default function Dashboard() {
  const [theme, setTheme] = useState('dark');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setCurrentTime(new Date());
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);
  const [selectedDay, setSelectedDay] = useState(null); 
  const [temperature, setTemperature] = useState(null);
  
  // Tasks
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskPage, setTaskPage] = useState(1);
  const tasksPerPage = 4;

  // Schedules
  const [schedules, setSchedules] = useState([]);
  const [newSchedTitle, setNewSchedTitle] = useState("");
  const [newSchedTime, setNewSchedTime] = useState("");
  const [newSchedDay, setNewSchedDay] = useState("");
  const [isSchedModalOpen, setIsSchedModalOpen] = useState(false);
  const [schedPage, setSchedPage] = useState(1);
  const schedPerPage = 4;

  // Lifestyles
  const [lifestyles, setLifestyles] = useState([]);
  const [newLifestyle, setNewLifestyle] = useState("");
  const [isLifeModalOpen, setIsLifeModalOpen] = useState(false);
  const [lifePage, setLifePage] = useState(1);
  const lifePerPage = 4;

  // Emails
  const [emails, setEmails] = useState([]);
  const [emailPage, setEmailPage] = useState(1);
  const emailsPerPage = 3;
  const [selectedEmail, setSelectedEmail] = useState(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setTheme(mediaQuery.matches ? 'dark' : 'light');
    const handler = (e) => setTheme(e.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=22.48&longitude=103.97&current=temperature_2m')
      .then(res => res.json())
      .then(data => {
        if (data?.current?.temperature_2m) {
          setTemperature(Math.round(data.current.temperature_2m));
        }
      })
      .catch(err => console.error("Weather fetch error:", err));
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchSchedules();
    fetchLifestyles();
    fetch('/api/emails')
      .then(res => res.json())
      .then(data => { 
        if (data.emails) {
          setEmails(data.emails.slice(0, 30)); 
        } 
      })
      .catch(err => console.error("Failed to load emails:", err));
  }, []);

  useEffect(() => {
    setSchedPage(1);
  }, [selectedDay]);

  async function fetchTasks() {
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    if (data) setTasks(data);
  }
  async function addTask(e) {
    e.preventDefault();
    if (!newTask) return;
    const { data } = await supabase.from('tasks').insert([{ text: newTask }]).select();
    if (data) { setTasks([data[0], ...tasks]); setNewTask(""); setIsTaskModalOpen(false); }
  }
  async function toggleTask(id, currentStatus) {
    await supabase.from('tasks').update({ is_completed: !currentStatus }).eq('id', id);
    setTasks(tasks.map(t => t.id === id ? { ...t, is_completed: !currentStatus } : t));
  }
  async function deleteTask(id) {
    await supabase.from('tasks').delete().eq('id', id);
    setTasks(tasks.filter(t => t.id !== id));
  }

  async function fetchLifestyles() {
    const { data } = await supabase.from('lifestyles').select('*').order('created_at', { ascending: true });
    if (data) setLifestyles(data);
  }
  async function addLifestyle(e) {
    e.preventDefault();
    if (!newLifestyle) return;
    const { data } = await supabase.from('lifestyles').insert([{ text: newLifestyle }]).select();
    if (data) { setLifestyles([...lifestyles, data[0]]); setNewLifestyle(""); setIsLifeModalOpen(false); }
  }
  async function toggleLifestyle(id, currentStatus) {
    await supabase.from('lifestyles').update({ is_completed: !currentStatus }).eq('id', id);
    setLifestyles(lifestyles.map(l => l.id === id ? { ...l, is_completed: !currentStatus } : l));
  }
  async function deleteLifestyle(id) {
    await supabase.from('lifestyles').delete().eq('id', id);
    setLifestyles(lifestyles.filter(l => l.id !== id));
  }

  async function fetchSchedules() {
    const { data } = await supabase.from('schedules').select('*').order('day_of_month', { ascending: true });
    if (data) setSchedules(data);
  }
  async function addSchedule(e) {
    e.preventDefault();
    if (!newSchedTitle || !newSchedTime || !newSchedDay) return;
    const { data } = await supabase.from('schedules').insert([{ 
      title: newSchedTitle, 
      time_range: newSchedTime, 
      day_of_month: parseInt(newSchedDay) 
    }]).select();
    if (data) { 
      setSchedules([...schedules, data[0]]); 
      setNewSchedTitle(""); setNewSchedTime(""); setNewSchedDay("");
      setIsSchedModalOpen(false);
    }
  }
  async function deleteSchedule(id) {
    await supabase.from('schedules').delete().eq('id', id);
    setSchedules(schedules.filter(s => s.id !== id));
  }

  const currentTasks = tasks.slice((taskPage - 1) * tasksPerPage, taskPage * tasksPerPage);
  const totalTaskPages = Math.ceil(tasks.length / tasksPerPage) || 1;

  const displayedSchedules = selectedDay ? schedules.filter(s => s.day_of_month === selectedDay) : schedules;
  const currentSchedules = displayedSchedules.slice((schedPage - 1) * schedPerPage, schedPage * schedPerPage);
  const totalSchedPages = Math.ceil(displayedSchedules.length / schedPerPage) || 1;

  const currentLifestyles = lifestyles.slice((lifePage - 1) * lifePerPage, lifePage * lifePerPage);
  const totalLifePages = Math.ceil(lifestyles.length / lifePerPage) || 1;

  const currentEmails = emails.slice((emailPage - 1) * emailsPerPage, emailPage * emailsPerPage);
  const totalEmailPages = Math.ceil(emails.length / emailsPerPage) || 1;

  const cardClass = theme === 'dark' 
    ? "bg-slate-900/80 border border-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm" 
    : "bg-white/90 border border-slate-200/80 backdrop-blur-md rounded-2xl shadow-sm";

  const currentYear = currentTime.getFullYear();
  const currentMonth = currentTime.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  // Chuyển đổi getDay() (Chủ nhật = 0) sang định dạng Thứ 2 = 0 ... Chủ nhật = 6
  const startOffset = (firstDayIndex + 6) % 7;

  return (
    <div className={`min-h-screen lg:h-screen flex flex-col ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'} p-3 lg:p-4 overflow-y-auto lg:overflow-hidden transition-colors`}>
      
      {/* HEADER WIDGET (Thu nhỏ gap) */}
      <div className="flex-none grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
        <div className={`${cardClass} p-3.5 lg:p-4 flex items-center justify-between col-span-1 md:col-span-3`}>
          <div>
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">
              {isMounted && currentTime ? format(currentTime, 'HH:mm:ss') : '--:--:--'}
            </h1>
            <p className="text-sm opacity-70 mt-0.5 capitalize">
              {format(currentTime, 'eeee, dd MMMM yyyy', { locale: vi })}
            </p>
          </div>
          <div className="text-right flex items-center gap-3">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl border border-current/10 hover:bg-current/5 transition"
              title="Chuyển đổi giao diện"
            >
              {theme === 'dark' ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-indigo-600" />}
            </button>
            <div className="hidden sm:block text-left">
              <p className="text-lg font-medium">{temperature !== null ? `${temperature}°C` : '--°C'}</p>
              <p className="text-xs opacity-60">Lào Cai, VN</p>
            </div>
            <Cloud size={32} className="opacity-70" />
          </div>
        </div>
        
        <div className={`${cardClass} p-3.5 lg:p-4 flex flex-col justify-center bg-indigo-500/5 border-indigo-500/10 col-span-1`}>
          <div className="flex items-center gap-2 text-indigo-500 mb-1">
            <Activity size={16} />
            <p className="text-xs font-semibold uppercase tracking-wider">Nhắc nhở sức khỏe</p>
          </div>
          <p className="text-sm italic opacity-90 line-clamp-2 leading-snug">"Uống nước và đứng dậy vận động sau 45 phút!"</p>
        </div>
      </div>

      {/* MAIN CONTENT GRID (Thu nhỏ gap giữa các cột) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-3 lg:min-h-0 pb-3 lg:pb-0">
        
        {/* CỘT 1 */}
        <div className="flex flex-col gap-3 lg:min-h-0">
          <div className={`${cardClass} p-3.5 lg:p-4 flex-none`}>
            <div className="flex items-center justify-between mb-2.5 text-emerald-500">
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <h2 className="font-semibold text-sm tracking-wide">Lịch Tháng</h2>
              </div>
              {selectedDay && (
                <button onClick={() => setSelectedDay(null)} className="text-[11px] bg-emerald-500/10 px-2 py-1 rounded-lg text-emerald-600 hover:bg-emerald-500/20 transition">
                  Bỏ lọc
                </button>
              )}
            </div>
            {/* Lịch tháng thu hẹp gap và padding */}
            <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
              {['T2','T3','T4','T5','T6','T7','CN'].map(d => <div key={d} className="opacity-40 pb-1 font-medium">{d}</div>)}
              
              {/* Các ô trống đầu tháng để căn đúng thứ */}
              {Array.from({ length: startOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="py-1 px-1.5"></div>
              ))}

              {/* Render các ngày thực tế trong tháng */}
              {Array.from({length: daysInMonth}).map((_, i) => {
                const day = i + 1;
                const hasEvent = schedules.some(s => s.day_of_month === day);
                const isSelected = selectedDay === day;
                return (
                  <div 
                    key={day} 
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`py-1 px-1.5 rounded-lg cursor-pointer relative transition-all text-[13px] ${
                      isSelected ? 'bg-emerald-600 text-white font-semibold shadow-md' : 'hover:bg-current/5'
                    }`}
                  >
                    {day}
                    {hasEvent && !isSelected && (
                      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`${cardClass} p-3.5 lg:p-4 flex flex-col min-h-[260px] lg:min-h-0 lg:flex-1`}>
            <div className="flex items-center justify-between mb-2.5 text-amber-500 flex-none">
              <div className="flex items-center gap-2">
                <Dumbbell size={16} />
                <h2 className="font-semibold text-sm tracking-wide">Lifestyle & Thói quen</h2>
              </div>
              <button onClick={() => setIsLifeModalOpen(true)} className="p-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg transition">
                <Plus size={14} />
              </button>
            </div>
            {/* Thu hẹp space-y và padding */}
            <div className="space-y-1.5 flex-1">
              {currentLifestyles.length === 0 && <p className="text-xs text-center opacity-40 py-4">Chưa có thói quen nào.</p>}
              {currentLifestyles.map(life => (
                <div key={life.id} className="group flex items-center justify-between py-1.5 px-2.5 rounded-lg hover:bg-current/5 transition">
                  <div className="flex items-center gap-2.5 cursor-pointer flex-1" onClick={() => toggleLifestyle(life.id, life.is_completed)}>
                    <div className={`w-2 h-2 rounded-full flex-none ${life.is_completed ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <p className={`text-sm ${life.is_completed ? 'opacity-40 line-through' : ''}`}>{life.text}</p>
                  </div>
                  <button onClick={() => deleteLifestyle(life.id)} className="opacity-0 group-hover:opacity-100 text-red-400 transition p-1"><Trash2 size={14}/></button>
                </div>
              ))}
            </div>
            <Pagination page={lifePage} total={totalLifePages} setPage={setLifePage} />
          </div>
        </div>

        {/* CỘT 2: Lịch trình */}
        <div className="flex flex-col gap-3 lg:min-h-0">
          <div className={`${cardClass} p-3.5 lg:p-4 flex flex-col min-h-[320px] lg:min-h-0 lg:flex-1`}>
            <div className="flex items-center justify-between mb-2.5 text-purple-500 flex-none">
              <div className="flex items-center gap-2">
                <Book size={16} />
                <h2 className="font-semibold text-sm tracking-wide">{selectedDay ? `Lịch ngày ${selectedDay}` : 'Tất cả lịch trình'}</h2>
              </div>
              <button onClick={() => setIsSchedModalOpen(true)} className="p-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 rounded-lg transition">
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-2 flex-1">
              {currentSchedules.length === 0 && <p className="text-xs text-center opacity-40 py-6">Không có sự kiện nào.</p>}
              {currentSchedules.map(sched => (
                <div key={sched.id} className="group relative pl-3 border-l-2 border-purple-500/40 bg-current/5 py-2 px-3 rounded-r-xl hover:bg-current/10 transition">
                  <p className="text-[11px] opacity-60 font-mono mb-0.5">Ngày {sched.day_of_month} • {sched.time_range}</p>
                  <p className="text-sm font-medium">{sched.title}</p>
                  <button onClick={() => deleteSchedule(sched.id)} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-400 p-1 transition">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <Pagination page={schedPage} total={totalSchedPages} setPage={setSchedPage} />
          </div>
        </div>

        {/* CỘT 3: Công việc & Email */}
        <div className="flex flex-col gap-3 lg:min-h-0">
          
          <div className={`${cardClass} p-3.5 lg:p-4 flex flex-col min-h-[260px] lg:min-h-0 lg:flex-1`}>
            <div className="flex items-center justify-between mb-2.5 text-indigo-500 flex-none">
              <div className="flex items-center gap-2">
                <ListTodo size={16} />
                <h2 className="font-semibold text-sm tracking-wide">Công việc cần làm</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] bg-indigo-500/10 px-2 py-0.5 rounded font-medium">{tasks.length}</span>
                <button onClick={() => setIsTaskModalOpen(true)} className="p-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 rounded-lg transition">
                  <Plus size={14} />
                </button>
              </div>
            </div>
            <div className="space-y-1.5 flex-1">
              {currentTasks.length === 0 && <p className="text-xs text-center opacity-40 py-6">Chưa có công việc nào.</p>}
              {currentTasks.map(task => (
                <div key={task.id} className="group flex items-center justify-between bg-current/5 py-1.5 px-2.5 rounded-lg border border-current/5 hover:border-current/15 transition">
                  <div className="flex items-center gap-2.5 flex-1 cursor-pointer" onClick={() => toggleTask(task.id, task.is_completed)}>
                    {task.is_completed ? <CircleCheck className="text-emerald-500 flex-none" size={16} /> : <Circle className="opacity-40 flex-none" size={16} />}
                    <span className={`text-sm ${task.is_completed ? 'line-through opacity-40' : ''}`}>{task.text}</span>
                  </div>
                  <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition p-1"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            <Pagination page={taskPage} total={totalTaskPages} setPage={setTaskPage} />
          </div>

          <div className={`${cardClass} p-3.5 lg:p-4 flex flex-col min-h-[290px] lg:min-h-0 lg:flex-1`}>
            <div className="flex items-center justify-between mb-2.5 text-blue-500 flex-none">
              <div className="flex items-center gap-2">
                <Mail size={16} />
                <h2 className="font-semibold text-sm tracking-wide">Emails Quan trọng</h2>
              </div>
              <span className="text-[11px] opacity-60">{emails.length} thư</span>
            </div>
            <div className="space-y-1.5 flex-1 overflow-y-auto min-h-0 pr-1">
              {currentEmails.length === 0 && <p className="text-xs text-center opacity-40 py-6">Không có email mới.</p>}
              {currentEmails.map(email => {
                const isHust = email.sender?.includes('hust.edu.vn');
                return (
                  <div 
                    key={email.id} 
                    onClick={() => setSelectedEmail(email)}
                    className={`py-2 px-3 rounded-lg border-l-4 transition cursor-pointer 
                      ${isHust ? 'bg-red-500/5 border-red-500 hover:bg-red-500/10' : 'bg-current/5 border-blue-500 hover:bg-current/10'}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${isHust ? 'text-red-500 bg-red-500/10' : 'text-blue-500'}`}>
                        {isHust ? 'HUST' : email.type}
                      </span>
                      <span className="text-[11px] opacity-50">{email.time}</span>
                    </div>
                    <h3 className="text-sm font-semibold truncate leading-tight">{email.sender}</h3>
                    <p className="text-[13px] opacity-70 truncate mt-0.5">{email.subject}</p>
                  </div>
                );
              })}
            </div>
            <Pagination page={emailPage} total={totalEmailPages} setPage={setEmailPage} />
          </div>

        </div>
      </div>

      {/* CÁC MODALS GIỮ NGUYÊN (Chỉ cập nhật padding & text-size để đồng bộ) */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`${cardClass} w-full max-w-lg p-5 lg:p-6 relative`}>
            <button onClick={() => setSelectedEmail(null)} className="absolute top-4 right-4 p-1.5 opacity-50 hover:opacity-100"><X size={18}/></button>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded 
                ${selectedEmail.sender?.includes('hust.edu.vn') ? 'text-red-500 bg-red-500/10' : 'text-blue-500 bg-blue-500/10'}`}>
                {selectedEmail.sender?.includes('hust.edu.vn') ? 'HUST' : selectedEmail.type}
              </span>
              <span className="text-xs opacity-60">{selectedEmail.time}</span>
            </div>
            <h3 className="text-base font-semibold mb-1.5">{selectedEmail.subject}</h3>
            <p className="text-sm opacity-70 mb-4 border-b border-current/10 pb-2">Từ: {selectedEmail.sender}</p>
            <div className="bg-current/5 p-3 rounded-lg text-sm opacity-90 max-h-[40vh] overflow-y-auto mb-4 whitespace-pre-wrap leading-relaxed">
              {selectedEmail.snippet || "Không có nội dung hiển thị trước."}
            </div>
            <div className="flex justify-end">
              <button onClick={() => setSelectedEmail(null)} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: THÊM CÔNG VIỆC */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`${cardClass} w-full max-w-md p-5 relative`}>
            <button onClick={() => setIsTaskModalOpen(false)} className="absolute top-4 right-4 p-1.5 opacity-50 hover:opacity-100"><X size={18}/></button>
            <h3 className="text-base font-medium mb-4 text-indigo-500">Thêm công việc mới</h3>
            <form onSubmit={addTask} className="space-y-3">
              <input value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Nhập nội dung công việc..." className="w-full bg-current/5 border border-current/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500" autoFocus />
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-3 py-1.5 text-sm font-medium rounded-lg opacity-70 hover:opacity-100">Hủy</button>
                <button type="submit" className="px-4 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition">Thêm</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: THÊM LỊCH TRÌNH */}
      {isSchedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`${cardClass} w-full max-w-md p-5 relative`}>
            <button onClick={() => setIsSchedModalOpen(false)} className="absolute top-4 right-4 p-1.5 opacity-50 hover:opacity-100"><X size={18}/></button>
            <h3 className="text-base font-medium mb-4 text-purple-500">Thêm lịch học / sự kiện</h3>
            <form onSubmit={addSchedule} className="space-y-3">
              <input value={newSchedTitle} onChange={e => setNewSchedTitle(e.target.value)} placeholder="Tên môn học / sự kiện" className="w-full bg-current/5 border border-current/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500" autoFocus />
              <div className="flex gap-2">
                <input type="number" min="1" max="31" value={newSchedDay} onChange={e => setNewSchedDay(e.target.value)} placeholder="Ngày (1-31)" className="w-1/3 bg-current/5 border border-current/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
                <input value={newSchedTime} onChange={e => setNewSchedTime(e.target.value)} placeholder="Thời gian (VD: 08:00 - 10:00)" className="w-2/3 bg-current/5 border border-current/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setIsSchedModalOpen(false)} className="px-3 py-1.5 text-sm font-medium rounded-lg opacity-70 hover:opacity-100">Hủy</button>
                <button type="submit" className="px-4 py-1.5 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition">Thêm lịch</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: THÊM LIFESTYLE */}
      {isLifeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`${cardClass} w-full max-w-md p-5 relative`}>
            <button onClick={() => setIsLifeModalOpen(false)} className="absolute top-4 right-4 p-1.5 opacity-50 hover:opacity-100"><X size={18}/></button>
            <h3 className="text-base font-medium mb-4 text-amber-500">Thêm thói quen mục tiêu</h3>
            <form onSubmit={addLifestyle} className="space-y-3">
              <input value={newLifestyle} onChange={e => setNewLifestyle(e.target.value)} placeholder="VD: Uống đủ 2L nước..." className="w-full bg-current/5 border border-current/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500" autoFocus />
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setIsLifeModalOpen(false)} className="px-3 py-1.5 text-sm font-medium rounded-lg opacity-70 hover:opacity-100">Hủy</button>
                <button type="submit" className="px-4 py-1.5 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition">Thêm</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}