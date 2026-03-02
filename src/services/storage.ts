import { AppData, Class, WeekNotes, Competition, CalendarEvent, AppSettings, CompetitionDance, Student, LaunchPlanData } from '../types';
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

// Migration: Update competition IDs from old format to new format
function migrateCompetitionIds(competitions: Competition[]): Competition[] {
  return competitions.map(comp => {
    // Migrate inferno-2025 to inferno-2026 (date correction)
    if (comp.id === 'inferno-2025') {
      return {
        ...comp,
        id: 'inferno-2026',
        date: '2026-01-30',
        endDate: '2026-02-01',
        notes: comp.notes + ' Preliminary competition Jan 30 - Feb 1, 2026.',
      };
    }
    // Fix Inferno location to match official schedule (Orlando Regional)
    if (comp.id === 'inferno-2026' && comp.location?.includes('Apopka, FL')) {
      return {
        ...comp,
        location: 'Apopka High School, Orlando, FL',
      };
    }
    return comp;
  });
}

// Migration: Fix dance IDs/names to match official Inferno competition schedule
function migrateCompetitionDanceNames(storedDances: CompetitionDance[]): CompetitionDance[] {
  return storedDances.map(dance => {
    // "I'm A Woman" -> "I Am" (official Inferno entry #150 name)
    if (dance.id === 'im-a-woman') {
      return { ...dance, id: 'i-am', registrationName: 'I Am' };
    }
    // "Papa Was A Rollin' Stone" -> "Papa Was A Rolling Stone"
    if (dance.id === 'papa-was-a-rollin-stone') {
      return { ...dance, id: 'papa-was-a-rolling-stone', registrationName: 'Papa Was A Rolling Stone', songTitle: 'Papa Was A Rolling Stone' };
    }
    // "Lime in the Coconut" -> "Put the Lime in the Coconut"
    if (dance.id === 'lime-in-the-coconut' && dance.registrationName === 'Lime in the Coconut') {
      return { ...dance, registrationName: 'Put the Lime in the Coconut', songTitle: 'Put the Lime in the Coconut' };
    }
    return dance;
  });
}

// Migration: Merge costume data from initialCompetitionDances into stored dances
function migrateCompetitionDanceCostumes(storedDances: CompetitionDance[]): CompetitionDance[] {
  return storedDances.map(dance => {
    // If this dance already has costume data, keep it (user may have edited)
    if (dance.costume) {
      return dance;
    }

    // Find the matching dance in initialCompetitionDances to get costume data
    const initialDance = initialCompetitionDances.find(d => d.id === dance.id);
    if (initialDance?.costume) {
      return {
        ...dance,
        costume: initialDance.costume,
      };
    }

    return dance;
  });
}

// Migration: Add dancerIds to competition dances (links to student records)
function migrateCompetitionDancerIds(storedDances: CompetitionDance[]): CompetitionDance[] {
  return storedDances.map(dance => {
    // If this dance already has dancerIds, keep it
    if (dance.dancerIds && dance.dancerIds.length > 0) {
      return dance;
    }

    // Find the matching dance in initialCompetitionDances to get dancerIds
    const initialDance = initialCompetitionDances.find(d => d.id === dance.id);
    if (initialDance?.dancerIds) {
      return {
        ...dance,
        dancerIds: initialDance.dancerIds,
      };
    }

    return dance;
  });
}

// Migration: Merge initial students with stored students
// - Initial students (student-1, student-2, etc.) get their base data from code but PRESERVE
//   user edits to notes, skillNotes, nickname, parent info, etc.
// - User-added students (UUID ids) are always kept as-is.
function migrateStudents(storedStudents: Student[]): Student[] {
  const storedMap = new Map(storedStudents.map(s => [s.id, s]));
  const merged: Student[] = [];

  // 1. Start with initial students — use code-defined classIds but keep stored edits
  for (const initial of initialStudents) {
    const stored = storedMap.get(initial.id);
    if (stored) {
      // Keep user edits (notes, skillNotes, nickname, parent info, etc.)
      // but ensure classIds come from code (source of truth for roster assignments)
      merged.push({
        ...stored,
        classIds: initial.classIds,
      });
      storedMap.delete(initial.id);
    } else {
      merged.push({ ...initial });
    }
  }

  // 2. Append any user-added students that aren't in the initial set
  for (const [, student] of storedMap) {
    merged.push(student);
  }

  return merged;
}
// Migration: Ensure persisted students have correct class roster assignments
// for Jazz 10+ (class-caa-tue-1750) and Ballet 2/3 (class-caa-tue-1850)
function migrateClassRosters(storedStudents: typeof initialStudents): typeof initialStudents {
  // Students who should have Jazz 10+ (class-caa-tue-1750)
  const jazzTenPlusIds = new Set([
    'student-32', 'student-1', 'student-4', 'student-34', 'student-35',
    'student-9', 'student-10', 'student-15', 'student-30', 'student-22',
    'student-37', 'student-38', 'student-39', 'student-40', 'student-41', 'student-42',
  ]);

  // Students who should have Ballet 2/3 (class-caa-tue-1850)
  const balletTwoThreeIds = new Set([
    'student-24', 'student-25', 'student-2', 'student-3', 'student-6',
    'student-26', 'student-11', 'student-12', 'student-13', 'student-14',
    'student-18', 'student-27', 'student-21', 'student-28',
  ]);

  return storedStudents.map(student => {
    const classIds = [...student.classIds];
    let changed = false;

    if (jazzTenPlusIds.has(student.id) && !classIds.includes('class-caa-tue-1750')) {
      classIds.push('class-caa-tue-1750');
      changed = true;
    }

    if (balletTwoThreeIds.has(student.id) && !classIds.includes('class-caa-tue-1850')) {
      classIds.push('class-caa-tue-1850');
      changed = true;
    }

    return changed ? { ...student, classIds } : student;
  });
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

      // Migrate competition IDs
      const migratedCompetitions = parsed.competitions?.length > 0
        ? migrateCompetitionIds(parsed.competitions)
        : defaults.competitions;

      // Migrate competition dances to add costume data, dancerIds, and fix names
      let migratedDances = parsed.competitionDances?.length > 0
        ? migrateCompetitionDanceCostumes(parsed.competitionDances)
        : defaults.competitionDances;
      migratedDances = migrateCompetitionDancerIds(migratedDances);
      migratedDances = migrateCompetitionDanceNames(migratedDances);

      // Merge students - migrate to add new students and update classIds
      const students = migrateClassRosters(
        (parsed.students?.length ?? 0) > 0
          ? migrateStudents(parsed.students!)
          : defaults.students!
      );

      // Merge with defaults to ensure all fields exist
      const result: AppData = {
        ...defaults,
        ...parsed,
        // FORCE initial classes - stored classes have old uuid IDs that don't match student classIds
        classes: initialClasses,
        // Use migrated competitions
        competitions: migratedCompetitions,
        // Use migrated dances with costume data and dancerIds
        competitionDances: migratedDances,
        // Merged students: initial roster + user-added students preserved
        students,
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

// Legacy stub — Firestore onSnapshot handles all cloud sync now.
// Kept for backward compatibility with Settings.tsx and SyncContext.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function syncFromCloud(force: boolean = false): Promise<AppData | null> {
  return null;
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

// Legacy stub — Firestore handles all cloud persistence now.
export async function pushToCloud(): Promise<boolean> {
  return true;
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

export function updateCalendarEvents(events: CalendarEvent[]): void {
  const data = loadData();
  const existingEvents = data.calendarEvents || [];
  const hiddenIds = new Set(data.settings?.hiddenCalendarEventIds || []);

  // Create a map of existing events to preserve user modifications (like linkedDanceIds)
  const existingMap = new Map<string, CalendarEvent>();
  for (const event of existingEvents) {
    existingMap.set(event.id, event);
  }

  // Deduplicate new events by ID, merging with existing user modifications
  const seen = new Map<string, CalendarEvent>();
  for (const event of events) {
    // Skip events the user has hidden — they won't reappear after sync
    if (hiddenIds.has(event.id)) continue;

    const existing = existingMap.get(event.id);
    if (existing) {
      // Merge: keep new calendar data but preserve user modifications
      seen.set(event.id, {
        ...event,
        linkedDanceIds: existing.linkedDanceIds, // Preserve linked dances
      });
    } else {
      seen.set(event.id, event);
    }
  }

  // Replace all events - this removes events no longer in any calendar feed
  data.calendarEvents = Array.from(seen.values());
  saveData(data);
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
