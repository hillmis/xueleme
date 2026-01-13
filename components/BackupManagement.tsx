import React from 'react';
import { ArrowLeft, Download, Upload } from 'lucide-react';
import { Profile } from '../types';

interface BackupManagementProps {
  profile: Profile;
  onBack: () => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const BackupManagement: React.FC<BackupManagementProps> = ({
  profile,
  onBack,
  onExport,
  onImport
}) => {
  const { dashboardBackground, dashBgBlur = 2, dashBgOpacity = 0.3 } = profile;

  return (
    <div className="relative transition-colors duration-500">
      {dashboardBackground && (
        <>
          <div
            className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-all duration-700"
            style={{
              backgroundImage: `url(${dashboardBackground})`,
              filter: `blur(${dashBgBlur}px)`,
              opacity: dashBgOpacity
            }}
          />
          <div className="fixed inset-0 z-[1] bg-white/20 dark:bg-black/30 backdrop-blur-[1px] pointer-events-none" />
        </>
      )}

      <div className="relative z-10 pb-24 text-gray-900 dark:text-gray-100">
        <header className="sticky top-0 z-50 glass border-b dark:border-white/5 border-black/5 px-4 py-4 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold italic text-lg">备份管理</h1>
              <p className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
                统一的导出 / 导入入口
              </p>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto p-6 space-y-6">
          <section className="glass rounded-3xl p-6 space-y-4">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
              备份概览
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              所有学习记录、任务、监督配置和自定义偏好都会被打包成一个 JSON 文件，便于跨设备迁移或手动备份。
              导出文件可由你自行保存，导入时会用选中文件直接覆盖当前数据，请先确认已备份最新状态。
            </p>
          </section>

          <section className="glass rounded-3xl p-6 space-y-6">
            <div className="space-y-3">
              <p className="text-sm text-gray-500 uppercase tracking-[0.2em]">操作入口</p>
              <div className="flex flex-col md:flex-row gap-3">
                <button
                  onClick={onExport}
                  className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-black flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/40 hover:shadow-indigo-500/60 transition-all"
                >
                  <Download className="w-5 h-5" />
                  导出当前备份
                </button>
                <label
                  className="flex-1 py-4 rounded-2xl border border-dashed border-indigo-500/40 text-indigo-600 font-black flex items-center justify-center gap-3 cursor-pointer transition-all hover:border-indigo-500"
                >
                  <Upload className="w-5 h-5" />
                  导入已有备份
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={onImport}
                  />
                </label>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              导入操作会立即替换当前本地存储，请确保目标文件来自可信来源，导出后可以保存至云盘或移动设备。
            </p>
          </section>
        </main>
      </div>
    </div>
  );
};
