import React, { useEffect, useState } from 'react';
import { ArrowLeft, ChevronDown, Heart, Info } from 'lucide-react';
import { ViewType, UpdateMetadata } from '../types';

interface UpdateLogEntry {
  version: string;
  date?: string;
  summary?: string;
  highlights?: string[];
  detail?: string;
  updateLink?: string;
}

const FALLBACK_UPDATE_LOGS: UpdateLogEntry[] = [
  {
    version: 'v1.4.0',
    date: '2026-01-13',
    summary: '优化仪表盘性能、展开打卡统计与AI审计细节',
    highlights: [
      '支持实时手动导出与导入，兼容更多数据迁移需求',
      '新增仪表盘与锁屏背景预设，细化视觉模糊与透明度控制',
      'AI审计加入超额提醒与日志归档输出'
    ],
    updateLink: 'https://github.com/xueleme/releases/v1.4.0'
  },
  {
    version: 'v1.3.2',
    date: '2025-12-28',
    summary: '修复了任务切换状态与自定义背景上传的兼容性问题',
    highlights: [
      '解决任务状态切换在深色模式下的视觉异常',
      '调整背景上传流程，避免大图造成本卡顿'
    ],
    updateLink: 'https://github.com/xueleme/releases/v1.3.2'
  },
  {
    version: 'v1.3.0',
    date: '2025-11-20',
    summary: '推送“真人监管”与“AI智能审计”功能，打通提醒与督促闭环',
    highlights: [
      '新增监管人配置模块，可自定义QQ邮箱与提醒频率',
      'AI审计报表可生成并分享给监管人，提升复盘能力'
    ],
    updateLink: 'https://github.com/xueleme/releases/v1.3.0'
  }
];

const LOCAL_UPDATE_MANIFEST_URL = '/xueleme.json';

const parseUpdateLogsFromDescription = (description: string, downloadUrl?: string): UpdateLogEntry[] => {
  if (!description) return [];
  const [, logSection] = description.split(/<b>更新日志[:：]<\/b>/i);
  if (!logSection) return [];
  const regex = /<b>(v[\d.]+)[^<]*<\/b>([\s\S]*?)(?=(<b>v[\d.]+[^<]*<\/b>)|$)/gi;
  const matches = Array.from(logSection.matchAll(regex));
  return matches
    .map((match) => ({
      version: match[1].trim(),
      detail: match[2].replace(/<br\s*\/?>/gi, '\n').trim(),
      updateLink: downloadUrl
    }))
    .filter(entry => !!entry.detail);
};

const acknowledgements = [
  '感谢每一位贡献反馈的学习监督者与设定体验的同伴。',
  '感谢 React、Vite 与 Tailwind 提供的工具链，让界面流畅而自由。',
  '特别致谢 Codex 与 Gemini，帮助强化交互与智能分析体验。'
];

const dependencies = [
  { name: 'React', version: '18.3.x' },
  { name: 'Vite', version: '5.x' },
  { name: 'lucide-react', version: '0.330.0' },
  { name: 'ECharts', version: '5.4.x' }
];

export const AboutScreen: React.FC<{
  setView: (view: ViewType) => void;
  showToast: (title: string, desc?: string) => void;
}> = ({ setView, showToast }) => {
  const [updateLogs, setUpdateLogs] = useState<UpdateLogEntry[]>(FALLBACK_UPDATE_LOGS);
  const [showUpdateLogs, setShowUpdateLogs] = useState(false);
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({});
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [updateMeta, setUpdateMeta] = useState<UpdateMetadata | null>(null);

  useEffect(() => {
    let mounted = true;
    let intervalId: number | null = null;

    const hydrateMetadata = (meta: UpdateMetadata) => {
      setUpdateMeta(meta);
      const parsed = parseUpdateLogsFromDescription(meta.description ?? '', meta.downloadUrl);
      if (parsed.length) {
        setUpdateLogs(parsed);
      } else {
        setUpdateLogs([
          {
            version: meta.versionName,
            detail: (meta.description ?? '').replace(/<br\s*\/?>/gi, '\n').trim(),
            updateLink: meta.downloadUrl
          }
        ]);
      }
    };

    const fetchBridgeMetadata = async () => {
      const bridge = window.DxxSystem;
      if (!bridge?.getUpdateLog) return false;
      if (mounted) setLoadingLogs(true);
      try {
        const meta = await bridge.getUpdateLog();
        if (!mounted) return true;
        hydrateMetadata(meta);
      } catch (error) {
        console.warn('无法通过 DxxSystem 获取更新摘要', error);
      } finally {
        if (mounted) setLoadingLogs(false);
      }
      return true;
    };


    const ensureBridge = async () => {
      const ready = await fetchBridgeMetadata();
      if (ready && intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (!ready && mounted) {
        intervalId = window.setInterval(async () => {
          const readyNow = await fetchBridgeMetadata();
          if (readyNow && intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }, 250);
      }
    };

    ensureBridge();

    return () => {
      mounted = false;
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }, []);

  const handleSponsor = () => {
    const bridge = (window as Window & { DxxSystem?: { openSponsor?: () => void } }).DxxSystem;
    if (bridge?.openSponsor) {
      bridge.openSponsor();
      return;
    }
    window.open('https://link3.cc/liu13', '_blank');
  };

  const handleCheckUpdates = async () => {
    const bridge = window.DxxSystem;
    if (!bridge?.checkUpdate) {
      showToast('更新服务尚未就绪', '请稍后再试');
      return;
    }
    try {
      await bridge.checkUpdate();
    } catch (error) {
      console.error(error);
      showToast('检查更新失败', '请稍后再试');
    }
  };

  return (
    <div className="relative transition-colors duration-500">
      <div className="relative z-10 pb-24 text-gray-900 dark:text-gray-100">
        <header className="sticky top-0 z-50 glass border-b dark:border-white/5 border-black/5 px-4 py-4 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button
              onClick={() => setView('dashboard')}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
              aria-label="返回仪表盘"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-xl">关于</h1>
            <p className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
              应用版本与依赖信息
              </p>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto p-6 space-y-6">
             <section className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowUpdateLogs(prev => !prev)}
                className="flex items-center gap-2 text-xl font-black tracking-tight text-gray-900 dark:text-white"
              >
                <span>应用版本</span>
                <ChevronDown className={`w-5 h-5 transition-transform ${showUpdateLogs ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={handleCheckUpdates}
                className="text-xs font-black uppercase tracking-wider text-indigo-600 border border-indigo-500/40 px-3 py-1 rounded-full hover:bg-indigo-50 dark:hover:bg-white/10 transition"
              >
                检查更新
              </button>
            </div>
            {updateMeta && (
              <p className="text-xs text-gray-500">
                最新版本 {updateMeta.versionName} · {updateMeta.updateTime ?? '更新时间未知'}
              </p>
            )}
            {showUpdateLogs && (
              <div className="relative space-y-6 pl-8">
                <span className="pointer-events-none absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-300 via-indigo-200 to-transparent dark:from-indigo-500/70" />
                {loadingLogs && <p className="text-xs text-gray-500">正在加载更新日志...</p>}
                {updateLogs.map((log) => {
                  const isOpen = expandedVersions[log.version] ?? false;
                  const detailLines = log.detail?.split('\n').map(line => line.trim()).filter(Boolean) ?? [];
                  return (
                    <div
                      key={log.version}
                      className="relative rounded-3xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 p-5 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5"
                    >
                      <span className="absolute -left-1.5 top-5 inline-flex h-3.5 w-3.5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 ring-4 ring-white/80 dark:ring-slate-900" />
                      <div className="flex flex-col gap-1">
                        {log.date && (
                          <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400">
                            {log.date}
                          </p>
                        )}
                        <p className="text-lg font-black text-gray-900 dark:text-white">{log.version}</p>
                        {log.summary && (
                          <p className="text-sm text-gray-600 dark:text-gray-300">{log.summary}</p>
                        )}
                      </div>
                      {log.highlights && log.highlights.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {log.highlights.map((item, index) => (
                            <span
                              key={`${log.version}-highlight-${index}`}
                              className="rounded-full bg-indigo-50/80 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {log.updateLink && (
                          <button
                            onClick={() => window.open(log.updateLink, '_blank')}
                            className="px-3 py-1.5 text-xs font-bold uppercase rounded-full border border-indigo-500 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-white/10 transition"
                          >
                            下载
                          </button>
                        )}
                        <button
                          onClick={() =>
                            setExpandedVersions(prev => ({
                              ...prev,
                              [log.version]: !isOpen
                            }))
                          }
                          className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-300 transition"
                        >
                          <span>{isOpen ? '收起详情' : '查看详情'}</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                      <div
                        className={`mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300 overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-80' : 'max-h-0'}`}
                      >
                        {detailLines.map((line, index) => (
                          <p key={`${log.version}-${index}`}>{line}</p>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
          <section className="glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-gray-500">
              <Info className="w-4 h-4" />
              <h2 className="text-lg font-bold">功能介绍</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              学了么整合日常打卡、任务与监督机制，帮助你把焦虑变成可执行的行动，结合 AI 审计赋予每次复盘可感知的成长反馈。
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• 智能规划明日计划并自动延后未完成任务，按需调整优先级。</li>
              <li>• 监督人系统打通提醒闭环，支持自定义联系邮箱和发送频率。</li>
              <li>• 主题与背景实验室支持上传、随机刷新以及模糊与透明度微调。</li>
              <li>• AI 报告提供文字分析，可复制粘贴发送给监督者或同伴，强化复盘质感。</li>
            </ul>
          </section>

          <section className="glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-gray-500">
              <span className="text-2xl font-bold text-indigo-600">隐私条款</span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              所有学习数据仅保存在本地浏览器存储中，不会自动同步或上传到远端。上传的背景图像也只存在于你当前设备，除非主动导出备份，否则不会传输出去。
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              若需清除数据，可以在设置中点击“清空所有数据”。监督人提醒会唤起默认邮件客户端（QQ 邮箱或浏览器），仅发送你填写的内容。
            </p>
          </section>

          <section className="glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">赞助我们</h2>
              </div>
              <button
                onClick={handleSponsor}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-black rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/30 hover:opacity-90 transition active:scale-[0.97]"
              >
                <Heart className="w-3 h-3" />
                <span>赞助支持</span>
              </button>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              感谢你的支持，赞助会帮助我们继续保持内容更新与工具研发，拾起更多创意与结构化的督促体验。
            </p>
          </section>

       

          <section className="glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-gray-500">
              <h2 className="text-lg font-bold">致谢与依赖</h2>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              {acknowledgements.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {dependencies.map((dep) => (
                <div key={dep.name} className="p-3 rounded-xl bg-black/5 dark:bg-white/5">
                  <p className="font-bold">{dep.name}</p>
                  <p className="text-xs text-gray-500">版本 {dep.version}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};
