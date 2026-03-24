import { AppData, Class, WeekNotes, AppSettings, LaunchPlanData } from '../types';
import { studios } from '../data/studios';
import { initialClasses } from '../data/classes';
import { terminology } from '../data/terminology';
import { initialCompetitions } from '../data/competitions';
import { initialCompetitionDances } from '../data/competitionDances';
import { students as initialStudents } from '../data/students';
const STORAGE_KEY = 'dance-teaching-app-data';

function getDefaultData(): AppData {
  return {
    studios,
    classes: initialClasses,
    weekNotes: [],
    terminology,
    competitions: initialCompetitions,
    competitionDances: initialCompetitionDances,
    calendarEvents: [],
    settings: {},
    students: initialStudents,
  };
}

// Simple TTL cache for loadData to avoid redundant JSON parsing
let loadDataCache: { data: AppData; timestamp: number } | null = null;
const LOAD_CACHE_TTL = 500; // ms

// Proactive localStorage quota check — runs once on startup
let quotaWarningEmitted = false;
function checkStorageQuota() {
  if (quotaWarningEmitted) return;
  try {
    let totalBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        totalBytes += key.length + (localStorage.getItem(key)?.length || 0);
      }
    }
    // Estimate: each char ≈ 2 bytes (UTF-16), 5MB ≈ 2.5M chars
    const estimatedMB = (totalBytes * 2) / (1024 * 1024);
    const quotaMB = 5; // Conservative estimate (most browsers give 5-10MB)
    if (estimatedMB / quotaMB > 0.8) {
      quotaWarningEmitted = true;
      const pct = Math.round((estimatedMB / quotaMB) * 100);
      saveEvents.emit('warning', `Storage ${pct}% full (${estimatedMB.toFixed(1)}MB of ~${quotaMB}MB). Consider removing old media.`);
    }
  } catch {
    // Ignore — non-critical
  }
}

export function loadData(): AppData {
  // Return cached result if fresh
  if (loadDataCache && Date.now() - loadDataCache.timestamp < LOAD_CACHE_TTL) {
    return loadDataCache.data;
  }

  // Proactive quota check on first load
  checkStorageQuota();

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const defaults = getDefaultData();

      // Use stored data as source of truth; only fall back to defaults if no data stored.
      // Firestore is the real source of truth — localStorage is just an offline cache.
      const result: AppData = {
        ...defaults,
        ...parsed,
        // Use stored data if available, otherwise seed from defaults
        classes: parsed.classes?.length > 0 ? parsed.classes : defaults.classes,
        competitions: parsed.competitions?.length > 0 ? parsed.competitions : defaults.competitions,
        competitionDances: parsed.competitionDances?.length > 0 ? parsed.competitionDances : defaults.competitionDances,
        students: (parsed.students?.length ?? 0) > 0 ? parsed.students : defaults.students,
      };
      loadDataCache = { data: result, timestamp: Date.now() };
      return result;
    }
  } catch (e) {
    console.error('Failed to load data from localStorage:', e);
  }
  const defaults = getDefaultData();
  loadDataCache = { data: defaults, timestamp: Date.now() };
  return defaults;
}

// Event for notifying UI about save status
export const saveEvents = {
  listeners: new Set<(status: 'saving' | 'saved' | 'error' | 'warning', message?: string) => void>(),
  emit(status: 'saving' | 'saved' | 'error' | 'warning', message?: string) {
    this.listeners.forEach(listener => listener(status, message));
  },
  subscribe(listener: (status: 'saving' | 'saved' | 'error' | 'warning', message?: string) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
};

// Save to localStorage (Firestore handles cloud persistence via useAppData)
function saveDataLocalOnly(data: AppData): AppData {
  // Invalidate load cache on save
  loadDataCache = null;

  // Add timestamp for conflict resolution
  const dataWithTimestamp = {
    ...data,
    lastModified: new Date().toISOString(),
  };

  const jsonString = JSON.stringify(dataWithTimestamp);

  // Check if data is too large for localStorage (typically 5-10MB limit)
  const sizeBytes = jsonString.length;
  if (sizeBytes > 4 * 1024 * 1024) {
    const sizeInMB = (sizeBytes / (1024 * 1024)).toFixed(2);
    saveEvents.emit('warning', `Data size is ${sizeInMB}MB — approaching storage limit. Consider removing some photos.`);
  }

  try {
    localStorage.setItem(STORAGE_KEY, jsonString);
  } catch (e) {
    // QuotaExceededError — emit error so the UI can warn the user
    saveEvents.emit('error', 'Storage full! Try removing some photos or old data.');
    console.error('localStorage quota exceeded:', e);
    // Still return the data so Firestore write can proceed
  }
  return dataWithTimestamp;
}

export function saveData(data: AppData): void {
  try {
    saveDataLocalOnly(data);
    saveEvents.emit('saving');
    // Notify other useAppData instances to re-sync from localStorage
    window.dispatchEvent(new CustomEvent('local-data-saved'));
  } catch (error) {
    console.error('Failed to save data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check if it's a quota exceeded error
    if (errorMessage.includes('quota') || errorMessage.includes('QuotaExceededError')) {
      saveEvents.emit('error', 'Storage full! Try smaller files or delete some media.');
    } else {
      saveEvents.emit('error', `Save failed: ${errorMessage}`);
    }
  }
}

// Save selfCare data to localStorage (Firestore sync handled by useAppData)
export function saveSelfCareToStorage(updates: Partial<import('../types').SelfCareData>): void {
  const data = loadData();
  const now = new Date().toISOString();
  const updatedData = {
    ...data,
    selfCare: { ...data.selfCare, ...updates, selfCareModified: now },
  };
  saveDataLocalOnly(updatedData);
  saveEvents.emit('saving');
}

// Save launch plan data to localStorage (Firestore sync handled by useAppData)
export function saveLaunchPlanToStorage(updates: Partial<LaunchPlanData>): void {
  const data = loadData();
  const now = new Date().toISOString();
  const currentPlan = data.launchPlan || { tasks: [], decisions: [], contacts: [], planStartDate: '', planEndDate: '', lastModified: now, version: 1 };
  const updatedPlan = { ...currentPlan, ...updates, lastModified: now };
  const updatedData = {
    ...data,
    launchPlan: updatedPlan,
  };
  saveDataLocalOnly(updatedData);
  saveEvents.emit('saving');
}

// Save day plan to localStorage (Firestore sync handled by useAppData)
export function saveDayPlanToStorage(plan: import('../types').DayPlan): void {
  const data = loadData();
  const updatedData = {
    ...data,
    dayPlan: plan,
  };
  saveDataLocalOnly(updatedData);
  saveEvents.emit('saving');
}

// Save therapist data to localStorage (Firestore sync handled by useAppData)
export function saveTherapistToStorage(updates: Partial<import('../types').TherapistData>): void {
  const data = loadData();
  const now = new Date().toISOString();
  const current = data.therapist || { prepNotes: [], sessions: [], lastModified: now };
  const updated = { ...current, ...updates, lastModified: now };
  const updatedData = { ...data, therapist: updated };
  saveDataLocalOnly(updatedData);
  saveEvents.emit('saving');
}

// Save meditation data to localStorage (Firestore sync handled by useAppData)
export function saveMeditationToStorage(updates: Partial<import('../types').MeditationData>): void {
  const data = loadData();
  const now = new Date().toISOString();
  const current = data.meditation || { sessions: [], preferences: { defaultRounds: { box: 4, fourSevenEight: 4, slow: 6 } }, lastModified: now };
  const updated = { ...current, ...updates, lastModified: now };
  const updatedData = { ...data, meditation: updated };
  saveDataLocalOnly(updatedData);
  saveEvents.emit('saving');
}

// Save grief data to localStorage (Firestore sync handled by useAppData)
export function saveGriefToStorage(updates: Partial<import('../types').GriefData>): void {
  const data = loadData();
  const now = new Date().toISOString();
  const current = data.grief || { letters: [], emotionalCheckins: [], lastPermissionSlipIndex: -1, lastModified: now };
  const updated = { ...current, ...updates, lastModified: now };
  const updatedData = { ...data, grief: updated };
  saveDataLocalOnly(updatedData);
  saveEvents.emit('saving');
}

export function updateClass(updatedClass: Class): void {
  const data = loadData();
  const index = data.classes.findIndex(c => c.id === updatedClass.id);
  if (index !== -1) {
    data.classes[index] = updatedClass;
    saveData(data);
  }
}

export function getWeekNotes(weekOf: string): WeekNotes | undefined {
  const data = loadData();
  return data.weekNotes.find(w => w.weekOf === weekOf);
}

export function saveWeekNotes(weekNotes: WeekNotes): void {
  const data = loadData();
  const index = data.weekNotes.findIndex(w => w.weekOf === weekNotes.weekOf);
  if (index !== -1) {
    data.weekNotes[index] = weekNotes;
  } else {
    data.weekNotes.push(weekNotes);
  }
  saveDataLocalOnly(data);
  saveEvents.emit('saving');
}

// Save calendar events to localStorage only (Firestore sync handled by SyncContext batch writes)
export function saveCalendarEventsToStorage(events: import('../types').CalendarEvent[]): void {
  const data = loadData();
  data.calendarEvents = events;
  saveDataLocalOnly(data);
  saveEvents.emit('saving');
  window.dispatchEvent(new CustomEvent('local-data-saved'));
}

export function updateSettings(settings: Partial<AppSettings>): void {
  const data = loadData();
  data.settings = { ...data.settings, ...settings };
  saveData(data);
}

// Export/Import for backup
export function exportData(): string {
  const data = loadData();
  return JSON.stringify(data, null, 2);
}

export function importData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    // Basic validation — must be an object with expected fields
    if (!data || typeof data !== 'object' || !Array.isArray(data.classes) || !Array.isArray(data.weekNotes)) {
      console.error('Import failed: invalid data structure (missing classes or weekNotes arrays)');
      return false;
    }
    saveData(data as AppData);
    return true;
  } catch (error) {
    console.error('Failed to import data:', error);
    return false;
  }
}
