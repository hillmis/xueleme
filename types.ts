
export interface CheckinRecord {
  date: string;
  minutes: number;
  note: string;
  at: string;
}

export interface Task {
  id: string;
  title: string;
  dueDate: string | null;
  desc: string;
  status: 'todo' | 'done';
  createdAt: string;
  doneAt: string | null;
}

export interface Profile {
  name: string;
  cutoff: string;
  missDaysThreshold: number;
  supervisors: Supervisor[];
  supervisorSenderEmail: string;
  supervisorSenderName: string;
  supervisorReminderSettings: SupervisorReminderSettings;
  lastCheckinDate: string | null;
  streak: number;
  theme: 'light' | 'dark';
  isSoundEnabled: boolean;
  lockBackground?: string;
  dashboardBackground?: string;
  lockBgBlur?: number;
  lockBgOpacity?: number;
  dashBgBlur?: number;
  dashBgOpacity?: number;
}

export interface RuntimeState {
  lastSelfRemindDate: null | string;
  lastSupervisorSuggestDate: null | string;
  supervisorReminderLog: SupervisorReminderLog;
}

export interface Supervisor {
  id: string;
  name: string;
  email: string;
  relation: string;
  enabled: boolean;
}

export type SupervisorReminderType = 'daily_cutoff' | 'missed_days' | 'overdue_tasks' | 'weekly_report';

export interface SupervisorReminderSettings {
  dailyCutoffReminderEnabled: boolean;
  overdueTasksReminderEnabled: boolean;
  missedDaysReminderEnabled: boolean;
  weeklyReportEnabled: boolean;
  weeklyReportDay: number;
  weeklyReportTime: string;
}

export interface SupervisorReminderLogEntry {
  lastDailyCutoff?: string | null;
  lastMissedDays?: string | null;
  lastOverdueTasks?: string | null;
  lastWeeklyReport?: string | null;
}

export type SupervisorReminderLog = Record<string, SupervisorReminderLogEntry>;

export interface SupervisorReminderItem {
  id: string;
  type: SupervisorReminderType;
  supervisorId: string;
  supervisorName: string;
  to: string;
  subject: string;
  body: string;
  reason: string;
  scheduledFor: string;
}

export type ToolSize = 'sm' | 'md' | 'lg';

export interface ToolItem {
  id: string;
  title: string;
  desc: string;
  size: ToolSize;
  theme: 'violet' | 'indigo' | 'blue' | 'teal' | 'orange' | 'pink' | 'navy';
  icon: 'timer' | 'focus' | 'video' | 'douyin' | 'study' | 'relax';
}

export interface AppState {
  profile: Profile;
  checkins: Record<string, CheckinRecord>;
  tasks: Record<string, Task>;
  runtime: RuntimeState;
  tools: ToolItem[];
}

export type ViewType = 'lock' | 'dashboard' | 'tools';
