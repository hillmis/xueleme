import React, { useMemo, useState, useRef } from 'react';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Sliders,
  Timer,
  Sparkles,
  PlayCircle,
  Flame,
  BookOpen,
  Smile,
  LayoutGrid
} from 'lucide-react';
import { AppState, ToolItem, ToolSize, ViewType } from '../types';
import { createTypingSoundHandler } from '../services/audio';

interface ToolsScreenProps {
  state: AppState;
  setView: (view: ViewType) => void;
  isAmbientPlaying: boolean;
  toggleAmbient: () => void;
  ambientVolume: number;
  setAmbientVolume: (v: number) => void;
  tools: ToolItem[];
  updateTools: (nextTools: ToolItem[]) => void;
}

const TOOL_THEMES: Record<ToolItem['theme'], string> = {
  violet: 'from-[#6b4b8e] via-[#4b356a] to-[#332a55]',
  indigo: 'from-[#3b2e5f] via-[#342955] to-[#2c2447]',
  blue: 'from-[#1e3b59] via-[#203450] to-[#1a2a3d]',
  teal: 'from-[#1c3a3f] via-[#1f3338] to-[#1a2c31]',
  orange: 'from-[#3b2a20] via-[#30231c] to-[#251d18]',
  pink: 'from-[#3a2a3f] via-[#3a2933] to-[#2e232b]',
  navy: 'from-[#1d2b4d] via-[#1f2f5a] to-[#1a233d]'
};

const TOOL_SIZES: Record<ToolSize, { rowSpan: string; padding: string; title: string; desc: string }> = {
  lg: {
    rowSpan: 'row-span-3',
    padding: 'p-8',
    title: 'text-[clamp(1.1rem,1.8vw,1.6rem)]',
    desc: 'text-[clamp(0.75rem,1.2vw,0.95rem)]'
  },
  md: {
    rowSpan: 'row-span-2',
    padding: 'p-7',
    title: 'text-[clamp(1rem,1.6vw,1.35rem)]',
    desc: 'text-[clamp(0.7rem,1.1vw,0.85rem)]'
  },
  sm: {
    rowSpan: 'row-span-1',
    padding: 'p-6',
    title: 'text-[clamp(0.95rem,1.4vw,1.2rem)]',
    desc: 'text-[clamp(0.65rem,1vw,0.8rem)]'
  }
};

const ICONS: Record<ToolItem['icon'], React.ElementType> = {
  timer: Timer,
  focus: Sparkles,
  video: PlayCircle,
  douyin: Flame,
  study: BookOpen,
  relax: Smile
};

const SIZE_OPTIONS: ToolSize[] = ['sm', 'md', 'lg'];
const THEME_OPTIONS: ToolItem['theme'][] = ['violet', 'indigo', 'blue', 'teal', 'orange', 'pink', 'navy'];
const ICON_OPTIONS: ToolItem['icon'][] = ['timer', 'focus', 'video', 'douyin', 'study', 'relax'];

export const ToolsScreen: React.FC<ToolsScreenProps> = ({
  state,
  setView,
  isAmbientPlaying,
  toggleAmbient,
  ambientVolume,
  setAmbientVolume,
  tools,
  updateTools
}) => {
  const [isManageMode, setIsManageMode] = useState(false);
  const [draft, setDraft] = useState({
    title: '',
    desc: '',
    size: 'sm' as ToolSize,
    theme: 'indigo' as ToolItem['theme'],
    icon: 'timer' as ToolItem['icon']
  });
  const typingSoundRef = useRef(createTypingSoundHandler({ volume: 0.12 }));

  const handleTypingSound = (event: React.KeyboardEvent<HTMLInputElement>) => {
    typingSoundRef.current(event, state.profile.isSoundEnabled);
  };

  const sortedTools = useMemo(() => tools.slice(), [tools]);

  const handleAddTool = () => {
    if (!draft.title.trim()) return;
    const nextTool: ToolItem = {
      id: `tool_${Date.now()}`,
      title: draft.title.trim(),
      desc: draft.desc.trim(),
      size: draft.size,
      theme: draft.theme,
      icon: draft.icon
    };
    updateTools([...tools, nextTool]);
    setDraft({
      title: '',
      desc: '',
      size: 'sm',
      theme: 'indigo',
      icon: 'timer'
    });
  };

  const updateTool = (id: string, patch: Partial<ToolItem>) => {
    updateTools(
      tools.map((tool) => (tool.id === id ? { ...tool, ...patch } : tool))
    );
  };

  const removeTool = (id: string) => {
    updateTools(tools.filter((tool) => tool.id !== id));
  };

  return (
    <div className="min-h-screen relative overflow-hidden px-6 py-10 text-white">
      <div className="absolute inset-0 z-0 bg-[#0b0c10]" />
      <div className="absolute -top-40 left-1/2 z-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-[#6c56e8]/30 via-[#1f2b58]/20 to-transparent blur-3xl" />
      <div className="absolute top-1/3 -left-28 z-0 h-[360px] w-[360px] rounded-full bg-gradient-to-br from-[#c472ff]/20 via-[#2a1a3b]/10 to-transparent blur-3xl" />
      <div className="absolute bottom-0 right-0 z-0 h-[420px] w-[420px] translate-x-1/3 translate-y-1/4 rounded-full bg-gradient-to-br from-[#39d5ff]/20 via-[#0f2b3f]/20 to-transparent blur-3xl" />
      {state.profile.lockBackground && (
        <div className="pointer-events-none absolute inset-0 z-[1] opacity-40 mix-blend-soft-light">
          <div
            className="h-full w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${state.profile.lockBackground})` }}
          />
        </div>
      )}

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setView('lock')}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white shadow-lg shadow-black/30 transition-all hover:bg-white/20 active:scale-95"
              aria-label="返回"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-black tracking-wide">工具箱</h1>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/50">Toolbox</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsManageMode((prev) => !prev)}
              className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-semibold tracking-widest shadow-lg shadow-black/30 transition-all hover:bg-white/20 active:scale-95 ${
                isManageMode ? 'bg-white/20 text-white' : 'bg-white/10 text-white/80'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              管理工具
            </button>
          </div>
        </header>

        <div className="grid grid-flow-row-dense grid-cols-2 auto-rows-[110px] gap-4 sm:auto-rows-[130px] sm:gap-6">
          {sortedTools.map((tool) => {
            const size = TOOL_SIZES[tool.size];
            const Icon = ICONS[tool.icon];
            return (
              <section
                key={tool.id}
                className={`relative h-full overflow-hidden rounded-[28px] bg-gradient-to-br ${TOOL_THEMES[tool.theme]} ${size.rowSpan} ${size.padding} shadow-xl shadow-black/40`}
              >
                <div className="absolute -right-10 top-10 h-24 w-24 rounded-[24px] bg-white/10 blur-2xl" />
                <div className="relative z-10 flex h-full flex-col justify-between gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className={`${size.title} font-semibold tracking-wide leading-snug break-words line-clamp-2`}>
                        {tool.title}
                      </h3>
                      <p className={`mt-2 ${size.desc} text-white/60 leading-snug break-words line-clamp-2`}>
                        {tool.desc}
                      </p>
                    </div>
                    <Icon className="h-6 w-6 text-white/70" />
                  </div>

                  {tool.size !== 'sm' && (
                    <div className="flex items-center justify-between text-xs text-white/60">
                      <span className="rounded-full bg-white/15 px-3 py-1 font-semibold tracking-widest text-white/80">
                        进入
                      </span>
                    </div>
                  )}

                  {isManageMode && (
                    <div className="flex items-center gap-2 text-[10px] text-white/60">
                      <span className="rounded-full bg-white/15 px-2 py-1">ID</span>
                      <span className="truncate">{tool.id}</span>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        {isManageMode && (
          <section className="rounded-[28px] bg-white/5 p-6 shadow-xl shadow-black/40">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">工具管理</h2>
                <p className="text-xs text-white/60">可添加、删除、维护并拓展工具卡片</p>
              </div>
              <button
                onClick={() => setAmbientVolume(Math.min(1, ambientVolume + 0.1))}
                className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white/70"
              >
                环境音量 +10%
              </button>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr_0.7fr_0.7fr_0.7fr_auto]">
              <input
                value={draft.title}
                onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                onKeyDown={handleTypingSound}
                placeholder="工具名称"
                className="w-full rounded-2xl bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              <input
                value={draft.desc}
                onChange={(e) => setDraft((prev) => ({ ...prev, desc: e.target.value }))}
                onKeyDown={handleTypingSound}
                placeholder="描述"
                className="w-full rounded-2xl bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              <select
                value={draft.size}
                onChange={(e) => setDraft((prev) => ({ ...prev, size: e.target.value as ToolSize }))}
                className="w-full rounded-2xl bg-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                {SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size} className="text-black">
                    {size.toUpperCase()}
                  </option>
                ))}
              </select>
              <select
                value={draft.theme}
                onChange={(e) => setDraft((prev) => ({ ...prev, theme: e.target.value as ToolItem['theme'] }))}
                className="w-full rounded-2xl bg-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                {THEME_OPTIONS.map((theme) => (
                  <option key={theme} value={theme} className="text-black">
                    {theme}
                  </option>
                ))}
              </select>
              <select
                value={draft.icon}
                onChange={(e) => setDraft((prev) => ({ ...prev, icon: e.target.value as ToolItem['icon'] }))}
                className="w-full rounded-2xl bg-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                {ICON_OPTIONS.map((icon) => (
                  <option key={icon} value={icon} className="text-black">
                    {icon}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddTool}
                className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition-all hover:bg-white/90 active:scale-95"
              >
                添加
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {tools.map((tool) => (
                <div
                  key={tool.id}
                  className="grid items-center gap-3 rounded-2xl bg-white/5 p-4 text-sm text-white/80 lg:grid-cols-[1.2fr_1.2fr_0.6fr_0.6fr_0.6fr_auto]"
                >
                  <input
                    value={tool.title}
                    onChange={(e) => updateTool(tool.id, { title: e.target.value })}
                    onKeyDown={handleTypingSound}
                    className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                  <input
                    value={tool.desc}
                    onChange={(e) => updateTool(tool.id, { desc: e.target.value })}
                    onKeyDown={handleTypingSound}
                    className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                  <select
                    value={tool.size}
                    onChange={(e) => updateTool(tool.id, { size: e.target.value as ToolSize })}
                    className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                  >
                    {SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size} className="text-black">
                        {size.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <select
                    value={tool.theme}
                    onChange={(e) =>
                      updateTool(tool.id, { theme: e.target.value as ToolItem['theme'] })
                    }
                    className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                  >
                    {THEME_OPTIONS.map((theme) => (
                      <option key={theme} value={theme} className="text-black">
                        {theme}
                      </option>
                    ))}
                  </select>
                  <select
                    value={tool.icon}
                    onChange={(e) => updateTool(tool.id, { icon: e.target.value as ToolItem['icon'] })}
                    className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                  >
                    {ICON_OPTIONS.map((icon) => (
                      <option key={icon} value={icon} className="text-black">
                        {icon}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeTool(tool.id)}
                    className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white/70 transition-all hover:bg-white/20 active:scale-95"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
