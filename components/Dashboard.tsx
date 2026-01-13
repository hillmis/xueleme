
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ViewType, AppState, Task, CheckinRecord, SupervisorReminderItem } from '../types';
import { 
  ArrowLeft, Plus, Trash2, CheckCircle, 
  Settings, BarChart3, ListTodo, Download, 
  Upload, Trash, Sparkles, Copy, Share2, Sun, Moon,
  ShieldCheck, UserCheck, MessageSquare, Hand,
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Volume2, VolumeX, Image as ImageIcon, X,
  TrendingUp, RefreshCw, Layers, Droplets, Ghost, Wand2, Mail, UserPlus, Bell, Send
} from 'lucide-react';
import { generateAIReport } from '../services/gemini';
import { createTypingSoundHandler } from '../services/audio';
import { getPendingSupervisorReminders } from '../services/reminders';
import * as echarts from 'echarts';

interface DashboardProps {
  state: AppState;
  setView: (view: ViewType) => void;
  updateProfile: (updates: Partial<AppState['profile']>) => void;
  updateRuntime: (updates: Partial<AppState['runtime']>) => void;
  addTask: (title: string, dueDate: string | null, desc: string) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  onReset: () => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showToast: (title: string, desc?: string) => void;
}

// 内部组件：美化的设置滑动条
const SettingSlider = ({ 
  label, icon: Icon, value, min, max, step, suffix, onChange 
}: { 
  label: string, icon: any, value: number, min: number, max: number, step: number, suffix: string, onChange: (v: number) => void 
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full">
        {value}{suffix}
      </span>
    </div>
    <div className="relative flex items-center group">
      <input 
        type="range" 
        min={min} 
        max={max} 
        step={step} 
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500 group-hover:bg-black/10 dark:group-hover:bg-white/20 transition-all"
      />
    </div>
  </div>
);

// 内部组件：背景风格预设
const StylePresets = ({ onSelect }: { onSelect: (blur: number, opacity: number) => void }) => (
  <div className="flex gap-2">
    {[
      { name: 'ԭͼ', blur: 0, opacity: 0.8, icon: ImageIcon },
      { name: 'ĥɰ', blur: 4, opacity: 0.5, icon: Wand2 },
      { name: '极简', blur: 16, opacity: 0.2, icon: Ghost },
    ].map(p => (
      <button 
        key={p.name}
        onClick={() => onSelect(p.blur, p.opacity)}
        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all text-[10px] font-bold"
      >
        <p.icon className="w-3 h-3" />
        {p.name}
      </button>
    ))}
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({
  state, setView, updateProfile, updateRuntime, addTask, toggleTask, deleteTask, 
  onReset, onExport, onImport, showToast
}) => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'calendar' | 'stats' | 'settings'>('tasks');
  const [taskTitle, setTaskTitle] = useState('');
  const [aiReport, setAiReport] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [reminderNow, setReminderNow] = useState(new Date());
  
  const chartRef = useRef<HTMLDivElement>(null);
  const typingSoundRef = useRef(createTypingSoundHandler({ volume: 0.12 }));

  const handleTypingSound = (event: React.KeyboardEvent<HTMLInputElement>) => {
    typingSoundRef.current(event, state.profile.isSoundEnabled);
  };

  const handleAddTask = () => {
    if (!taskTitle.trim()) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    addTask(taskTitle, tomorrowStr, '');
    setTaskTitle('');
    showToast(`\u660e\u65e5\u8ba1\u5212\u5df2\u6dfb\u52a0\uff1a${taskTitle}`);
  };

  const handleGenerateReport = async () => {
    setLoadingAI(true);
    const report = await generateAIReport(state);
    setAiReport(report);
    setLoadingAI(false);
  };

  const copyReport = () => {
    navigator.clipboard.writeText(aiReport);
    showToast(`\u5df2\u590d\u5236\u5230\u526a\u8d34\u677f`);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'lock' | 'dashboard') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast(`\u56fe\u7247\u592a\u5927`, `\u8bf7\u9009\u62e9 2MB \u4ee5\u5185\u7684\u56fe\u7247`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (type === 'lock') updateProfile({ lockBackground: base64 });
      else updateProfile({ dashboardBackground: base64 });
      showToast(`\u80cc\u666f\u5df2\u66f4\u65b0`);
    };
    reader.readAsDataURL(file);
  };

  const fetchRandomBg = async (type: 'lock' | 'dashboard') => {
    const randomUrl = `https://picsum.photos/1600/900?random=${Date.now() + (type === 'lock' ? 1 : 2)}`;
    if (type === 'lock') updateProfile({ lockBackground: randomUrl });
    else updateProfile({ dashboardBackground: randomUrl });
    showToast(`\u968f\u673a\u80cc\u666f\u5df2\u5c31\u7eea`);
  };

  useEffect(() => {
    const timer = setInterval(() => setReminderNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeTab === 'calendar' && chartRef.current) {
      const chartInstance = echarts.init(chartRef.current);
      const dates = [];
      const values = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const label = `${d.getMonth() + 1}/${d.getDate()}`;
        dates.push(label);
        values.push(state.checkins[key]?.minutes || 0);
      }

      const option = {
        grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
        xAxis: {
          type: 'category',
          data: dates,
          axisLine: { lineStyle: { color: '#888' } },
          axisTick: { show: false },
          axisLabel: { color: '#666', fontSize: 10, fontWeight: 'bold' }
        },
        yAxis: {
          type: 'value',
          splitLine: { lineStyle: { type: 'dashed', color: 'rgba(0,0,0,0.05)' } },
          axisLabel: { color: '#666', fontSize: 10 }
        },
        tooltip: {
          trigger: 'axis',
          formatter: '{b}: {c} 分钟',
          backgroundColor: 'rgba(0,0,0,0.8)',
          textStyle: { color: '#fff' }
        },
        series: [{
          data: values,
          type: 'bar',
          barWidth: '40%',
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#6366f1' },
              { offset: 1, color: '#4f46e5' }
            ])
          },
          showBackground: true,
          backgroundStyle: { color: 'rgba(180, 180, 180, 0.05)', borderRadius: 4 }
        }]
      };
      chartInstance.setOption(option);
      const handleResize = () => chartInstance.resize();
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        chartInstance.dispose();
      };
    }
  }, [activeTab, state.checkins]);

  const tasks: Task[] = (Object.values(state.tasks) as Task[]).sort((a: Task, b: Task) => {
    if (a.status !== b.status) return a.status === 'todo' ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const totalMinutes = useMemo(() => {
    const checkinValues = Object.values(state.checkins) as CheckinRecord[];
    return checkinValues.reduce((acc, curr) => acc + (curr.minutes || 0), 0);
  }, [state.checkins]);

  const totalTimeDisplay = totalMinutes >= 60 
    ? (totalMinutes / 60).toFixed(1) + 'h' 
    : totalMinutes + 'm';

  const daysInMonth = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    return { firstDay, days };
  }, [calendarDate]);

  const monthLabel = calendarDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
  const inputClass = "w-full bg-black/5 dark:bg-black/20 border border-black/5 dark:border-white/10 rounded-xl px-4 py-2 outline-none focus:border-indigo-500/50 text-gray-900 dark:text-gray-100 transition-all";
  const reminderSettings = state.profile.supervisorReminderSettings;
  const weekDayOptions = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const reminderTypeLabel: Record<string, string> = {
    daily_cutoff: '每日截止',
    missed_days: '缺卡提醒',
    overdue_tasks: '任务逾期',
    weekly_report: '周报'
  };
  const pendingReminders = useMemo(() => getPendingSupervisorReminders(state, reminderNow), [state, reminderNow]);

  const addSupervisor = () => {
    const next = [
      ...(state.profile.supervisors || []),
      {
        id: `sup_${Date.now()}`,
        name: '',
        email: '',
        relation: '',
        enabled: true
      }
    ];
    updateProfile({ supervisors: next });
  };

  const updateSupervisor = (id: string, updates: Partial<AppState['profile']['supervisors'][number]>) => {
    const next = (state.profile.supervisors || []).map(s => s.id === id ? { ...s, ...updates } : s);
    updateProfile({ supervisors: next });
  };

  const removeSupervisor = (id: string) => {
    const next = (state.profile.supervisors || []).filter(s => s.id !== id);
    updateProfile({ supervisors: next });
  };

  const updateReminderSettings = (updates: Partial<AppState['profile']['supervisorReminderSettings']>) => {
    updateProfile({
      supervisorReminderSettings: {
        ...state.profile.supervisorReminderSettings,
        ...updates
      }
    });
  };

  const markReminderSent = (reminder: SupervisorReminderItem) => {
    const nextLog = { ...(state.runtime.supervisorReminderLog || {}) };
    const entry = { ...(nextLog[reminder.supervisorId] || {}) };
    if (reminder.type === 'daily_cutoff') entry.lastDailyCutoff = reminder.scheduledFor;
    if (reminder.type === 'missed_days') entry.lastMissedDays = reminder.scheduledFor;
    if (reminder.type === 'overdue_tasks') entry.lastOverdueTasks = reminder.scheduledFor;
    if (reminder.type === 'weekly_report') entry.lastWeeklyReport = reminder.scheduledFor;
    nextLog[reminder.supervisorId] = entry;
    updateRuntime({ supervisorReminderLog: nextLog });
  };

  const openMailClient = (reminder: SupervisorReminderItem) => {
    const url = `mailto:${encodeURIComponent(reminder.to)}?subject=${encodeURIComponent(reminder.subject)}&body=${encodeURIComponent(reminder.body)}`;
    window.open(url, '_blank');
  };

  const handleSendReminder = (reminder: SupervisorReminderItem) => {
    openMailClient(reminder);
    markReminderSent(reminder);
    showToast(`\u5df2\u6253\u5f00\u90ae\u4ef6\u53d1\u9001\u7a97\u53e3`, `${reminder.supervisorName || '\u76d1\u7763\u4eba'}\uff1a${reminder.reason}`);
  };

  const handleCopyReminder = (reminder: SupervisorReminderItem) => {
    navigator.clipboard.writeText(`主题：${reminder.subject}\n\n${reminder.body}`);
    showToast(`\u5df2\u590d\u5236\u63d0\u9192\u5185\u5bb9`);
  };

  const { dashBgBlur = 2, dashBgOpacity = 0.3 } = state.profile;

  return (
    <div className="relative transition-colors duration-500">
      {/* 自定义背景图层 */}
      {state.profile.dashboardBackground && (
        <>
          <div 
            className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-all duration-700"
            style={{ 
              backgroundImage: `url(${state.profile.dashboardBackground})`,
              filter: `blur(${dashBgBlur}px)`,
              opacity: dashBgOpacity
            }}
          />
          <div className="fixed inset-0 z-[1] bg-white/20 dark:bg-black/30 backdrop-blur-[1px] pointer-events-none" />
        </>
      )}
      
      {/* UI 内容容器 */}
      <div className="relative z-10 pb-24 text-gray-900 dark:text-gray-100">
        <header className="sticky top-0 z-50 glass border-b dark:border-white/5 border-black/5 px-4 py-4 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button onClick={() => setView('lock')} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-bold italic">仪表盘</h1>
            <div className="flex gap-2">
              <button onClick={onExport} title="导出" className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"><Download className="w-4 h-4" /></button>
              <label className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                <input type="file" className="hidden" accept=".json" onChange={onImport} />
              </label>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto p-6 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="glass rounded-2xl p-4 text-center">
              <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">总打卡</div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{Object.keys(state.checkins).length}</div>
            </div>
            <div className="glass rounded-2xl p-4 text-center">
              <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">学习总时长</div>
              <div className="text-2xl font-black text-orange-600 dark:text-orange-400">{totalTimeDisplay}</div>
            </div>
            <div className="glass rounded-2xl p-4 text-center">
              <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">连续打卡</div>
              <div className="text-2xl font-black text-green-600 dark:text-green-400">{state.profile.streak}</div>
            </div>
          </div>

          <div className="flex flex-wrap p-1 glass rounded-xl gap-1">
            {(['tasks', 'calendar', 'stats', 'settings'] as const).map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                {tab === 'tasks' ? '明日计划' : tab === 'calendar' ? '打卡日历' : tab === 'stats' ? '监督设置' : '个性设置'}
              </button>
            ))}
          </div>

          {activeTab === 'tasks' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="glass rounded-2xl p-4">
                <div className="flex flex-row gap-2">
                  <input 
                    placeholder="明日有什么计划？"
                    className={`${inputClass} flex-1`}
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      handleTypingSound(e);
                      if (e.key === 'Enter') handleAddTask();
                    }}
                  />
                  <button 
                    onClick={handleAddTask}
                    className="w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                  >
                    <Plus className="w-4 h-4" /> 预设
                  </button>
                </div>
                <p className="mt-2 ml-1 text-[10px] text-gray-400 font-medium">计划将自动设定为明日</p>
              </div>

              <div className="space-y-2">
                {tasks.length > 0 ? tasks.map(task => (
                  <div key={task.id} className="glass rounded-2xl p-4 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => toggleTask(task.id)}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${task.status === 'done' ? 'bg-green-500 border-green-500 text-white' : 'border-black/10 dark:border-white/20'}`}
                      >
                        {task.status === 'done' && <CheckCircle className="w-4 h-4" />}
                      </button>
                      <div>
                        <h3 className={`font-medium ${task.status === 'done' ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>{task.title}</h3>
                        {task.dueDate && <p className="text-[10px] text-gray-500 mt-0.5">📅 {task.dueDate}</p>}
                      </div>
                    </div>
                    <button onClick={() => deleteTask(task.id)} className="p-2 opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )) : (
                  <div className="text-center py-12 text-gray-400 dark:text-gray-600">
                    <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">还没有计划，快去添加吧</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'calendar' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="glass rounded-3xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">近 7 日时长趋势 (min)</h3>
                </div>
                <div ref={chartRef} className="w-full h-44" />
              </div>

              <div className="glass rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1))} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl"><ChevronLeft className="w-4 h-4" /></button>
                  <h2 className="font-black italic text-base">{monthLabel}</h2>
                  <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1))} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl"><ChevronRight className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {['日', '一', '二', '三', '四', '五', '六'].map(d => (<div key={d} className="text-center text-[10px] font-black text-gray-400 py-1">{d}</div>))}
                  {Array.from({ length: daysInMonth.firstDay }).map((_, i) => (<div key={`empty-${i}`} />))}
                  {Array.from({ length: daysInMonth.days }).map((_, i) => {
                    const day = i + 1;
                    const dateKey = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const checkin = state.checkins[dateKey];
                    const isToday = new Date().toISOString().slice(0, 10) === dateKey;
                    return (
                      <div key={day} className={`aspect-square flex flex-col items-center justify-center rounded-lg relative transition-all ${checkin ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-black/5 dark:hover:bg-white/5 text-gray-500'}`}>
                        <span className={`text-[11px] font-bold ${isToday && !checkin ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>{day}</span>
                        {isToday && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-current opacity-50" />}
                        {checkin && <div className="absolute top-1 right-1 w-0.5 h-0.5 rounded-full bg-white/40" />}
                      </div>
                    );
                  })}
                </div>
                <div className="pt-3 border-t dark:border-white/5 border-black/5">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">最近心得</h3>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-2 hide-scrollbar">
                    {Object.values(state.checkins).sort((a,b) => b.at.localeCompare(a.at)).slice(0,3).map(c => (
                      <div key={c.at} className="bg-black/10 dark:bg-white/5 p-2.5 rounded-xl">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-[9px] font-black text-indigo-500">{c.date}</span>
                          <span className="text-[9px] text-gray-500">{c.minutes} min</span>
                        </div>
                        <p className="text-[11px] text-gray-700 dark:text-gray-300 line-clamp-2 italic leading-relaxed">{c.note.split('【总结心得】：')[1] || c.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="glass rounded-2xl p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <section className="space-y-4">
                <h2 className="text-sm font-bold text-gray-500 uppercase flex items-center gap-2"><Settings className="w-4 h-4" /> 基本配置</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-medium">你的称呼</label>
                    <input
                      className={inputClass}
                      value={state.profile.name}
                      onChange={(e) => updateProfile({ name: e.target.value })}
                      onKeyDown={handleTypingSound}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-medium">每日截止时间</label>
                    <input
                      type="time"
                      className={inputClass}
                      value={state.profile.cutoff}
                      onChange={(e) => updateProfile({ cutoff: e.target.value })}
                      onKeyDown={handleTypingSound}
                    />
                  </div>
                </div>
              </section>
              <section className="space-y-4 pt-4 border-t dark:border-white/5 border-black/5">
                <h2 className="text-sm font-bold text-gray-500 uppercase flex items-center gap-2"><Sun className="w-4 h-4" /> 视觉与音效</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-medium">应用主题</label>
                    <div className="flex p-1 bg-black/5 dark:bg-black/20 rounded-xl gap-1">
                      <button onClick={() => updateProfile({ theme: 'light' })} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${state.profile.theme === 'light' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}><Sun className="w-3.5 h-3.5" /> 浅色</button>
                      <button onClick={() => updateProfile({ theme: 'dark' })} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${state.profile.theme === 'dark' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500'}`}><Moon className="w-3.5 h-3.5" /> 深色</button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-medium">操作音效</label>
                    <div className="flex p-1 bg-black/5 dark:bg-black/20 rounded-xl gap-1">
                      <button onClick={() => updateProfile({ isSoundEnabled: true })} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${state.profile.isSoundEnabled ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500'}`}><Volume2 className="w-3.5 h-3.5" /> 开启</button>
                      <button onClick={() => updateProfile({ isSoundEnabled: false })} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${!state.profile.isSoundEnabled ? 'bg-white/10 text-gray-400' : 'text-gray-500'}`}><VolumeX className="w-3.5 h-3.5" /> 关闭</button>
                    </div>
                  </div>
                </div>
              </section>
              <section className="space-y-4 pt-4 border-t dark:border-white/5 border-black/5">
                <h2 className="text-sm font-bold text-gray-500 uppercase flex items-center gap-2"><ImageIcon className="w-4 h-4" /> 背景视觉实验室</h2>
                <div className="space-y-6">
                  {/* 锁屏背景配置 */}
                  <div className="space-y-5 bg-black/5 dark:bg-white/5 p-5 rounded-[2rem] border border-black/5 dark:border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">锁屏页面</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => fetchRandomBg('lock')} className="p-2 glass rounded-xl hover:text-indigo-500 transition-all hover:scale-110 active:scale-95" title="随机图片"><RefreshCw className="w-4 h-4" /></button>
                        <label className="p-2 glass rounded-xl cursor-pointer hover:text-indigo-500 transition-all hover:scale-110 active:scale-95"><Upload className="w-4 h-4" /><input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'lock')} /></label>
                        {state.profile.lockBackground && <button onClick={() => updateProfile({ lockBackground: undefined })} className="p-2 glass rounded-xl text-red-500 hover:bg-red-500/10 transition-all hover:scale-110 active:scale-95"><X className="w-4 h-4" /></button>}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <SettingSlider 
                        label="模糊程度" 
                        icon={Droplets} 
                        value={state.profile.lockBgBlur || 0} 
                        min={0} max={40} step={1} suffix="px" 
                        onChange={(v) => updateProfile({ lockBgBlur: v })} 
                      />
                      <SettingSlider 
                        label="视觉深度 (透明度)" 
                        icon={Ghost} 
                        value={Math.round((state.profile.lockBgOpacity || 0.5) * 100)} 
                        min={0} max={100} step={5} suffix="%" 
                        onChange={(v) => updateProfile({ lockBgOpacity: v / 100 })} 
                      />
                    </div>
                    
                    <div className="pt-2 border-t border-black/5 dark:border-white/5">
                       <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">风格预设</p>
                       <StylePresets onSelect={(blur, opacity) => updateProfile({ lockBgBlur: blur, lockBgOpacity: opacity })} />
                    </div>
                  </div>

                  {/* 仪表盘背景配置 */}
                  <div className="space-y-5 bg-black/5 dark:bg-white/5 p-5 rounded-[2rem] border border-black/5 dark:border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">仪表盘</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => fetchRandomBg('dashboard')} className="p-2 glass rounded-xl hover:text-indigo-500 transition-all hover:scale-110 active:scale-95" title="随机图片"><RefreshCw className="w-4 h-4" /></button>
                        <label className="p-2 glass rounded-xl cursor-pointer hover:text-indigo-500 transition-all hover:scale-110 active:scale-95"><Upload className="w-4 h-4" /><input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'dashboard')} /></label>
                        {state.profile.dashboardBackground && <button onClick={() => updateProfile({ dashboardBackground: undefined })} className="p-2 glass rounded-xl text-red-500 hover:bg-red-500/10 transition-all hover:scale-110 active:scale-95"><X className="w-4 h-4" /></button>}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <SettingSlider 
                        label="模糊程度" 
                        icon={Droplets} 
                        value={state.profile.dashBgBlur || 2} 
                        min={0} max={40} step={1} suffix="px" 
                        onChange={(v) => updateProfile({ dashBgBlur: v })} 
                      />
                      <SettingSlider 
                        label="视觉深度 (透明度)" 
                        icon={Ghost} 
                        value={Math.round((state.profile.dashBgOpacity || 0.3) * 100)} 
                        min={0} max={100} step={5} suffix="%" 
                        onChange={(v) => updateProfile({ dashBgOpacity: v / 100 })} 
                      />
                    </div>

                    <div className="pt-2 border-t border-black/5 dark:border-white/5">
                       <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">风格预设</p>
                       <StylePresets onSelect={(blur, opacity) => updateProfile({ dashBgBlur: blur, dashBgOpacity: opacity })} />
                    </div>
                  </div>
                </div>
              </section>
              <div className="pt-6"><button onClick={onReset} className="w-full py-3 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 font-bold transition-all flex items-center justify-center gap-2"><Trash className="w-4 h-4" /> 清空所有数据</button></div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div className="glass rounded-3xl p-6 space-y-6">
                  <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400"><ShieldCheck className="w-6 h-6" /></div><div><h2 className="font-bold italic">真人监督员</h2><p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Human Supervision</p></div></div>
                  <div className="space-y-4">
                    {state.profile.supervisors.length === 0 ? (
                      <div className="p-4 bg-black/5 dark:bg-white/5 rounded-2xl text-xs text-gray-500">还未添加监督人，请填写挚友/同伴/师长的 QQ 邮箱。</div>
                    ) : (
                      <div className="space-y-4">
                        {state.profile.supervisors.map((supervisor) => (
                          <div key={supervisor.id} className="p-4 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5 space-y-4">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">监督人</p>
                              <div className="flex items-center gap-2">
                                <button onClick={() => updateSupervisor(supervisor.id, { enabled: !supervisor.enabled })} className={`px-2 py-1 rounded-lg text-[9px] font-black ${supervisor.enabled ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-400'}`}>{supervisor.enabled ? '启用中' : '已暂停'}</button>
                                <button onClick={() => removeSupervisor(supervisor.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><UserCheck className="w-3 h-3" /> 监督人姓名</label><input placeholder="谁在监督你？" className={inputClass} value={supervisor.name} onChange={(e) => updateSupervisor(supervisor.id, { name: e.target.value })} onKeyDown={handleTypingSound} /></div>
                              <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Mail className="w-3 h-3" /> QQ邮箱</label><input placeholder="xxx@qq.com" className={inputClass} value={supervisor.email} onChange={(e) => updateSupervisor(supervisor.id, { email: e.target.value })} onKeyDown={handleTypingSound} /></div>
                            </div>
                            <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Hand className="w-3 h-3" /> 你们的关系</label><input placeholder="挚友 / 同伴 / 师长" className={inputClass} value={supervisor.relation} onChange={(e) => updateSupervisor(supervisor.id, { relation: e.target.value })} onKeyDown={handleTypingSound} /></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={addSupervisor} className="w-full py-3 rounded-xl border border-indigo-500/30 text-indigo-600 hover:bg-indigo-500/10 font-bold transition-all flex items-center justify-center gap-2"><UserPlus className="w-4 h-4" /> 添加监督人</button>
                  <div className="p-4 bg-indigo-500/5 dark:bg-indigo-400/5 rounded-2xl border border-indigo-500/10 flex gap-3 items-start"><MessageSquare className="w-4 h-4 text-indigo-500 mt-1 shrink-0" /><p className="text-xs text-gray-500 leading-relaxed italic">监督提醒将通过 QQ 邮箱发送。请确保使用 {state.profile.supervisorSenderEmail || 'hillmis@qq.com'} 登录 QQ 邮箱发送。</p></div>

                  <div className="pt-4 border-t dark:border-white/5 border-black/5 space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest"><Mail className="w-3 h-3" /> 邮件发送设置</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">发送者姓名</label><input className={inputClass} value={state.profile.supervisorSenderName} onChange={(e) => updateProfile({ supervisorSenderName: e.target.value })} onKeyDown={handleTypingSound} /></div>
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">发送QQ邮箱</label><input className={inputClass} value={state.profile.supervisorSenderEmail} onChange={(e) => updateProfile({ supervisorSenderEmail: e.target.value })} onKeyDown={handleTypingSound} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">周报发送日</label><select className={inputClass} value={reminderSettings.weeklyReportDay} onChange={(e) => updateReminderSettings({ weeklyReportDay: Number(e.target.value) })}>{weekDayOptions.map((d, idx) => (<option key={d} value={idx}>{d}</option>))}</select></div>
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">周报时间</label><input type="time" className={inputClass} value={reminderSettings.weeklyReportTime} onChange={(e) => updateReminderSettings({ weeklyReportTime: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <label className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5 text-[10px] font-black text-gray-500"><span>每日截止提醒</span><input type="checkbox" checked={reminderSettings.dailyCutoffReminderEnabled} onChange={(e) => updateReminderSettings({ dailyCutoffReminderEnabled: e.target.checked })} /></label>
                      <label className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5 text-[10px] font-black text-gray-500"><span>任务逾期提醒</span><input type="checkbox" checked={reminderSettings.overdueTasksReminderEnabled} onChange={(e) => updateReminderSettings({ overdueTasksReminderEnabled: e.target.checked })} /></label>
                      <label className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5 text-[10px] font-black text-gray-500"><span>缺卡提醒</span><input type="checkbox" checked={reminderSettings.missedDaysReminderEnabled} onChange={(e) => updateReminderSettings({ missedDaysReminderEnabled: e.target.checked })} /></label>
                      <label className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5 text-[10px] font-black text-gray-500"><span>周报提醒</span><input type="checkbox" checked={reminderSettings.weeklyReportEnabled} onChange={(e) => updateReminderSettings({ weeklyReportEnabled: e.target.checked })} /></label>
                    </div>
                  </div>

                  <div className="pt-4 border-t dark:border-white/5 border-black/5 space-y-4">
                    <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest"><Bell className="w-3 h-3" /> 待发送提醒</div>
                      <span className="text-[10px] font-black text-indigo-500">待发送 {pendingReminders.length}</span>
                    </div>
                    {pendingReminders.length === 0 ? (
                      <div className="p-4 bg-black/5 dark:bg-white/5 rounded-2xl text-xs text-gray-500">当前没有需要发送的提醒。</div>
                    ) : (
                      <div className="space-y-3">
                        {pendingReminders.map(reminder => (
                          <div key={reminder.id} className="p-4 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-bold">{reminderTypeLabel[reminder.type]} 给 {reminder.supervisorName || reminder.to}</p>
                                <p className="text-[10px] text-gray-500">{reminder.reason}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={() => handleCopyReminder(reminder)} className="p-2 rounded-lg hover:bg-black/10"><Copy className="w-4 h-4" /></button>
                                <button onClick={() => handleSendReminder(reminder)} className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"><Send className="w-4 h-4" /></button>
                              </div>
                            </div>
                            <p className="text-[10px] text-gray-500">QQ 邮箱提醒将默认打开客户端或 QQ 邮箱网页</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
               </div>
               <div className="glass rounded-3xl p-6 relative overflow-hidden border-indigo-500/20">
                  <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><Sparkles className="w-32 h-32 text-indigo-500" /></div>
                  <div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400"><Sparkles className="w-6 h-6" /></div><div><h2 className="font-bold italic">AI 智能审计</h2><p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Autonomous Auditor</p></div></div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed">基于本周所有打卡详情与任务核销率，AI 监督员将生成一份带有情感分析的深度报告。</p>
                  <button onClick={handleGenerateReport} disabled={loadingAI} className={`w-full py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-xl text-white ${loadingAI ? 'bg-gray-400 dark:bg-gray-700 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:shadow-indigo-500/20 active:scale-[0.98]'}`}>{loadingAI ? 'AI 审计中...' : '生成本周审计报告'}</button>
               </div>
               {aiReport && (
                 <div className="glass rounded-3xl p-6 space-y-4 animate-in fade-in zoom-in duration-500 border-indigo-500/10">
                   <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-indigo-600" /><h3 className="font-bold text-sm">审计结果</h3></div><button onClick={copyReport} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl flex items-center gap-2 text-xs font-bold transition-all text-indigo-600"><Copy className="w-4 h-4" /> 复制发送给监督人</button></div>
                   <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed bg-black/10 dark:bg-black/20 p-5 rounded-2xl border border-black/5 dark:border-white/5">{aiReport}</div>
                 </div>
               )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
