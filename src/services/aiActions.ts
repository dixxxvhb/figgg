import { format, addDays } from 'date-fns';
import { getClassesByDay } from '../data/classes';
import { formatWeekOf, getWeekStart, getCurrentDayOfWeek } from '../utils/time';
import type { AIAction } from './ai';
import type {
  AppData,
  Class,
  SelfCareData,
  LaunchPlanData,
  DisruptionState,
  DayOfWeek,
  DayPlan,
  DayPlanItem,
  Reminder,
  WeekNotes,
  ClassWeekNotes,
  LiveNote,
  RehearsalNote,
  CompetitionDance,
  AIModification,
} from '../types';

const VALID_CATEGORIES = new Set(['task', 'wellness', 'class', 'launch', 'break', 'med']);
const VALID_PRIORITIES = new Set(['high', 'medium', 'low']);

export interface ActionCallbacks {
  getData: () => AppData;
  updateSelfCare: (updates: Partial<SelfCareData>) => void;
  saveDayPlan: (plan: DayPlan) => void;
  saveWeekNotes: (weekNote: WeekNotes) => void;
  getCurrentWeekNotes: () => WeekNotes;
  updateLaunchPlan: (updates: Partial<LaunchPlanData>) => void;
  updateCompetitionDance: (dance: CompetitionDance) => void;
  updateDisruption: (disruption: DisruptionState | undefined) => void;
  getMedConfig: () => { medType: string; maxDoses: number };
  // Class schedule editing
  updateClass?: (updatedClass: Class) => void;
  addClass?: (newClass: Omit<Class, 'id'>) => Class;
  // Modification logging
  logModification?: (mod: AIModification) => void;
}

export function executeAIActions(actions: AIAction[], callbacks: ActionCallbacks): void {
  if (!actions || actions.length === 0) return;

  const data = callbacks.getData();
  const sc = data.selfCare || {};

  // Helper to log AI modifications
  const logMod = (action: AIAction, description: string) => {
    if (callbacks.logModification) {
      callbacks.logModification({
        id: `aimod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        actionType: action.type,
        description,
      });
    }
  };
  const medConfig = callbacks.getMedConfig();
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  let selfCareUpdates: Record<string, unknown> = {};
  let needsSelfCareUpdate = false;
  let planUpdated = false;
  let currentPlan = data.dayPlan?.date === todayKey ? { ...data.dayPlan } : null;

  for (const action of actions) {
    switch (action.type) {
      case 'toggleWellness': {
        if (!action.id) break;
        const currentStates = sc.unifiedTaskDate === todayKey ? (sc.unifiedTaskStates || {}) : {};
        selfCareUpdates = {
          ...selfCareUpdates,
          unifiedTaskStates: { ...currentStates, ...((selfCareUpdates.unifiedTaskStates as Record<string, boolean>) || {}), [action.id]: action.done ?? true },
          unifiedTaskDate: todayKey,
        };
        needsSelfCareUpdate = true;
        logMod(action, `Toggled wellness "${action.id}" → ${action.done ?? true ? 'done' : 'undone'}`);
        break;
      }
      case 'addReminder': {
        if (!action.title) break;
        const baseReminders = (selfCareUpdates.reminders as Reminder[]) || [...(sc.reminders || [])];
        const defaultListId = (sc.reminderLists || []).find((l: { name: string }) => l.name === 'Reminders')?.id || 'inbox';
        const newReminder: Reminder = {
          id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: action.title,
          listId: defaultListId,
          completed: false,
          priority: 'none',
          flagged: action.flagged ?? false,
          dueDate: action.dueDate,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        selfCareUpdates.reminders = [...baseReminders, newReminder];
        needsSelfCareUpdate = true;
        logMod(action, `Added reminder "${action.title}"${action.dueDate ? ` due ${action.dueDate}` : ''}`);
        break;
      }
      case 'completeReminder': {
        if (!action.title) break;
        const reminders = (selfCareUpdates.reminders as Reminder[]) || [...(sc.reminders || [])];
        const idx = reminders.findIndex((r: Reminder) => !r.completed && r.title.toLowerCase() === action.title!.toLowerCase());
        if (idx >= 0) {
          reminders[idx] = { ...reminders[idx], completed: true, completedAt: new Date().toISOString() };
          selfCareUpdates.reminders = reminders;
          needsSelfCareUpdate = true;
          logMod(action, `Completed reminder "${action.title}"`);
        }
        break;
      }
      case 'flagReminder': {
        if (!action.title) break;
        const flagReminders = (selfCareUpdates.reminders as Reminder[]) || [...(sc.reminders || [])];
        const flagIdx = flagReminders.findIndex((r: Reminder) => r.title.toLowerCase() === action.title!.toLowerCase());
        if (flagIdx >= 0) {
          flagReminders[flagIdx] = { ...flagReminders[flagIdx], flagged: action.flagged ?? true, updatedAt: new Date().toISOString() };
          selfCareUpdates.reminders = flagReminders;
          needsSelfCareUpdate = true;
          logMod(action, `Flagged reminder "${action.title}"`);
        }
        break;
      }
      case 'rescheduleReminder': {
        if (!action.title || !action.dueDate) break;
        const reschedReminders = (selfCareUpdates.reminders as Reminder[]) || [...(sc.reminders || [])];
        const reschedIdx = reschedReminders.findIndex((r: Reminder) => r.title.toLowerCase() === action.title!.toLowerCase());
        if (reschedIdx >= 0) {
          reschedReminders[reschedIdx] = { ...reschedReminders[reschedIdx], dueDate: action.dueDate, updatedAt: new Date().toISOString() };
          selfCareUpdates.reminders = reschedReminders;
          needsSelfCareUpdate = true;
          logMod(action, `Rescheduled reminder "${action.title}" → ${action.dueDate}`);
        }
        break;
      }
      case 'logDose': {
        const now = Date.now();
        let doseNum = '';
        if (!sc.dose1Date || sc.dose1Date !== todayKey) {
          selfCareUpdates = { ...selfCareUpdates, dose1Time: now, dose1Date: todayKey, selfCareModified: new Date().toISOString() };
          doseNum = '1';
        } else if (medConfig.medType === 'IR' && (!sc.dose2Date || sc.dose2Date !== todayKey)) {
          selfCareUpdates = { ...selfCareUpdates, dose2Time: now, dose2Date: todayKey, selfCareModified: new Date().toISOString() };
          doseNum = '2';
        } else if (medConfig.medType === 'IR' && medConfig.maxDoses === 3 && (!sc.dose3Date || sc.dose3Date !== todayKey)) {
          selfCareUpdates = { ...selfCareUpdates, dose3Time: now, dose3Date: todayKey, selfCareModified: new Date().toISOString() };
          doseNum = '3';
        }
        needsSelfCareUpdate = true;
        if (doseNum) logMod(action, `Logged dose ${doseNum}`);
        break;
      }
      case 'skipDose': {
        selfCareUpdates = { ...selfCareUpdates, skippedDoseDate: todayKey, selfCareModified: new Date().toISOString() };
        needsSelfCareUpdate = true;
        logMod(action, 'Skipped dose for today');
        break;
      }
      case 'updatePlanSummary': {
        if (!action.summary || !currentPlan) break;
        currentPlan = { ...currentPlan, summary: action.summary };
        planUpdated = true;
        logMod(action, `Updated plan summary`);
        break;
      }
      case 'addPlanItem': {
        if (!action.title || !currentPlan) break;
        const newItem: DayPlanItem = {
          id: `plan_ai_${Date.now()}`,
          title: action.title,
          category: (action.category && VALID_CATEGORIES.has(action.category) ? action.category : 'task') as DayPlanItem['category'],
          completed: false,
          priority: (action.priority && VALID_PRIORITIES.has(action.priority) ? action.priority : 'medium') as DayPlanItem['priority'],
          time: action.time,
          aiNote: action.aiNote,
          sourceId: action.sourceId,
        };
        currentPlan = { ...currentPlan, items: [...currentPlan.items, newItem] };
        planUpdated = true;
        logMod(action, `Added plan item "${action.title}"`);
        break;
      }
      case 'removePlanItem': {
        if (!action.title || !currentPlan) break;
        const needle = action.title.toLowerCase();
        // Prefer exact match, fall back to substring match for a single item
        const exactIdx = currentPlan.items.findIndex(i => i.title.toLowerCase() === needle);
        if (exactIdx >= 0) {
          currentPlan = { ...currentPlan, items: currentPlan.items.filter((_, idx) => idx !== exactIdx) };
        } else {
          const fuzzyIdx = currentPlan.items.findIndex(i => i.title.toLowerCase().includes(needle));
          if (fuzzyIdx >= 0) {
            currentPlan = { ...currentPlan, items: currentPlan.items.filter((_, idx) => idx !== fuzzyIdx) };
          }
        }
        planUpdated = true;
        logMod(action, `Removed plan item "${action.title}"`);
        break;
      }
      case 'reschedulePlanItem': {
        if (!action.title || !action.time || !currentPlan) break;
        const rNeedle = action.title.toLowerCase();
        const exactIdx = currentPlan.items.findIndex(i => i.title.toLowerCase() === rNeedle);
        const rIdx = exactIdx >= 0
          ? exactIdx
          : currentPlan.items.findIndex(i => i.title.toLowerCase().includes(rNeedle));
        if (rIdx >= 0) {
          const updated = [...currentPlan.items];
          updated[rIdx] = { ...updated[rIdx], time: action.time };
          currentPlan = { ...currentPlan, items: updated };
          planUpdated = true;
          logMod(action, `Rescheduled "${action.title}" → ${action.time}`);
        }
        break;
      }
      case 'batchToggleWellness': {
        if (!action.ids || action.ids.length === 0) break;
        const batchStates = sc.unifiedTaskDate === todayKey ? (sc.unifiedTaskStates || {}) : {};
        const merged = { ...batchStates, ...((selfCareUpdates.unifiedTaskStates as Record<string, boolean>) || {}) };
        for (const wId of action.ids) {
          merged[wId] = action.done ?? true;
        }
        selfCareUpdates = {
          ...selfCareUpdates,
          unifiedTaskStates: merged,
          unifiedTaskDate: todayKey,
        };
        needsSelfCareUpdate = true;
        logMod(action, `Batch toggled ${action.ids.length} wellness items`);
        break;
      }
      case 'suggestOptionalDose3': {
        selfCareUpdates = { ...selfCareUpdates, suggestedDose3Date: todayKey };
        needsSelfCareUpdate = true;
        logMod(action, 'Suggested optional dose 3');
        break;
      }
      case 'setDayMode': {
        if (!action.dayMode) break;
        selfCareUpdates = { ...selfCareUpdates, dayMode: action.dayMode, dayModeDate: todayKey };
        needsSelfCareUpdate = true;
        logMod(action, `Set day mode → ${action.dayMode}`);
        break;
      }
      case 'addWeekReflection': {
        const weekOf = formatWeekOf(getWeekStart());
        const existing = data.weekNotes.find(w => w.weekOf === weekOf);
        const weekNote: WeekNotes = existing || { id: `week_${weekOf}`, weekOf, classNotes: {} };
        weekNote.reflection = {
          date: todayKey,
          wentWell: action.wentWell,
          challenges: action.challenges,
          nextWeekFocus: action.nextWeekFocus,
          aiSummary: action.aiSummary,
        };
        callbacks.saveWeekNotes(weekNote);
        logMod(action, `Added week reflection`);
        break;
      }
      case 'reprioritizePlan': {
        if (!action.order || !currentPlan) break;
        const orderMap = new Map(action.order.map((id, idx) => [id, idx]));
        currentPlan = {
          ...currentPlan,
          items: [...currentPlan.items].sort((a, b) => {
            const aIdx = orderMap.get(a.id) ?? 999;
            const bIdx = orderMap.get(b.id) ?? 999;
            return aIdx - bIdx;
          }),
        };
        planUpdated = true;
        logMod(action, `Reprioritized plan items`);
        break;
      }

      // ── Class Exceptions ────────────────────────────────────────────────
      case 'markClassException': {
        if (!action.exceptionType) break;
        const dayName = getCurrentDayOfWeek();
        const todayClasses = getClassesByDay(callbacks.getData().classes, dayName);
        const targetIds = action.scope === 'specific' && action.classIds?.length
          ? action.classIds
          : todayClasses.map(c => c.id);
        if (targetIds.length === 0) break;
        const exWeekNotes = callbacks.getCurrentWeekNotes();
        for (const classId of targetIds) {
          const existing: ClassWeekNotes = exWeekNotes.classNotes[classId] || {
            classId, plan: '', liveNotes: [], isOrganized: false,
          };
          exWeekNotes.classNotes[classId] = {
            ...existing,
            exception: {
              type: action.exceptionType,
              ...(action.subName ? { subName: action.subName } : {}),
              ...(action.reason ? { reason: action.reason as 'sick' | 'personal' | 'holiday' | 'other' } : {}),
            },
          };
        }
        callbacks.saveWeekNotes(exWeekNotes);
        logMod(action, `Marked ${targetIds.length} class(es) as ${action.exceptionType}`);
        break;
      }

      // ── Class Notes ─────────────────────────────────────────────────────
      case 'addClassNote': {
        if (!action.classId || !action.text) break;
        const cnWeekNotes = callbacks.getCurrentWeekNotes();
        const cnExisting: ClassWeekNotes = cnWeekNotes.classNotes[action.classId] || {
          classId: action.classId, plan: '', liveNotes: [], isOrganized: false,
        };
        const newNote: LiveNote = {
          id: `ai-note-${Date.now()}`,
          timestamp: new Date().toISOString(),
          text: action.text,
          category: (action.noteCategory as LiveNote['category']) || undefined,
        };
        cnWeekNotes.classNotes[action.classId] = {
          ...cnExisting,
          liveNotes: [...cnExisting.liveNotes, newNote],
        };
        callbacks.saveWeekNotes(cnWeekNotes);
        logMod(action, `Added note to class ${action.classId}`);
        break;
      }
      case 'setClassPlan': {
        if (!action.classId || !action.plan) break;
        const cpWeekNotes = callbacks.getCurrentWeekNotes();
        const cpExisting: ClassWeekNotes = cpWeekNotes.classNotes[action.classId] || {
          classId: action.classId, plan: '', liveNotes: [], isOrganized: false,
        };
        cpWeekNotes.classNotes[action.classId] = { ...cpExisting, plan: action.plan };
        callbacks.saveWeekNotes(cpWeekNotes);
        logMod(action, `Set class plan for ${action.classId}`);
        break;
      }
      case 'setNextWeekGoal': {
        if (!action.classId || !action.goal) break;
        const ngWeekNotes = callbacks.getCurrentWeekNotes();
        const ngExisting: ClassWeekNotes = ngWeekNotes.classNotes[action.classId] || {
          classId: action.classId, plan: '', liveNotes: [], isOrganized: false,
        };
        ngWeekNotes.classNotes[action.classId] = { ...ngExisting, nextWeekGoal: action.goal };
        callbacks.saveWeekNotes(ngWeekNotes);
        logMod(action, `Set next-week goal for ${action.classId}`);
        break;
      }

      // ── Launch Plan ─────────────────────────────────────────────────────
      case 'completeLaunchTask': {
        if (!action.taskId || !callbacks.getData().launchPlan) break;
        const tasks = callbacks.getData().launchPlan!.tasks.map(t =>
          t.id === action.taskId
            ? { ...t, completed: true, completedAt: new Date().toISOString() }
            : t
        );
        // Also mark matching day plan item done
        if (currentPlan) {
          const planIdx = currentPlan.items.findIndex(i => i.sourceId === action.taskId && i.category === 'launch');
          if (planIdx >= 0) {
            const updatedItems = [...currentPlan.items];
            updatedItems[planIdx] = { ...updatedItems[planIdx], completed: true };
            currentPlan = { ...currentPlan, items: updatedItems };
            planUpdated = true;
          }
        }
        callbacks.updateLaunchPlan({ tasks });
        logMod(action, `Completed launch task "${action.taskId}"`);
        break;
      }
      case 'skipLaunchTask': {
        if (!action.taskId || !callbacks.getData().launchPlan) break;
        const skipTasks = callbacks.getData().launchPlan!.tasks.map(t =>
          t.id === action.taskId
            ? { ...t, skipped: true, skippedAt: new Date().toISOString() }
            : t
        );
        callbacks.updateLaunchPlan({ tasks: skipTasks });
        logMod(action, `Skipped launch task "${action.taskId}"`);
        break;
      }
      case 'addLaunchNote': {
        if (!action.taskId || !action.note || !callbacks.getData().launchPlan) break;
        const noteTasks = callbacks.getData().launchPlan!.tasks.map(t =>
          t.id === action.taskId ? { ...t, notes: action.note } : t
        );
        callbacks.updateLaunchPlan({ tasks: noteTasks });
        logMod(action, `Added note to launch task "${action.taskId}"`);
        break;
      }

      // ── Rehearsal Notes ─────────────────────────────────────────────────
      case 'addRehearsalNote': {
        if (!action.danceId || !action.notes) break;
        const dance = (callbacks.getData().competitionDances || []).find(d => d.id === action.danceId);
        if (!dance) break;
        const newRehearsalNote: RehearsalNote = {
          id: `ai-rn-${Date.now()}`,
          date: todayKey,
          notes: action.notes,
          workOn: action.workOn || [],
          media: [],
        };
        const updatedDance: CompetitionDance = {
          ...dance,
          rehearsalNotes: [newRehearsalNote, ...(dance.rehearsalNotes || [])],
        };
        callbacks.updateCompetitionDance(updatedDance);
        logMod(action, `Added rehearsal note to "${dance.registrationName}"`);
        break;
      }

      // ── Disruption Actions ──────────────────────────────────────────────
      case 'startDisruption': {
        if (!action.disruptionType) break;
        const disruption: DisruptionState = {
          active: true,
          type: action.disruptionType,
          reason: action.reason,
          startDate: todayKey,
          expectedReturn: action.expectedReturn,
          classesHandled: false,
          tasksDeferred: false,
        };
        callbacks.updateDisruption(disruption);
        logMod(action, `Started disruption: ${action.disruptionType}${action.reason ? ` (${action.reason})` : ''}`);
        break;
      }
      case 'endDisruption': {
        callbacks.updateDisruption(undefined);
        logMod(action, 'Ended disruption');
        break;
      }
      case 'markClassExceptionRange': {
        if (!action.startDate || !action.endDate || !action.exceptionType) break;
        const days: string[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        let current = new Date(action.startDate + 'T00:00:00');
        const end = new Date(action.endDate + 'T00:00:00');
        while (current <= end) {
          const dayName = days[current.getDay()];
          const weekOf = formatWeekOf(getWeekStart(current));
          const existingWeekNotes = callbacks.getData().weekNotes.find(w => w.weekOf === weekOf);
          const weekNote: WeekNotes = existingWeekNotes
            ? { ...existingWeekNotes, classNotes: { ...existingWeekNotes.classNotes } }
            : { id: `week_${weekOf}`, weekOf, classNotes: {} };
          const dayClasses = getClassesByDay(callbacks.getData().classes, dayName as DayOfWeek);
          for (const cls of dayClasses) {
            const existing = weekNote.classNotes[cls.id] || { classId: cls.id, plan: '', liveNotes: [], isOrganized: false };
            weekNote.classNotes[cls.id] = {
              ...existing,
              exception: {
                type: action.exceptionType,
                ...(action.subName ? { subName: action.subName } : {}),
                ...(action.reason ? { reason: action.reason as 'sick' | 'personal' | 'holiday' | 'other' } : {}),
              },
            };
          }
          callbacks.saveWeekNotes(weekNote);
          current = addDays(current, 1);
        }
        if (callbacks.getData().disruption?.active) {
          callbacks.updateDisruption({ ...callbacks.getData().disruption!, classesHandled: true });
        }
        logMod(action, `Marked class exceptions ${action.startDate} to ${action.endDate} (${action.exceptionType})`);
        break;
      }
      case 'batchRescheduleTasks': {
        if (!action.filter || !action.newDate) break;
        const allReminders = [...(sc.reminders || [])];
        const updated = allReminders.map(r => {
          if (r.completed) return r;
          const isOverdue = r.dueDate && r.dueDate < todayKey;
          const isDueThisWeek = r.dueDate && r.dueDate >= todayKey && r.dueDate <= format(addDays(new Date(), 7), 'yyyy-MM-dd');
          let shouldReschedule = false;
          if (action.filter === 'overdue' && isOverdue) shouldReschedule = true;
          if (action.filter === 'due-this-week' && isDueThisWeek) shouldReschedule = true;
          if (action.filter === 'all-active') shouldReschedule = true;
          if (shouldReschedule) {
            return { ...r, dueDate: action.newDate, updatedAt: new Date().toISOString() };
          }
          return r;
        });
        selfCareUpdates.reminders = updated;
        needsSelfCareUpdate = true;
        if (callbacks.getData().disruption?.active) {
          callbacks.updateDisruption({ ...callbacks.getData().disruption!, tasksDeferred: true });
        }
        logMod(action, `Batch rescheduled ${action.filter} tasks → ${action.newDate}`);
        break;
      }
      case 'assignSub': {
        if (!action.classIds || !action.dates || !action.subName) break;
        const currentDisruption = callbacks.getData().disruption;
        if (currentDisruption?.active) {
          const newAssignments = action.classIds.flatMap(classId =>
            (action.dates || []).map(date => ({ classId, date, subName: action.subName! }))
          );
          callbacks.updateDisruption({
            ...currentDisruption,
            subAssignments: [...(currentDisruption.subAssignments || []), ...newAssignments],
          });
          logMod(action, `Assigned sub "${action.subName}" to ${action.classIds.length} class(es)`);
        }
        break;
      }
      case 'clearWeekPlan': {
        // No-op for now — week plans are per-class, clearing is destructive
        break;
      }
      case 'generateCatchUpPlan': {
        // Signal to the chat to generate a catch-up. No client action needed.
        break;
      }

      // ── Class Schedule Editing ────────────────────────────────────────
      case 'editClass': {
        if (!action.classId || !callbacks.updateClass) break;
        const cls = data.classes.find(c => c.id === action.classId);
        if (!cls) break;
        const updated = { ...cls };
        if (action.className) updated.name = action.className;
        if (action.day) updated.day = action.day as DayOfWeek;
        if (action.startTime) updated.startTime = action.startTime;
        if (action.endTime) updated.endTime = action.endTime;
        if (action.studioId) updated.studioId = action.studioId;
        updated.lastModified = new Date().toISOString();
        callbacks.updateClass(updated);
        logMod(action, `Edited class "${cls.name}": ${[
          action.className && `name → ${action.className}`,
          action.day && `day → ${action.day}`,
          action.startTime && `start → ${action.startTime}`,
          action.endTime && `end → ${action.endTime}`,
          action.studioId && `studio → ${action.studioId}`,
        ].filter(Boolean).join(', ')}`);
        break;
      }
      case 'addNewClass': {
        if (!action.className || !action.day || !action.startTime || !action.endTime || !callbacks.addClass) break;
        callbacks.addClass({
          name: action.className,
          day: action.day as DayOfWeek,
          startTime: action.startTime,
          endTime: action.endTime,
          studioId: action.studioId || data.studios[0]?.id || '',
          musicLinks: [],
          isActive: true,
          lastModified: new Date().toISOString(),
        });
        logMod(action, `Added new class "${action.className}" on ${action.day} ${action.startTime}–${action.endTime}`);
        break;
      }
      case 'deactivateClass': {
        if (!action.classId || !callbacks.updateClass) break;
        const deactivateCls = data.classes.find(c => c.id === action.classId);
        if (!deactivateCls) break;
        callbacks.updateClass({ ...deactivateCls, isActive: false, lastModified: new Date().toISOString() });
        logMod(action, `Deactivated class "${deactivateCls.name}"`);
        break;
      }
      case 'reactivateClass': {
        if (!action.classId || !callbacks.updateClass) break;
        const reactivateCls = data.classes.find(c => c.id === action.classId);
        if (!reactivateCls) break;
        callbacks.updateClass({ ...reactivateCls, isActive: true, lastModified: new Date().toISOString() });
        logMod(action, `Reactivated class "${reactivateCls.name}"`);
        break;
      }
    }
  }

  if (needsSelfCareUpdate) {
    callbacks.updateSelfCare(selfCareUpdates);
  }
  if (planUpdated && currentPlan) {
    callbacks.saveDayPlan(currentPlan as DayPlan);
  }
}
