
import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import { ViewType, AppState, Task, CheckinRecord } from '../types';
import { CheckCircle2, LayoutDashboard, Clock, Flame, Calendar, Sparkles, Check, ChevronRight, AlertCircle, Trophy, Timer, Target, Quote, Music, Volume2, VolumeX, Headphones, RefreshCw, Briefcase, Wand2, Sliders, X as CloseIcon } from 'lucide-react';
import { GOLDEN_QUOTES } from '../constants';

const SOUNDS = {
  success: 'https://assets.mixkit.co/sfx/preview/mixkit-success-bell-600.mp3',
  click: 'https://assets.mixkit.co/sfx/preview/mixkit-modern-click-box-check-1120.mp3',
};

const TimeWheel = memo(({ valueInMinutes, onChange }: { valueInMinutes: number, onChange: (mins: number) => void }) => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const ITEM_HEIGHT = 56; 
  const CONTAINER_HEIGHT = ITEM_HEIGHT * 3; 
  
  const hoursOptions = useMemo(() => Array.from({ length: 48 }, (_, i) => (i + 1) * 0.5), []);
  const currentHours = valueInMinutes / 60;

  const handleScroll = () => {
    if (!wheelRef.current) return;
    const scrollTop = wheelRef.current.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    const selectedHours = hoursOptions[index];
    if (selectedHours === undefined) return;
    const selectedMinutes = selectedHours * 60;
    const offset = Math.abs(scrollTop - index * ITEM_HEIGHT);
    if (selectedMinutes !== valueInMinutes && offset < 12) {
      onChange(selectedMinutes);
      if ('vibrate' in navigator) navigator.vibrate(10);
    }
  };

  const scrollToValue = (hours: number) => {
    if (!wheelRef.current) return;
    const index = hoursOptions.indexOf(hours);
    wheelRef.current.scrollTo({ top: index * ITEM_HEIGHT, behavior: 'smooth' });
  };

  return (
    <div 
      className="w-28 bg-black/5 dark:bg-black/40 border-r border-black/5 dark:border-white/10 flex flex-col items-center justify-center relative wheel-container overflow-hidden"
      style={{ height: `${CONTAINER_HEIGHT}px` }}
    >
      <div className="absolute top-2 text-[8px] font-black text-indigo-500/40 uppercase tracking-[0.2em] z-10">HOURS</div>
      <div 
        ref={wheelRef}
        onScroll={handleScroll}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar touch-pan-y"
        style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
      >
        <div className="h-[56px] shrink-0 pointer-events-none" />
        {hoursOptions.map((h) => {
          const isSelected = Math.abs(currentHours - h) < 0.1;
          const diff = h - currentHours;
          const rotateX = diff * 20; 
          const opacity = Math.max(0.15, 1 - Math.abs(diff) * 0.6);
          const scale = isSelected ? 1.4 : 0.75;
          return (
            <div 
              key={h} 
              onClick={() => scrollToValue(h)}
              className={`h-[56px] flex items-center justify-center snap-center snap-always cursor-pointer font-black transition-all duration-300 select-none ${
                isSelected ? 'text-2xl text-indigo-600 dark:text-indigo-400 z-20 scale-110' : 'text-sm text-gray-400 dark:text-gray-700'
              }`}
              style={{
                opacity,
                transform: `rotateX(${rotateX}deg) scale(${scale})`,
                transformStyle: 'preserve-3d',
              }}
            >
              {h % 1 === 0 ? h : h.toFixed(1)}
            </div>
          );
        })}
        <div className="h-[56px] shrink-0 pointer-events-none" />
      </div>
      <div 
        className="absolute left-2 right-2 pointer-events-none z-0 border-y-2 border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-400/5 shadow-[inset_0_0_15px_rgba(99,102,241,0.05)]"
        style={{ height: `${ITEM_HEIGHT}px`, top: `${ITEM_HEIGHT}px`, borderRadius: '16px' }}
      >
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/50"></div>
        <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/50"></div>
      </div>
    </div>
  );
});

TimeWheel.displayName = 'TimeWheel';

interface LockScreenProps {
  state: AppState;
  onCheckin: (minutes: number, note: string, completedTaskIds: string[]) => void;
  setView: (view: ViewType) => void;
  updateProfile: (updates: Partial<AppState['profile']>) => void;
  activeQuoteIndex: number;
  isAmbientPlaying: boolean;
}

export const LockScreen: React.FC<LockScreenProps> = ({ 
  state, onCheckin, setView, updateProfile, activeQuoteIndex, isAmbientPlaying 
}) => {
  const [minutes, setMinutes] = useState<number>(30);
  const [note, setNote] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAuditMode, setIsAuditMode] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [showError, setShowError] = useState(false);
  const [isRefreshingBg, setIsRefreshingBg] = useState(false);

  const dailyQuote = GOLDEN_QUOTES[activeQuoteIndex] || GOLDEN_QUOTES[0];

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const playSound = (type: 'success' | 'click') => {
    if (!state.profile.isSoundEnabled) return;
    const audio = new Audio(SOUNDS[type]);
    audio.play().catch(e => console.warn("Audio playback failed:", e));
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const hasToday = !!state.checkins[todayStr];
  const isValid = useMemo(() => note.trim().length >= 2, [note]);

  const pendingTasks = useMemo(() => {
    return (Object.values(state.tasks) as Task[]).filter(t => 
      t.status === 'todo' && (!t.dueDate || t.dueDate <= todayStr)
    );
  }, [state.tasks, todayStr]);

  const confirmedPlansText = useMemo(() => {
    const names = pendingTasks
      .filter(t => completedTaskIds.includes(t.id))
      .map(t => t.title);
    return names.length > 0 ? names.join('、') : '无具体核销计划';
  }, [pendingTasks, completedTaskIds]);

  const handleStartCheckin = () => {
    playSound('click');
    if (!showSummary && !isAuditMode) {
      if (pendingTasks.length > 0) setIsAuditMode(true);
      else setShowSummary(true);
      if ('vibrate' in navigator) navigator.vibrate(5);
      return;
    }

    if (showSummary) {
      if (!isValid) {
        setShowError(true);
        setTimeout(() => setShowError(false), 2000);
        return;
      }
      playSound('success');
      const finalNote = `【核销计划】：${confirmedPlansText}\n【总结心得】：${note}`;
      onCheckin(minutes, finalNote, completedTaskIds);
    }
  };

  const handleAuditConfirm = () => {
    playSound('click');
    setIsAuditMode(false);
    setShowSummary(true);
  };

  const toggleTaskAudit = (id: string) => {
    playSound('click');
    setCompletedTaskIds(prev => 
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  };

  const handleRefreshBg = async () => {
    if (isRefreshingBg) return;
    setIsRefreshingBg(true);
    playSound('click');
    try {
      const randomUrl = `https://picsum.photos/1600/900?random=${Date.now()}`;
      updateProfile({ lockBackground: randomUrl });
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setIsRefreshingBg(false), 1000);
    }
  };

  const timeStr = currentTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = currentTime.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });

  const { lockBgBlur = 0, lockBgOpacity = 0.5 } = state.profile;

  return (
    <div className="min-h-screen flex flex-col relative touch-none overflow-hidden transition-colors duration-500 selection:bg-indigo-500/30">
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .wheel-container { perspective: 1200px; }
        @keyframes music-bars {
          0%, 100% { height: 4px; }
          50% { height: 16px; }
        }
        .music-bar {
          width: 2px;
          background: currentColor;
          animation: music-bars 0.6s ease-in-out infinite;
        }
      `}</style>

      {/* 自定义背景图层 */}
      {state.profile.lockBackground && (
        <>
          <div 
            className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-all duration-700"
            style={{ 
              backgroundImage: `url(${state.profile.lockBackground})`,
              filter: `blur(${lockBgBlur}px)`,
              opacity: lockBgOpacity
            }}
          />
          {/* 背景遮罩层 */}
          <div className="fixed inset-0 z-[1] bg-white/10 dark:bg-black/20 backdrop-blur-[1px] pointer-events-none" />
        </>
      )}

      {/* UI 内容容器 */}
      <div className="relative z-10 flex flex-col p-5 max-w-2xl mx-auto w-full min-h-screen">
        {/* 顶部 */}
        <header className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-800 shadow-xl shadow-indigo-500/20 flex items-center justify-center text-white">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-gray-100 italic leading-none">学了么</h1>
              <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em] font-black mt-1">Deep Focus</p>
            </div>
          </div>
          <div className="flex gap-2">
            {/* 刷新背景按钮 */}
            <button 
              onClick={handleRefreshBg}
              disabled={isRefreshingBg}
              className={`p-3.5 glass rounded-2xl transition-all active:scale-90 text-gray-400 hover:text-indigo-500 ${isRefreshingBg ? 'animate-spin' : ''}`}
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            {/* 工具箱按钮 */}
            <button 
              onClick={() => { playSound('click'); setView('tools'); }}
              className={`p-3.5 glass rounded-2xl transition-all active:scale-90 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400`}
            >
              <Briefcase className="w-5 h-5" />
            </button>

            {/* 正在播放指示器 */}
            {isAmbientPlaying && (
              <div className="flex items-center gap-2 px-4 py-3 glass rounded-2xl text-indigo-600 dark:text-indigo-400 animate-in fade-in zoom-in duration-300">
                <div className="flex items-end gap-0.5 h-4 mb-0.5">
                  <div className="music-bar" style={{ animationDelay: '0s' }}></div>
                  <div className="music-bar" style={{ animationDelay: '0.2s' }}></div>
                  <div className="music-bar" style={{ animationDelay: '0.1s' }}></div>
                </div>
              </div>
            )}

            <button 
              onClick={() => { playSound('click'); setView('dashboard'); }}
              className="p-3.5 glass rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-90"
            >
              <LayoutDashboard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </button>
          </div>
        </header>

        {/* 时间展示 */}
        <div className="flex flex-col items-center mb-8 animate-in fade-in zoom-in duration-1000">
          <div className="text-[5.5rem] font-black tracking-tighter mb-0 tabular-nums leading-none text-gray-900 dark:text-gray-100">{timeStr}</div>
          <div className="mt-2 px-5 py-1.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black tracking-[0.2em] uppercase">{dateStr}</div>
        </div>

        {/* 打卡交互主体 */}
        <div className="flex-1 flex flex-col items-center justify-center gap-10">
          <div className="relative">
            <button
              onClick={handleStartCheckin}
              disabled={hasToday}
              className={`
                w-56 h-56 rounded-full flex flex-col items-center justify-center gap-2 transition-all duration-700 shadow-2xl active:scale-95 relative overflow-hidden touch-manipulation
                ${hasToday 
                  ? 'bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-500 cursor-default' 
                  : (showSummary && !isValid)
                    ? 'bg-gray-200 dark:bg-white/5 border border-transparent text-gray-400 dark:text-gray-600'
                    : 'bg-indigo-600 border-[8px] border-indigo-400/20 text-white shadow-indigo-500/40'}
              `}
            >
              {hasToday ? (
                <div className="flex flex-col items-center animate-in zoom-in-50 duration-500">
                  <CheckCircle2 className="w-16 h-16 mb-2" />
                  <span className="font-black text-xl tracking-tight">今日已达成</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-black mb-1">{showSummary ? '确认同步' : '完成学习'}</span>
                  <div className="flex items-center gap-1.5 opacity-80">
                     <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                     <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                      {showSummary ? (isValid ? '立即同步' : '总结必填') : '点击开启总结'}
                     </span>
                  </div>
                </div>
              )}
            </button>
            {showError && (
              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2 text-red-500 font-black text-[10px] animate-in slide-in-from-top-4 duration-300 bg-red-500/10 px-5 py-2.5 rounded-full whitespace-nowrap">
                <AlertCircle className="w-4 h-4" /> 总结是成长的关键（至少2字）
              </div>
            )}
          </div>

          {showSummary && !hasToday && (
            <div className="w-full max-w-sm animate-in slide-in-from-bottom-10 fade-in duration-700">
              <div className="glass flex items-stretch rounded-[2.5rem] overflow-hidden border dark:border-white/10 border-black/5 shadow-2xl bg-white/60 dark:bg-black/50 backdrop-blur-3xl min-h-[168px]">
                <TimeWheel valueInMinutes={minutes} onChange={setMinutes} />
                <div className="flex-1 p-5 flex flex-col gap-2 relative">
                  <div className="flex items-start gap-2 text-indigo-600 dark:text-indigo-400 mb-1 opacity-80">
                    <Target className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <div className="text-[10px] font-bold leading-tight line-clamp-2">
                      已核销：{confirmedPlansText}
                    </div>
                  </div>
                  <div className="h-px w-full bg-black/5 dark:bg-white/5" />
                  <textarea
                    placeholder="写下心得体会... *"
                    autoFocus
                    value={note}
                    onChange={(e) => { setNote(e.target.value); setShowError(false); }}
                    className="w-full flex-1 bg-transparent outline-none resize-none text-sm placeholder:text-gray-400 dark:placeholder:text-gray-600 leading-relaxed font-bold text-gray-900 dark:text-gray-100"
                  />
                  <div className="absolute bottom-3 right-5 flex items-center gap-2">
                     <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 tracking-widest uppercase">
                      {note.length} 字
                     </span>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center mt-5 px-6">
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  核销时长: <span className="text-indigo-500">{(minutes / 60).toFixed(1)}h</span>
                </p>
                <button 
                  onClick={() => { playSound('click'); setShowSummary(false); }}
                  className="text-[10px] font-bold text-gray-400 hover:text-indigo-500 transition-colors uppercase tracking-widest"
                >
                  返回修改
                </button>
              </div>
            </div>
          )}
        </div>

        {!showSummary && (
          <div className="px-8 mt-12 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 flex items-center justify-center gap-2.5 transition-all ease-out opacity-60 scale-100">
            <Quote className="w-3 h-3 text-indigo-500 shrink-0" />
            <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400 italic tracking-wider text-center leading-relaxed">
              {dailyQuote}
            </p>
          </div>
        )}
      </div>

      {/* 计划核销弹窗 */}
      {isAuditMode && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/70 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="glass w-full max-w-md rounded-t-[3.5rem] sm:rounded-[3rem] p-8 pb-10 sm:p-10 shadow-2xl animate-in slide-in-from-bottom duration-500 border-t dark:border-white/20 border-black/10">
            <div className="w-12 h-1.5 bg-gray-400/20 rounded-full mx-auto mb-8 sm:hidden" />
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Target className="w-8 h-8" strokeWidth={3} />
              </div>
              <div>
                <h2 className="text-2xl font-black italic text-gray-900 dark:text-gray-100">计划核销</h2>
                <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.3em] mt-1">Status Verification</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-8 leading-relaxed font-bold uppercase tracking-wide">
              请勾选今日实际完成的计划，确认后将自动汇总至总结报告中。
            </p>
            <div className="max-h-[30vh] overflow-y-auto space-y-3 mb-10 pr-1 hide-scrollbar touch-pan-y">
              {pendingTasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => toggleTaskAudit(task.id)}
                  className={`w-full flex items-center justify-between p-5 rounded-3xl border-2 transition-all duration-300 active:scale-95 ${
                    completedTaskIds.includes(task.id) 
                    ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-700 dark:text-indigo-400' 
                    : 'bg-black/5 dark:bg-white/5 border-transparent text-gray-400'
                  }`}
                >
                  <span className="font-black text-sm text-left italic">{task.title}</span>
                  <div className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all ${
                    completedTaskIds.includes(task.id) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-400/30'
                  }`}>
                    {completedTaskIds.includes(task.id) && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => { playSound('click'); setIsAuditMode(false); }}
                className="flex-1 py-5 rounded-3xl bg-black/5 dark:bg-white/5 text-[10px] font-black text-gray-600 dark:text-gray-300 uppercase tracking-[0.2em] hover:bg-black/10 transition-all active:scale-90"
              >
                暂不核销
              </button>
              <button 
                onClick={handleAuditConfirm}
                className="flex-[2] py-5 rounded-3xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/30 hover:bg-indigo-500 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                确认计划 <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="h-4 w-full shrink-0" />
    </div>
  );
};
