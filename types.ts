
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
  supervisorName: string;
  supervisorContact: string;
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
}

export interface AppState {
  profile: Profile;
  checkins: Record<string, CheckinRecord>;
  tasks: Record<string, Task>;
  runtime: RuntimeState;
}

export type ViewType = 'lock' | 'dashboard' | 'tools';
