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

export default function Dashboard() {
  const [theme, setTheme] = useState('dark');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null); 
  const [temperature, setTemperature] = useState(null);
  
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const [schedules, setSchedules] = useState([]);
  const [newSchedTitle, setNewSchedTitle] = useState("");
  const [newSchedTime, setNewSchedTime] = useState("");
  const [newSchedDay, setNewSchedDay] = useState("");
  const [isSchedModalOpen, setIsSchedModalOpen] = useState(false);

  const [lifestyles, setLifestyles] = useState([]);
  const [newLifestyle, setNewLifestyle] = useState("");
  const [isLifeModalOpen, setIsLifeModalOpen] = useState(false);

  const [emails, setEmails] = useState([]);
  const [emailPage, setEmailPage] = useState(1);
  const emailsPerPage = 3;
  const [selectedEmail, setSelectedEmail] = useState(null);

  // Detect browser theme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setTheme(mediaQuery.matches ? 'dark' : 'light');
    
    const handler = (e) => setTheme(e.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Realtime Clock
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Weather API (Open-Meteo for Lào Cai)
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

  // Fetch initial data
  useEffect(() => {
    fetchTasks();
    fetchSchedules();
    fetchLifestyles();
    fetch('/api/emails')
      .then(res => res.json())
      .then(data => { if (data.emails) setEmails(data.emails); })
      .catch(err => console.error("Failed to load emails:", err));
  }, []);

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

  const displayedSchedules = selectedDay 
    ? schedules.filter(s => s.day_of_month === selectedDay) 
    : schedules;

  // Email Pagination calculation
  const indexOfLastEmail = emailPage * emailsPerPage;
  const indexOfFirstEmail = indexOfLastEmail - emailsPerPage;
  const currentEmails = emails.slice(indexOfFirstEmail, indexOfLastEmail);
  const totalEmailPages = Math.ceil(emails.length / emailsPerPage) || 1;

  const cardClass = theme === 'dark' 
    ? "bg-slate-900/80 border border-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm" 
    : "bg-white/90 border border-slate-200/80 backdrop-blur-md rounded-2xl shadow-sm";

  return (
    <div className={`h-screen flex flex-col ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'} p-3 lg:p-4 overflow-hidden transition-colors`}>
      
      {/* HEADER WIDGET & LỜI NHẮC SỨC KHỎE (ĐÃ TÁCH GỌN) */}
      <div className="flex-none grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
        <div className={`${cardClass} p-3.5 px-4 flex items-center justify-between col-span-1 md:col-span-3`}>
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">
              {currentTime ? format(currentTime, 'HH:mm:ss') : '--:--:--'}
            </h1>
            <p className="text-xs opacity-60 mt-0.5 capitalize">
              {format(currentTime, 'eeee, dd MMMM yyyy', { locale: vi })}
            </p>
          </div>
          <div className="text-right flex items-center gap-3">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl border border-current/10 hover:bg-current/5 transition"
              title="Chuyển đổi giao diện"
            >
              {theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-indigo-600" />}
            </button>
            <div className="hidden sm:block text-left">
              <p className="text-base font-medium">{temperature !== null ? `${temperature}°C` : '--°C'}</p>
              <p className="text-[11px] opacity-50">Lào Cai, VN</p>
            </div>
            <Cloud size={32} className="opacity-70" />
          </div>
        </div>
        
        <div className={`${cardClass} p-3 px-3.5 flex flex-col justify-center bg-indigo-500/5 border-indigo-500/10 col-span-1`}>
          <div className="flex items-center gap-1.5 text-indigo-500 mb-0.5">
            <Activity size={14} />
            <p className="text-[11px] font-semibold uppercase tracking-wider">Nhắc nhở sức khỏe</p>
          </div>
          <p className="text-xs italic opacity-90 truncate">"Uống nước và đứng dậy vận động sau 45 phút!"</p>
        </div>
      </div>

      {/* MAIN CONTENT GRID - Locked to screen height to prevent bottom clipping */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-3 min-h-0 overflow-hidden">
        
        {/* CỘT 1: Lịch tháng & Lifestyle */}
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto pr-1">
          <div className={`${cardClass} p-4 flex-none`}>
            <div className="flex items-center justify-between mb-3 text-emerald-500">
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <h2 className="font-medium text-xs tracking-wide">Lịch Tháng</h2>
              </div>
              {selectedDay && (
                <button onClick={() => setSelectedDay(null)} className="text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-lg text-emerald-600 hover:bg-emerald-500/20 transition">
                  Bỏ lọc ngày {selectedDay}
                </button>
              )}
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center text-[11px]">
              {['T2','T3','T4','T5','T6','T7','CN'].map(d => <div key={d} className="opacity-40 pb-1 font-medium">{d}</div>)}
              {Array.from({length: 31}).map((_, i) => {
                const day = i + 1;
                const hasEvent = schedules.some(s => s.day_of_month === day);
                const isSelected = selectedDay === day;
                return (
                  <div 
                    key={day} 
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`p-1.5 rounded-lg cursor-pointer relative transition-all text-xs ${
                      isSelected ? 'bg-emerald-600 text-white font-semibold shadow-sm' : 'hover:bg-current/5'
                    }`}
                  >
                    {day}
                    {hasEvent && !isSelected && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-amber-500 rounded-full"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`${cardClass} p-4 flex-none flex flex-col`}>
            <div className="flex items-center justify-between mb-2 text-amber-500 flex-none">
              <div className="flex items-center gap-2">
                <Dumbbell size={16} />
                <h2 className="font-medium text-xs tracking-wide">Lifestyle & Thói quen</h2>
              </div>
              <button onClick={() => setIsLifeModalOpen(true)} className="p-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg transition">
                <Plus size={14} />
              </button>
            </div>

            <div className="space-y-1.5 overflow-y-auto pr-1 max-h-[160px]">
              {lifestyles.length === 0 && <p className="text-[11px] text-center opacity-40 py-2">Chưa có thói quen nào.</p>}
              {lifestyles.map(life => (
                <div key={life.id} className="group flex items-center justify-between p-1.5 rounded-lg hover:bg-current/5 transition">
                  <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => toggleLifestyle(life.id, life.is_completed)}>
                    <div className={`w-1.5 h-1.5 rounded-full flex-none ${life.is_completed ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <p className={`text-xs ${life.is_completed ? 'opacity-40 line-through' : ''}`}>{life.text}</p>
                  </div>
                  <button onClick={() => deleteLifestyle(life.id)} className="opacity-0 group-hover:opacity-100 text-red-400 transition"><Trash2 size={13}/></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CỘT 2: Tất cả lịch trình */}
        <div className="flex flex-col gap-3 min-h-0 overflow-hidden">
          <div className={`${cardClass} p-4 flex-1 flex flex-col min-h-0`}>
            <div className="flex items-center justify-between mb-3 text-purple-500 flex-none">
              <div className="flex items-center gap-2">
                <Book size={16} />
                <h2 className="font-medium text-xs tracking-wide">{selectedDay ? `Lịch ngày ${selectedDay}` : 'Tất cả lịch trình'}</h2>
              </div>
              <button onClick={() => setIsSchedModalOpen(true)} className="p-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 rounded-lg transition">
                <Plus size={14} />
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto pr-1 flex-1">
              {displayedSchedules.length === 0 && <p className="text-[11px] text-center opacity-40 py-4">Không có sự kiện nào.</p>}
              {displayedSchedules.map(sched => (
                <div key={sched.id} className="group relative pl-3 border-l-2 border-purple-500/40 bg-current/5 p-2.5 rounded-r-xl">
                  <p className="text-[10px] opacity-50 font-mono mb-0.5">Ngày {sched.day_of_month} • {sched.time_range}</p>
                  <p className="text-xs font-medium">{sched.title}</p>
                  <button onClick={() => deleteSchedule(sched.id)} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-400 transition">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CỘT 3: Công việc cần làm & Emails có phân trang (Được cấp đủ không gian không bị cắt trang) */}
        <div className="flex flex-col gap-3 min-h-0 overflow-hidden">
          
          {/* Công việc cần làm */}
          <div className={`${cardClass} p-4 flex-1 flex flex-col min-h-0`}>
            <div className="flex items-center justify-between mb-3 text-indigo-500 flex-none">
              <div className="flex items-center gap-2">
                <ListTodo size={16} />
                <h2 className="font-medium text-xs tracking-wide">Công việc cần làm</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-indigo-500/10 px-1.5 py-0.5 rounded font-medium">{tasks.length}</span>
                <button onClick={() => setIsTaskModalOpen(true)} className="p-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 rounded-lg transition">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-2 overflow-y-auto pr-1 flex-1">
              {tasks.length === 0 && <p className="text-[11px] text-center opacity-40 py-4">Chưa có công việc nào.</p>}
              {tasks.map(task => (
                <div key={task.id} className="group flex items-center justify-between bg-current/5 p-2 rounded-xl border border-current/5 hover:border-current/15 transition">
                  <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => toggleTask(task.id, task.is_completed)}>
                    {task.is_completed ? <CircleCheck className="text-emerald-500 flex-none" size={14} /> : <Circle className="opacity-40 flex-none" size={14} />}
                    <span className={`text-xs ${task.is_completed ? 'line-through opacity-40' : ''}`}>{task.text}</span>
                  </div>
                  <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Emails phân trang (Cố định khung không bị mất phân trang ở dưới) */}
          <div className={`${cardClass} p-4 flex-1 flex flex-col min-h-0`}>
            <div className="flex items-center justify-between mb-2 text-blue-500 flex-none">
              <div className="flex items-center gap-2">
                <Mail size={16} />
                <h2 className="font-medium text-xs tracking-wide">Emails Quan trọng</h2>
              </div>
              <span className="text-[10px] opacity-50">{emails.length} thư</span>
            </div>

            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              <div className="space-y-2 overflow-y-auto pr-1">
                {currentEmails.length === 0 && <p className="text-[11px] text-center opacity-40 py-4">Không có email mới.</p>}
                {currentEmails.map(email => (
                  <div 
                    key={email.id} 
                    onClick={() => setSelectedEmail(email)}
                    className="p-2 bg-current/5 rounded-xl border-l-2 border-blue-500 hover:bg-current/10 transition cursor-pointer"
                  >
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-blue-500">{email.type}</span>
                      <span className="text-[9px] opacity-40">{email.time}</span>
                    </div>
                    <h3 className="text-xs font-semibold truncate">{email.sender}</h3>
                    <p className="text-[11px] opacity-70 truncate">{email.subject}</p>
                  </div>
                ))}
              </div>

              {/* Pagination controls for emails */}
              {totalEmailPages > 1 && (
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-current/10 text-xs flex-none">
                  <button 
                    onClick={() => setEmailPage(p => Math.max(p - 1, 1))}
                    disabled={emailPage === 1}
                    className="p-1 rounded hover:bg-current/10 disabled:opacity-30 transition"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-[11px] opacity-60">Trang {emailPage} / {totalEmailPages}</span>
                  <button 
                    onClick={() => setEmailPage(p => Math.min(p + 1, totalEmailPages))}
                    disabled={emailPage === totalEmailPages}
                    className="p-1 rounded hover:bg-current/10 disabled:opacity-30 transition"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* MODAL: XEM CHI TIẾT EMAIL */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`${cardClass} w-full max-w-lg p-6 relative`}>
            <button onClick={() => setSelectedEmail(null)} className="absolute top-4 right-4 opacity-50 hover:opacity-100"><X size={18}/></button>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded">
                {selectedEmail.type}
              </span>
              <span className="text-xs opacity-50">{selectedEmail.time}</span>
            </div>
            <h3 className="text-sm font-semibold mb-1">{selectedEmail.subject}</h3>
            <p className="text-xs opacity-60 mb-4 border-b border-current/10 pb-2">Từ: {selectedEmail.sender}</p>
            <div className="bg-current/5 p-4 rounded-xl text-xs opacity-90 max-h-[300px] overflow-y-auto mb-4 whitespace-pre-wrap">
              {selectedEmail.snippet || "Không có nội dung hiển thị trước."}
            </div>
            <div className="flex justify-end">
              <button onClick={() => setSelectedEmail(null)} className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: THÊM CÔNG VIỆC */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`${cardClass} w-full max-w-md p-6 relative`}>
            <button onClick={() => setIsTaskModalOpen(false)} className="absolute top-4 right-4 opacity-50 hover:opacity-100"><X size={18}/></button>
            <h3 className="text-base font-medium mb-4 text-indigo-500">Thêm công việc mới</h3>
            <form onSubmit={addTask} className="space-y-3">
              <input value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Nhập nội dung công việc..." className="w-full bg-current/5 border border-current/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500" autoFocus />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-3 py-1.5 text-xs rounded-xl opacity-60 hover:opacity-100">Hủy</button>
                <button type="submit" className="px-4 py-1.5 text-xs bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition">Thêm</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: THÊM LỊCH TRÌNH */}
      {isSchedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`${cardClass} w-full max-w-md p-6 relative`}>
            <button onClick={() => setIsSchedModalOpen(false)} className="absolute top-4 right-4 opacity-50 hover:opacity-100"><X size={18}/></button>
            <h3 className="text-base font-medium mb-4 text-purple-500">Thêm lịch học / sự kiện</h3>
            <form onSubmit={addSchedule} className="space-y-3">
              <input value={newSchedTitle} onChange={e => setNewSchedTitle(e.target.value)} placeholder="Tên môn học / sự kiện" className="w-full bg-current/5 border border-current/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500" autoFocus />
              <div className="flex gap-2">
                <input type="number" min="1" max="31" value={newSchedDay} onChange={e => setNewSchedDay(e.target.value)} placeholder="Ngày (1-31)" className="w-1/3 bg-current/5 border border-current/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500" />
                <input value={newSchedTime} onChange={e => setNewSchedTime(e.target.value)} placeholder="Thời gian (VD: 08:00 - 10:00)" className="w-2/3 bg-current/5 border border-current/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsSchedModalOpen(false)} className="px-3 py-1.5 text-xs rounded-xl opacity-60 hover:opacity-100">Hủy</button>
                <button type="submit" className="px-4 py-1.5 text-xs bg-purple-600 text-white rounded-xl hover:bg-purple-500 transition">Thêm lịch</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: THÊM LIFESTYLE */}
      {isLifeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`${cardClass} w-full max-w-md p-6 relative`}>
            <button onClick={() => setIsLifeModalOpen(false)} className="absolute top-4 right-4 opacity-50 hover:opacity-100"><X size={18}/></button>
            <h3 className="text-base font-medium mb-4 text-amber-500">Thêm thói quen mục tiêu</h3>
            <form onSubmit={addLifestyle} className="space-y-3">
              <input value={newLifestyle} onChange={e => setNewLifestyle(e.target.value)} placeholder="VD: Uống đủ 2L nước..." className="w-full bg-current/5 border border-current/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500" autoFocus />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsLifeModalOpen(false)} className="px-3 py-1.5 text-xs rounded-xl opacity-60 hover:opacity-100">Hủy</button>
                <button type="submit" className="px-4 py-1.5 text-xs bg-amber-600 text-white rounded-xl hover:bg-amber-500 transition">Thêm</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}