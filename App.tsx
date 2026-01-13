
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, ViewType, Task } from './types';
import { StorageService, getDefaultState } from './services/storage';
import { LockScreen } from './components/LockScreen';
import { Dashboard } from './components/Dashboard';
import { ToolsScreen } from './components/ToolsScreen';
import { Toast } from './components/Toast';
import { GOLDEN_QUOTES } from './constants';

const AMBIENT_SOUND_URL = 'https://assets.mixkit.co/music/preview/mixkit-dreaming-big-31.mp3';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(StorageService.load());
  const [view, setView] = useState<ViewType>('lock');
  const [toast, setToast] = useState<{ title: string, desc?: string, visible: boolean }>({
    title: '', visible: false
  });

  // Global Audio & Quote State
  const [isAmbientPlaying, setIsAmbientPlaying] = useState(false);
  const [ambientVolume, setAmbientVolume] = useState(0.4);
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const [activeQuoteIndex, setActiveQuoteIndex] = useState(0);

  // Initialize Random Quote
  useEffect(() => {
    setActiveQuoteIndex(Math.floor(Math.random() * GOLDEN_QUOTES.length));
  }, []);

  // Apply theme to document
  useEffect(() => {
    const theme = state.profile.theme || 'dark';
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
    
    // Update body class for main background
    document.body.className = theme === 'dark' ? 'bg-main-dark' : 'bg-main-light';
  }, [state.profile.theme]);

  // Persist state
  useEffect(() => {
    StorageService.save(state);
  }, [state]);

  // Sync Audio Volume
  useEffect(() => {
    if (ambientAudioRef.current) {
      ambientAudioRef.current.volume = ambientVolume;
    }
  }, [ambientVolume]);

  const showToast = useCallback((title: string, desc?: string) => {
    setToast({ title, desc, visible: true });
  }, []);

  const toggleAmbient = useCallback(() => {
    if (!ambientAudioRef.current) {
      ambientAudioRef.current = new Audio(AMBIENT_SOUND_URL);
      ambientAudioRef.current.loop = true;
      ambientAudioRef.current.volume = ambientVolume;
    }
    
    if (isAmbientPlaying) {
      ambientAudioRef.current.pause();
    } else {
      ambientAudioRef.current.play().catch(e => {
        console.warn("Ambient playback failed:", e);
      });
    }
    setIsAmbientPlaying(!isAmbientPlaying);
  }, [isAmbientPlaying, ambientVolume]);

  const handleRefreshQuote = useCallback(() => {
    setActiveQuoteIndex(prev => {
      let next;
      do {
        next = Math.floor(Math.random() * GOLDEN_QUOTES.length);
      } while (next === prev && GOLDEN_QUOTES.length > 1);
      return next;
    });
    showToast('激励语已更新');
  }, [showToast]);

  const handleCheckin = (minutes: number, note: string, completedTaskIds: string[]) => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(now.getDate() + 1);
    const tomorrow = tomorrowDate.toISOString().slice(0, 10);
    
    const last = state.profile.lastCheckinDate;
    
    let newStreak = state.profile.streak;
    if (last) {
      const lastDate = new Date(last);
      const todayDate = new Date(today);
      const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) newStreak += 1;
      else if (diffDays > 1) newStreak = 1;
    } else {
      newStreak = 1;
    }

    const updatedTasks = { ...state.tasks };
    let postponedCount = 0;

    const auditTaskIds = (Object.values(state.tasks) as Task[])
      .filter(t => t.status === 'todo' && (!t.dueDate || t.dueDate <= today))
      .map(t => t.id);

    auditTaskIds.forEach(id => {
      if (completedTaskIds.includes(id)) {
        updatedTasks[id] = {
          ...updatedTasks[id],
          status: 'done',
          doneAt: now.toISOString()
        };
      } else {
        updatedTasks[id] = {
          ...updatedTasks[id],
          dueDate: tomorrow
        };
        postponedCount++;
      }
    });

    setState(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        lastCheckinDate: today,
        streak: newStreak
      },
      checkins: {
        ...prev.checkins,
        [today]: {
          date: today,
          minutes,
          note,
          at: now.toISOString()
        }
      },
      tasks: updatedTasks
    }));
    
    const postponedInfo = postponedCount > 0 ? `，${postponedCount} 个未完任务已顺延` : '';
    showToast('打卡成功！', `今日已学 ${minutes} 分钟${postponedInfo}`);
  };

  const updateProfile = (updates: Partial<AppState['profile']>) => {
    setState(prev => ({
      ...prev,
      profile: { ...prev.profile, ...updates }
    }));
  };

  const addTask = (title: string, dueDate: string | null, desc: string) => {
    const id = `task_${Date.now()}`;
    setState(prev => ({
      ...prev,
      tasks: {
        ...prev.tasks,
        [id]: {
          id,
          title,
          dueDate,
          desc,
          status: 'todo',
          createdAt: new Date().toISOString(),
          doneAt: null
        }
      }
    }));
  };

  const toggleTask = (id: string) => {
    setState(prev => {
      const task = prev.tasks[id];
      if (!task) return prev;
      return {
        ...prev,
        tasks: {
          ...prev.tasks,
          [id]: {
            ...task,
            status: task.status === 'done' ? 'todo' : 'done',
            doneAt: task.status === 'done' ? null : new Date().toISOString()
          }
        }
      };
    });
  };

  const deleteTask = (id: string) => {
    setState(prev => {
      const newTasks = { ...prev.tasks };
      delete newTasks[id];
      return { ...prev, tasks: newTasks };
    });
  };

  const handleReset = () => {
    if (window.confirm('确定要清空所有学习记录吗？此操作不可撤销。')) {
      const empty = getDefaultState();
      setState(empty);
      StorageService.clear();
      showToast('数据已清空');
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xueleme_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('导出成功');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        setState(imported);
        showToast('导入成功');
      } catch {
        showToast('导入失败', '文件格式有误');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen transition-colors duration-500 selection:bg-indigo-500/30">
      {view === 'lock' && (
        <LockScreen 
          state={state} 
          onCheckin={handleCheckin} 
          setView={setView} 
          updateProfile={updateProfile}
          activeQuoteIndex={activeQuoteIndex}
          isAmbientPlaying={isAmbientPlaying}
        />
      )}
      {view === 'dashboard' && (
        <Dashboard 
          state={state} 
          setView={setView}
          updateProfile={updateProfile}
          addTask={addTask}
          toggleTask={toggleTask}
          deleteTask={deleteTask}
          onReset={handleReset}
          onExport={handleExport}
          onImport={handleImport}
          showToast={showToast}
        />
      )}
      {view === 'tools' && (
        <ToolsScreen
          state={state}
          setView={setView}
          isAmbientPlaying={isAmbientPlaying}
          toggleAmbient={toggleAmbient}
          ambientVolume={ambientVolume}
          setAmbientVolume={setAmbientVolume}
          onRefreshQuote={handleRefreshQuote}
        />
      )}
      
      <Toast 
        title={toast.title} 
        description={toast.desc} 
        visible={toast.visible} 
        onClose={() => setToast(prev => ({ ...prev, visible: false }))} 
      />
    </div>
  );
};

export default App;
