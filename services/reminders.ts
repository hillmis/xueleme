import { AppState, Supervisor, SupervisorReminderItem, SupervisorReminderType } from '../types';

const DEFAULT_SENDER_EMAIL = 'hillmis@qq.com';
const DEFAULT_SENDER_NAME = '学了么监督系统';

const getDateKey = (date: Date) => date.toISOString().slice(0, 10);

const parseTimeOnDate = (date: Date, timeStr: string) => {
  const [h, m] = timeStr.split(':').map(Number);
  const next = new Date(date);
  next.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return next;
};

const getWeekId = (date: Date) => {
  const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((temp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${temp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

const daysBetween = (from: Date, to: Date) => {
  const utcFrom = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const utcTo = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.floor((utcTo - utcFrom) / 86400000);
};

const formatSupervisorEmail = (
  state: AppState,
  supervisor: Supervisor,
  type: SupervisorReminderType,
  now: Date,
  reason: string,
  details: string,
  suggestion: string
) => {
  const senderEmail = state.profile.supervisorSenderEmail || DEFAULT_SENDER_EMAIL;
  const senderName = state.profile.supervisorSenderName || DEFAULT_SENDER_NAME;
  const studentName = state.profile.name || '学霸';
  const nowStr = now.toLocaleString('zh-CN', { hour12: false });

  const subjectPrefix = type === 'weekly_report' ? '周报' : '提醒';
  const subject = `【学了么${subjectPrefix}】${studentName}学习进展`;

  const body = [
    `${supervisor.name || '监督人'}你好：`,
    '',
    `这里是${senderName}（发送账号：${senderEmail}）。我正在协助监督【${studentName}】的学习进展。`,
    '',
    `【提醒对象】${studentName}`,
    `【提醒原因】${reason}`,
    `【当前时间】${nowStr}`,
    '',
    details,
    '',
    `如果你方便，可以给${studentName}一条温柔但坚定的鼓励：`,
    `“${suggestion}”`,
    '',
    `感谢你的陪伴与监督。`,
    `— ${senderName}`
  ].join('\n');

  return { subject, body };
};

const getWeeklyStats = (state: AppState, now: Date) => {
  const start = new Date(now);
  start.setDate(start.getDate() - 6);
  const startKey = getDateKey(start);
  const checkins = Object.values(state.checkins);
  const recentCheckins = checkins.filter(c => c.date >= startKey);
  const totalMinutes = recentCheckins.reduce((acc, curr) => acc + (curr.minutes || 0), 0);

  const tasks = Object.values(state.tasks);
  const doneTasks = tasks.filter(t => t.status === 'done');
  const overdueTasks = tasks.filter(t => t.status === 'todo' && t.dueDate && t.dueDate <= getDateKey(now));

  return {
    recentCheckins,
    totalMinutes,
    doneTasks,
    tasks,
    overdueTasks
  };
};

export const getPendingSupervisorReminders = (state: AppState, now = new Date()): SupervisorReminderItem[] => {
  const settings = state.profile.supervisorReminderSettings;
  const supervisors = (state.profile.supervisors || []).filter(s => s.enabled && s.email);
  if (!settings || supervisors.length === 0) return [];

  const todayKey = getDateKey(now);
  const cutoffTime = parseTimeOnDate(now, state.profile.cutoff || '23:00');
  const isAfterCutoff = now >= cutoffTime;
  const hasTodayCheckin = !!state.checkins[todayKey];
  const lastCheckinDate = state.profile.lastCheckinDate ? new Date(state.profile.lastCheckinDate) : null;
  const daysSinceLast = lastCheckinDate ? daysBetween(lastCheckinDate, now) : null;

  const { totalMinutes, tasks, doneTasks, overdueTasks, recentCheckins } = getWeeklyStats(state, now);
  const doneRate = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  const weeklyReportDay = settings.weeklyReportDay ?? 0;
  const weeklyReportTime = settings.weeklyReportTime || '20:30';
  const weeklyReady = now.getDay() === weeklyReportDay && now >= parseTimeOnDate(now, weeklyReportTime);
  const weekId = getWeekId(now);

  const pending: SupervisorReminderItem[] = [];

  supervisors.forEach(supervisor => {
    const log = state.runtime.supervisorReminderLog?.[supervisor.id] || {};

    if (settings.dailyCutoffReminderEnabled && isAfterCutoff && !hasTodayCheckin && log.lastDailyCutoff !== todayKey) {
      const reason = `今日已过截止时间（${state.profile.cutoff}），仍未打卡`;
      const details = [
        `今日尚未完成打卡，建议温和提醒其完成今天的学习闭环。`,
        `本周累计学习：${(totalMinutes / 60).toFixed(1)}h，任务完成率：${doneRate}%`
      ].join('\n');
      const suggestion = '今天也辛苦了，别忘了打卡收个尾，我在等你的好消息。';
      const { subject, body } = formatSupervisorEmail(state, supervisor, 'daily_cutoff', now, reason, details, suggestion);
      pending.push({
        id: `${supervisor.id}_daily_cutoff_${todayKey}`,
        type: 'daily_cutoff',
        supervisorId: supervisor.id,
        supervisorName: supervisor.name,
        to: supervisor.email,
        subject,
        body,
        reason,
        scheduledFor: todayKey
      });
    }

    if (settings.missedDaysReminderEnabled && isAfterCutoff && daysSinceLast !== null && daysSinceLast >= state.profile.missDaysThreshold && log.lastMissedDays !== todayKey) {
      const lastDate = state.profile.lastCheckinDate || '暂无';
      const reason = `已连续${daysSinceLast}天未打卡（上次：${lastDate}）`;
      const details = [
        `可能出现学习节奏中断，需要更有温度的关心与提醒。`,
        `本周累计学习：${(totalMinutes / 60).toFixed(1)}h，任务完成率：${doneRate}%`
      ].join('\n');
      const suggestion = '你最近是不是有点累？我陪你一起把节奏找回来。今天要不要先从15分钟开始？';
      const { subject, body } = formatSupervisorEmail(state, supervisor, 'missed_days', now, reason, details, suggestion);
      pending.push({
        id: `${supervisor.id}_missed_days_${todayKey}`,
        type: 'missed_days',
        supervisorId: supervisor.id,
        supervisorName: supervisor.name,
        to: supervisor.email,
        subject,
        body,
        reason,
        scheduledFor: todayKey
      });
    }

    if (settings.overdueTasksReminderEnabled && overdueTasks.length > 0 && isAfterCutoff && log.lastOverdueTasks !== todayKey) {
      const overdueList = overdueTasks.slice(0, 3).map(t => `- ${t.title}`).join('\n');
      const reason = `存在${overdueTasks.length}项逾期任务待处理`;
      const details = [
        `逾期任务示例：`,
        overdueList || '暂无具体任务',
        `本周任务完成率：${doneRate}%`
      ].join('\n');
      const suggestion = '把逾期任务拆成最小一步就好，我在这边给你兜底和鼓励。';
      const { subject, body } = formatSupervisorEmail(state, supervisor, 'overdue_tasks', now, reason, details, suggestion);
      pending.push({
        id: `${supervisor.id}_overdue_tasks_${todayKey}`,
        type: 'overdue_tasks',
        supervisorId: supervisor.id,
        supervisorName: supervisor.name,
        to: supervisor.email,
        subject,
        body,
        reason,
        scheduledFor: todayKey
      });
    }

    if (settings.weeklyReportEnabled && weeklyReady && log.lastWeeklyReport !== weekId) {
      const reason = '本周学习周报已生成';
      const details = [
        `本周学习天数：${recentCheckins.length}天`,
        `本周累计学习：${(totalMinutes / 60).toFixed(1)}h`,
        `任务完成率：${doneRate}%`,
        `逾期任务：${overdueTasks.length}项`
      ].join('\n');
      const suggestion = '这一周的努力看得见，告诉你：我为你感到骄傲，也会继续陪你冲刺。';
      const { subject, body } = formatSupervisorEmail(state, supervisor, 'weekly_report', now, reason, details, suggestion);
      pending.push({
        id: `${supervisor.id}_weekly_report_${weekId}`,
        type: 'weekly_report',
        supervisorId: supervisor.id,
        supervisorName: supervisor.name,
        to: supervisor.email,
        subject,
        body,
        reason,
        scheduledFor: weekId
      });
    }
  });

  return pending;
};
