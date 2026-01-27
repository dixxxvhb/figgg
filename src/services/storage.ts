import { AppData, Class, WeekNotes, Project, Competition, CalendarEvent, AppSettings, CompetitionDance } from '../types';
import { studios } from '../data/studios';
import { initialClasses } from '../data/classes';
import { terminology } from '../data/terminology';
import { initialProjects } from '../data/projects';
import { initialCompetitions } from '../data/competitions';
import { initialCompetitionDances } from '../data/competitionDances';
import { students as initialStudents } from '../data/students';
import { debouncedCloudSave, fetchCloudData, saveCloudData, flushPendingSave } from './cloudStorage';

// Set up page unload handler to flush pending saves
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    flushPendingSave();
  });

  // Also handle visibility change (when switching tabs or apps on mobile)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushPendingSave();
    }
  });
}

const STORAGE_KEY = 'dance-teaching-app-data';

function getDefaultData(): AppData {
  return {
    studios,
    classes: initialClasses,
    weekNotes: [],
    exercises: [],
    terminology,
    projects: initialProjects,
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
    return comp;
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

// Migration: Force use initial students data with class enrollments
// This completely replaces stored students with code-defined students to ensure
// class enrollments are correct.
function migrateStudents(_storedStudents: typeof initialStudents): typeof initialStudents {
  // Always return initial students with their class enrollments
  return initialStudents;
}

export function loadData(): AppData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const defaults = getDefaultData();

      // Migrate competition IDs
      const migratedCompetitions = parsed.competitions?.length > 0
        ? migrateCompetitionIds(parsed.competitions)
        : defaults.competitions;

      // Migrate competition dances to add costume data and dancerIds
      let migratedDances = parsed.competitionDances?.length > 0
        ? migrateCompetitionDanceCostumes(parsed.competitionDances)
        : defaults.competitionDances;
      migratedDances = migrateCompetitionDancerIds(migratedDances);

      // Merge students - migrate to add new students and update classIds
      const students = parsed.students?.length > 0
        ? migrateStudents(parsed.students)
        : defaults.students;

      // Merge with defaults to ensure all fields exist
      // CRITICAL: Force use of initial classes and students to ensure IDs match
      return {
        ...defaults,
        ...parsed,
        // FORCE initial classes - stored classes have old uuid IDs that don't match student classIds
        classes: initialClasses,
        // Use migrated competitions
        competitions: migratedCompetitions,
        // Use migrated dances with costume data and dancerIds
        competitionDances: migratedDances,
        // FORCE initial students with correct classIds
        students,
      };
    }
  } catch {
    // Failed to load data - use defaults
  }
  return getDefaultData();
}

// Event for notifying UI about save status
export const saveEvents = {
  listeners: new Set<(status: 'saving' | 'saved' | 'error', message?: string) => void>(),
  emit(status: 'saving' | 'saved' | 'error', message?: string) {
    this.listeners.forEach(listener => listener(status, message));
  },
  subscribe(listener: (status: 'saving' | 'saved' | 'error', message?: string) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
};

export function saveData(data: AppData): void {
  try {
    // Add timestamp for conflict resolution
    const dataWithTimestamp = {
      ...data,
      lastModified: new Date().toISOString(),
    };

    const jsonString = JSON.stringify(dataWithTimestamp);

    // Check if data is too large for localStorage (typically 5-10MB limit)
    if (jsonString.length > 4 * 1024 * 1024) {
      const sizeInMB = (jsonString.length / (1024 * 1024)).toFixed(2);
      console.warn(`Data size (${sizeInMB}MB) is large, may exceed localStorage limit`);
    }

    localStorage.setItem(STORAGE_KEY, jsonString);
    // Also sync to cloud (debounced to avoid too many requests)
    debouncedCloudSave(dataWithTimestamp);
    saveEvents.emit('saving');
  } catch (error) {
    console.error('Failed to save data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check if it's a quota exceeded error
    if (errorMessage.includes('quota') || errorMessage.includes('QuotaExceededError')) {
      saveEvents.emit('error', 'Storage full! Videos may be too large. Try smaller files or delete some media.');
    } else {
      saveEvents.emit('error', `Save failed: ${errorMessage}`);
    }
  }
}

// Apply migrations to cloud data
function migrateCloudData(cloudData: AppData): AppData {
  const defaults = getDefaultData();

  // Migrate competition IDs
  const migratedCompetitions = cloudData.competitions?.length > 0
    ? migrateCompetitionIds(cloudData.competitions)
    : defaults.competitions;

  // Migrate competition dances to add costume data and dancerIds
  let migratedDances = cloudData.competitionDances?.length > 0
    ? migrateCompetitionDanceCostumes(cloudData.competitionDances)
    : defaults.competitionDances;
  migratedDances = migrateCompetitionDancerIds(migratedDances);

  // Merge students - migrate to add new students and update classIds
  const students = (cloudData.students?.length ?? 0) > 0
    ? migrateStudents(cloudData.students!)
    : defaults.students;

  return {
    ...defaults,
    ...cloudData,
    // FORCE initial classes - stored classes have old uuid IDs that don't match student classIds
    classes: initialClasses,
    competitions: migratedCompetitions,
    competitionDances: migratedDances,
    // FORCE initial students with correct classIds
    students,
  };
}

// Sync data from cloud - call this on app load
// Uses timestamp-based conflict resolution: most recent wins
export async function syncFromCloud(): Promise<AppData | null> {
  try {
    const cloudData = await fetchCloudData();
    if (!cloudData) return null;

    // Apply migrations to cloud data
    const migratedCloudData = migrateCloudData(cloudData);

    const localData = loadData();

    // Compare timestamps for conflict resolution
    const cloudTime = migratedCloudData.lastModified ? new Date(migratedCloudData.lastModified).getTime() : 0;
    const localTime = localData.lastModified ? new Date(localData.lastModified).getTime() : 0;

    if (cloudTime > localTime) {
      // Cloud is newer - use migrated cloud data
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedCloudData));
      return migratedCloudData;
    } else if (localTime > cloudTime) {
      // Local is newer - push local to cloud
      debouncedCloudSave(localData);
      return localData;
    }

    // Same timestamp or both missing - use migrated cloud data as fallback
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedCloudData));
    return migratedCloudData;
  } catch (error) {
    console.error('Failed to sync from cloud:', error);
    return null;
  }
}

// Force push local data to cloud
export async function pushToCloud(): Promise<boolean> {
  const data = loadData();
  return await saveCloudData(data);
}

export function updateClasses(classes: Class[]): void {
  const data = loadData();
  data.classes = classes;
  saveData(data);
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
  saveData(data);
}

export function updateProjects(projects: Project[]): void {
  const data = loadData();
  data.projects = projects;
  saveData(data);
}

export function updateCompetitions(competitions: Competition[]): void {
  const data = loadData();
  data.competitions = competitions;
  saveData(data);
}

export function updateCalendarEvents(events: CalendarEvent[]): void {
  const data = loadData();
  // Deduplicate by ID (same title+date+time from different calendars)
  const seen = new Map<string, CalendarEvent>();
  for (const event of events) {
    seen.set(event.id, event);
  }
  data.calendarEvents = Array.from(seen.values());
  saveData(data);
}

export function updateSettings(settings: Partial<AppSettings>): void {
  const data = loadData();
  data.settings = { ...data.settings, ...settings };
  saveData(data);
}

export function getSettings(): AppSettings {
  const data = loadData();
  return data.settings || {};
}

// Export/Import for backup
export function exportData(): string {
  const data = loadData();
  return JSON.stringify(data, null, 2);
}

export function importData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString) as AppData;
    saveData(data);
    return true;
  } catch (error) {
    console.error('Failed to import data:', error);
    return false;
  }
}
