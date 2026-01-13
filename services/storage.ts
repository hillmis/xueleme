
import { AppState, ToolItem } from '../types';
import { STORAGE_KEY } from '../constants';

const DEFAULT_TOOLS: ToolItem[] = [
  {
    id: 'tool_focus',
    title: '沉浸学习',
    desc: '进入深度专注状态',
    size: 'lg',
    theme: 'violet',
    icon: 'focus'
  },
  {
    id: 'tool_pomodoro',
    title: '番茄时钟',
    desc: '',
    size: 'sm',
    theme: 'orange',
    icon: 'timer'
  },
  {
    id: 'tool_relax_video',
    title: '放松视频',
    desc: '快速缓解疲劳',
    size: 'sm',
    theme: 'teal',
    icon: 'video'
  },
  {
    id: 'tool_douyin',
    title: '抖音精选',
    desc: '优质短内容',
    size: 'sm',
    theme: 'pink',
    icon: 'douyin'
  },
  {
    id: 'tool_study_room',
    title: '学习资料',
    desc: '整理课程与笔记',
    size: 'md',
    theme: 'navy',
    icon: 'study'
  },
  {
    id: 'tool_relax',
    title: '放松工具',
    desc: '冥想与呼吸引导',
    size: 'md',
    theme: 'blue',
    icon: 'relax'
  }
];

export const getDefaultState = (): AppState => ({
  profile: {
    name: '',
    cutoff: '23:00',
    missDaysThreshold: 2,
    supervisors: [],
    supervisorSenderEmail: 'hillmis@qq.com',
    supervisorSenderName: '学了么监督系统',
    supervisorReminderSettings: {
      dailyCutoffReminderEnabled: true,
      overdueTasksReminderEnabled: true,
      missedDaysReminderEnabled: true,
      weeklyReportEnabled: true,
      weeklyReportDay: 0,
      weeklyReportTime: '20:30'
    },
    lastCheckinDate: null,
    streak: 0,
    theme: 'dark',
    isSoundEnabled: true,
    lockBgBlur: 0,
    lockBgOpacity: 0.5,
    dashBgBlur: 2,
    dashBgOpacity: 0.3
  },
  checkins: {},
  tasks: {},
  runtime: {
    lastSelfRemindDate: null,
    lastSupervisorSuggestDate: null,
    supervisorReminderLog: {}
  },
  tools: DEFAULT_TOOLS
});

export const StorageService = {
  save: (state: AppState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },
  load: (): AppState => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    try {
      const data = JSON.parse(raw);
      // Ensure default values for new fields
      if (data.profile) {
        if (data.profile.theme === undefined) data.profile.theme = 'dark';
        if (data.profile.isSoundEnabled === undefined) data.profile.isSoundEnabled = true;
        if (data.profile.lockBgBlur === undefined) data.profile.lockBgBlur = 0;
        if (data.profile.lockBgOpacity === undefined) data.profile.lockBgOpacity = 0.5;
        if (data.profile.dashBgBlur === undefined) data.profile.dashBgBlur = 2;
        if (data.profile.dashBgOpacity === undefined) data.profile.dashBgOpacity = 0.3;
        if (!Array.isArray(data.profile.supervisors)) {
          const fallbackName = data.profile.supervisorName || '';
          const fallbackContact = data.profile.supervisorContact || '';
          const fallbackEmail = fallbackContact.includes('@') ? fallbackContact : '';
          data.profile.supervisors = fallbackName || fallbackEmail ? [{
            id: `sup_${Date.now()}`,
            name: fallbackName || '监督人',
            email: fallbackEmail,
            relation: '',
            enabled: true
          }] : [];
        }
        data.profile.supervisors = data.profile.supervisors.map((s: any) => ({
          id: s.id || `sup_${Date.now()}`,
          name: s.name || '',
          email: s.email || '',
          relation: s.relation || '',
          enabled: s.enabled !== false
        }));
        if (data.profile.supervisorSenderEmail === undefined) data.profile.supervisorSenderEmail = 'hillmis@qq.com';
        if (data.profile.supervisorSenderName === undefined) data.profile.supervisorSenderName = '学了么监督系统';
        if (!data.profile.supervisorReminderSettings) data.profile.supervisorReminderSettings = {};
        if (data.profile.supervisorReminderSettings.dailyCutoffReminderEnabled === undefined) data.profile.supervisorReminderSettings.dailyCutoffReminderEnabled = true;
        if (data.profile.supervisorReminderSettings.overdueTasksReminderEnabled === undefined) data.profile.supervisorReminderSettings.overdueTasksReminderEnabled = true;
        if (data.profile.supervisorReminderSettings.missedDaysReminderEnabled === undefined) data.profile.supervisorReminderSettings.missedDaysReminderEnabled = true;
        if (data.profile.supervisorReminderSettings.weeklyReportEnabled === undefined) data.profile.supervisorReminderSettings.weeklyReportEnabled = true;
        if (data.profile.supervisorReminderSettings.weeklyReportDay === undefined) data.profile.supervisorReminderSettings.weeklyReportDay = 0;
        if (data.profile.supervisorReminderSettings.weeklyReportTime === undefined) data.profile.supervisorReminderSettings.weeklyReportTime = '20:30';
      }
      if (!data.runtime) data.runtime = {};
      if (!data.runtime.supervisorReminderLog) data.runtime.supervisorReminderLog = {};
      if (!Array.isArray(data.tools) || data.tools.length === 0) {
        data.tools = DEFAULT_TOOLS;
      }
      return data;
    } catch {
      return getDefaultState();
    }
  },
  clear: () => {
    localStorage.removeItem(STORAGE_KEY);
  }
};
