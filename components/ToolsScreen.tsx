
import React from 'react';
import { ArrowLeft, Volume2, VolumeX, Sliders, Wand2, Sparkles, Music, Coffee, Moon, Sun, Wind } from 'lucide-react';
import { AppState, ViewType } from '../types';

interface ToolsScreenProps {
  state: AppState;
  setView: (view: ViewType) => void;
  isAmbientPlaying: boolean;
  toggleAmbient: () => void;
  ambientVolume: number;
  setAmbientVolume: (v: number) => void;
  onRefreshQuote: () => void;
}

export const ToolsScreen: React.FC<ToolsScreenProps> = ({
  state, setView, isAmbientPlaying, toggleAmbient, ambientVolume, setAmbientVolume, onRefreshQuote
}) => {
  return (
    <div className="min-h-screen relative flex flex-col p-6 animate-in fade-in duration-500">
      {state.profile.lockBackground && (
        <>
          <div 
            className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-all duration-700"
            style={{ 
              backgroundImage: `url(${state.profile.lockBackground})`,
              filter: `blur(${state.profile.lockBgBlur || 10}px)`,
              opacity: (state.profile.lockBgOpacity || 0.5) * 0.4
            }}
          />
          <div className="fixed inset-0 z-[1] bg-white/40 dark:bg-black/60 backdrop-blur-[2px] pointer-events-none" />
        </>
      )}

      <div className="relative z-10 max-w-2xl mx-auto w-full flex-1 flex flex-col pt-4">
        <header className="flex items-center gap-4 mb-10">
          <button 
            onClick={() => setView('lock')}
            className="p-3.5 glass rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-90 text-gray-600 dark:text-gray-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black italic text-gray-900 dark:text-gray-100 leading-none">沉浸工具箱</h1>
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Immersive Toolbox</p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6">
          <section className="glass rounded-[2.5rem] p-8 space-y-6 border border-black/5 dark:border-white/10 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-[1.5rem] transition-all duration-500 ${isAmbientPlaying ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40' : 'bg-gray-100 dark:bg-white/5 text-gray-400'}`}>
                  <Music className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">专注背景音</h3>
                  <p className="text-xs text-gray-500">消除环境噪音，提升专注力</p>
                </div>
              </div>
              <button 
                onClick={toggleAmbient}
                className={`px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 ${
                  isAmbientPlaying 
                  ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' 
                  : 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30 hover:bg-indigo-500'
                }`}
              >
                {isAmbientPlaying ? '停止播放' : '立即播放'}
              </button>
            </div>

            <div className="space-y-4 pt-4 border-t border-black/5 dark:border-white/5">
              <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <div className="flex items-center gap-2"><Sliders className="w-3.5 h-3.5" /> 混音音量</div>
                <span className="text-indigo-500 text-sm">{Math.round(ambientVolume * 100)}%</span>
              </div>
              <div className="relative h-6 flex items-center group">
                <input 
                  type="range" 
                  min="0" max="1" step="0.01"
                  value={ambientVolume}
                  onChange={(e) => setAmbientVolume(Number(e.target.value))}
                  className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500 group-hover:h-2 transition-all"
                />
              </div>
            </div>
          </section>

          <section className="glass rounded-[2.5rem] p-8 space-y-6 border border-black/5 dark:border-white/10 shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-[1.5rem] bg-orange-500/10 text-orange-600">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">精神食粮</h3>
                <p className="text-xs text-gray-500">获取一条全新的励志金句</p>
              </div>
            </div>
            
            <button 
              onClick={onRefreshQuote}
              className="w-full py-5 rounded-[1.5rem] bg-black/5 dark:bg-white/5 border border-dashed border-gray-300 dark:border-gray-700 hover:border-indigo-500 transition-all active:scale-98 flex items-center justify-center gap-3 group"
            >
              <Wand2 className="w-5 h-5 text-indigo-500 group-hover:rotate-12 transition-transform" />
              <span className="text-sm font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">刷新首页激励语</span>
            </button>
          </section>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass rounded-[2rem] p-8 flex flex-col items-center gap-4 opacity-40 border border-black/5 dark:border-white/5 grayscale">
              <Coffee className="w-7 h-7 text-orange-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-center">高效番茄钟</span>
            </div>
            <div className="glass rounded-[2rem] p-8 flex flex-col items-center gap-4 opacity-40 border border-black/5 dark:border-white/5 grayscale">
              <Wind className="w-7 h-7 text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-center">白噪音混响</span>
            </div>
          </div>
        </div>

        <footer className="mt-auto py-12 text-center">
          <p className="text-[10px] font-black text-gray-400/60 uppercase tracking-[0.5em]">designed for extreme focus</p>
        </footer>
      </div>
    </div>
  );
};
