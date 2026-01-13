
import { AppState } from '../types';
import { STORAGE_KEY } from '../constants';

export const getDefaultState = (): AppState => ({
  profile: {
    name: '',
    cutoff: '23:00',
    missDaysThreshold: 2,
    supervisorName: '',
    supervisorContact: '',
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
    lastSupervisorSuggestDate: null
  }
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
