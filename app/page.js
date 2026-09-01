"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; 
import { 
  Cloud, Mail, MessageCircle, ListTodo, Calendar, 
  Dumbbell, Book, Plus, Trash2, CircleCheck, Circle, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [emails, setEmails] = useState([]);

  // 1. Chạy đồng hồ
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Lấy dữ liệu
  useEffect(() => {
    fetchTasks();
    fetch('/api/emails').then(res => res.json()).then(data => setEmails(data));
  }, []);

  async function fetchTasks() {
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    if (data) setTasks(data);
  }

  async function addTask() {
    if (!newTask) return;
    const { data, error } = await supabase.from('tasks').insert([{ text: newTask }]).select();
    if (!error) {
      setTasks([data[0], ...tasks]);
      setNewTask("");
    }
  }

  async function toggleTask(id, currentStatus) {
    await supabase.from('tasks').update({ is_completed: !currentStatus }).eq('id', id);
    setTasks(tasks.map(t => t.id === id ? { ...t, is_completed: !currentStatus } : t));
  }

  async function deleteTask(id) {
    await supabase.from('tasks').delete().eq('id', id);
    setTasks(tasks.filter(t => t.id !== id));
  }

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-slate-950 text-slate-200 p-4 lg:p-6 overflow-y-auto lg:overflow-hidden">
      
      {/* HEADER WIDGET */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-6 flex items-center justify-between col-span-1 md:col-span-2">
          <div>
            <h1 className="text-5xl font-light tracking-tighter">
              {format(currentTime, 'HH:mm:ss')}
            </h1>
            <p className="text-slate-400 mt-1 capitalize">
              {format(currentTime, 'eeee, dd MMMM yyyy', { locale: vi })}
            </p>
          </div>
          <div className="text-right flex items-center gap-4">
            <div className="hidden sm:block">
              <p className="text-xl font-medium text-amber-400">28°C</p>
              <p className="text-xs text-slate-500">Lào Cai, VN</p>
            </div>
            <Cloud size={48} className="text-slate-400" />
          </div>
        </div>
        
        <div className="glass-card p-6 flex flex-col justify-center bg-indigo-500/10 border-indigo-500/20">
          <p className="text-indigo-400 text-sm font-bold uppercase tracking-widest">Lời nhắc</p>
          <p className="text-lg mt-1 italic">"Uống nước và đứng dậy vận động sau mỗi 45 phút học tập!"</p>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        
        {/* COL 1: CALENDAR & LIFESTYLE */}
        <div className="lg:col-span-1 space-y-6 flex flex-col">
          <div className="glass-card p-4 flex-1">
            <div className="flex items-center gap-2 mb-4 text-emerald-400">
              <Calendar size={20} />
              <h2 className="font-semibold">Lịch Tháng</h2>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-xs">
              {['T2','T3','T4','T5','T6','T7','CN'].map(d => <div key={d} className="opacity-40">{d}</div>)}
              {Array.from({length: 31}).map((_, i) => (
                <div key={i} className={`p-2 rounded-lg cursor-default relative ${i+1 === 15 ? 'bg-indigo-600 text-white' : 'hover:bg-white/5'}`}>
                  {i + 1}
                  {(i === 14 || i === 20) && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-amber-500 rounded-full"></div>}
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-4 bg-amber-500/5 border-amber-500/10">
            <div className="flex items-center gap-2 mb-3 text-amber-500">
              <Dumbbell size={20} />
              <h2 className="font-semibold">Lifestyle</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <p>Học 10 từ vựng tiếng Anh mới</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-slate-600" />
                <p>Tập Squat 20 cái</p>
              </div>
            </div>
          </div>
        </div>

        {/* COL 2: TODO LIST (SYNCED) */}
        <div className="lg:col-span-1 glass-card p-4 flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between mb-4 text-indigo-400">
            <div className="flex items-center gap-2">
              <ListTodo size={20} />
              <h2 className="font-semibold">Công việc cần làm</h2>
            </div>
            <span className="text-[10px] bg-indigo-500/20 px-2 py-0.5 rounded-full">{tasks.length} tasks</span>
          </div>
          
          <div className="flex gap-2 mb-4">
            <input 
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Việc gì mới?"
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-indigo-500"
            />
            <button onClick={addTask} className="bg-indigo-600 p-2 rounded-lg hover:bg-indigo-500 transition">
              <Plus size={20} />
            </button>
          </div>

          <div className="space-y-2 overflow-y-auto no-scrollbar flex-1">
            {tasks.map(task => (
              <div key={task.id} className="group flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 hover:border-white/20 transition">
                <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleTask(task.id, task.is_completed)}>
                  {task.is_completed ? <CircleCheck className="text-emerald-500" size={18} /> : <Circle className="text-slate-500" size={18} />}
                  <span className={`text-sm ${task.is_completed ? 'line-through opacity-40' : ''}`}>{task.text}</span>
                </div>
                <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-red-400 transition">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* COL 3: EMAILS & MESSAGES */}
        <div className="lg:col-span-1 space-y-6 flex flex-col">
          <div className="glass-card p-4 flex-1">
            <div className="flex items-center gap-2 mb-4 text-blue-400">
              <Mail size={20} />
              <h2 className="font-semibold">Emails Quan trọng</h2>
            </div>
            <div className="space-y-3 overflow-y-auto no-scrollbar">
              {emails.map(email => (
                <div key={email.id} className="p-3 bg-white/5 rounded-xl border-l-2 border-blue-500">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-[10px] font-bold uppercase ${email.type === 'gmail' ? 'text-red-400' : 'text-blue-400'}`}>
                      {email.type}
                    </span>
                    <span className="text-[10px] opacity-40">{email.time}</span>
                  </div>
                  <h3 className="text-sm font-semibold truncate">{email.sender}</h3>
                  <p className="text-xs opacity-60 truncate">{email.subject}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-4 h-40">
            {/* Đổi thành MessageCircle ở phần UI */}
            <div className="flex items-center gap-2 mb-3 text-blue-600">
              <MessageCircle size={20} />
              <h2 className="font-semibold text-white/90">Tin nhắn FB</h2>
            </div>
            <div className="flex items-center gap-3 bg-white/5 p-2 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">HUST Confessions</p>
                <p className="text-[11px] opacity-60 truncate">Bạn có 2 thông báo mới từ nhóm...</p>
              </div>
            </div>
          </div>
        </div>

        {/* COL 4: COURSE SCHEDULE */}
        <div className="lg:col-span-1 glass-card p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-4 text-purple-400">
            <Book size={20} />
            <h2 className="font-semibold">Lịch học & Giảng dạy</h2>
          </div>
          <div className="space-y-4">
            <div className="relative pl-4 border-l-2 border-purple-500/30">
              <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-purple-500" />
              <p className="text-xs text-purple-400 font-mono">08:00 - 11:30</p>
              <p className="text-sm font-medium">Học DSAI - Viettel Track</p>
              <p className="text-[10px] opacity-40">Lab 402 - C7 HUST</p>
            </div>
            <div className="relative pl-4 border-l-2 border-slate-700">
              <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-slate-600" />
              <p className="text-xs opacity-40 font-mono">14:00 - 16:00</p>
              <p className="text-sm font-medium">Dạy kèm Toán Lớp 9</p>
              <p className="text-[10px] opacity-40">Online via Zoom</p>
            </div>
          </div>
          
          <button className="mt-auto flex items-center justify-center gap-2 w-full py-3 bg-white/5 rounded-xl text-xs hover:bg-white/10 transition">
            Xem toàn bộ lịch trình <ChevronRight size={14} />
          </button>
        </div>

      </div>

      {/* FOOTER */}
      <footer className="mt-6 text-center text-[10px] opacity-20 uppercase tracking-[0.2em]">
        Brave Personalized Dashboard • Designed for nam.tc
      </footer>
    </div>
  );
}