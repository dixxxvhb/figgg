import { AppData, Class, WeekNotes, Project, Competition, CalendarEvent, AppSettings, CompetitionDance } from '../types';
import { studios } from '../data/studios';
import { initialClasses } from '../data/classes';
import { terminology } from '../data/terminology';
import { initialProjects } from '../data/projects';
import { initialCompetitions } from '../data/competitions';
import { initialCompetitionDances } from '../data/competitionDances';
import { students as initialStudents } from '../data/students';
import { debouncedCloudSave, fetchCloudData, saveCloudData, flushPendingSave, immediateCloudSave } from './cloudStorage';

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

// Migration: Force use initial students data with class enrollments
// This completely replaces stored students with code-defined students to ensure
// class enrollments are correct.
function migrateStudents(_storedStudents: typeof initialStudents): typeof initialStudents {
  // Always return initial students with their class enrollments
  return initialStudents;
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
    let classIds = [...student.classIds];
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

// Track recent local saves to prevent cloud sync from overwriting
// This prevents the race condition where cloud sync returns stale data
// before the local save has been pushed to cloud
let lastLocalSaveTime = 0;
const LOCAL_SAVE_GRACE_PERIOD = 15000; // 15 seconds - covers AI expansion time

export function wasRecentlySavedLocally(): boolean {
  return Date.now() - lastLocalSaveTime < LOCAL_SAVE_GRACE_PERIOD;
}

export function loadData(): AppData {
  // Return cached result if fresh
  if (loadDataCache && Date.now() - loadDataCache.timestamp < LOAD_CACHE_TTL) {
    return loadDataCache.data;
  }

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
      // CRITICAL: Force use of initial classes and students to ensure IDs match
      const result: AppData = {
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
      loadDataCache = { data: result, timestamp: Date.now() };
      return result;
    }
  } catch {
    // Failed to load data - use defaults
  }
  const defaults = getDefaultData();
  loadDataCache = { data: defaults, timestamp: Date.now() };
  return defaults;
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

// Save to localStorage only (no cloud sync) - used when immediateCloudSave will be called separately
function saveDataLocalOnly(data: AppData): AppData {
  // Invalidate load cache on save
  loadDataCache = null;
  // Track local save time to prevent cloud sync race condition
  lastLocalSaveTime = Date.now();

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
  return dataWithTimestamp;
}

export function saveData(data: AppData): void {
  try {
    const dataWithTimestamp = saveDataLocalOnly(data);
    // Also sync to cloud (debounced to avoid too many requests)
    debouncedCloudSave(dataWithTimestamp);
    saveEvents.emit('saving');
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

// Apply migrations to cloud data
function migrateCloudData(cloudData: AppData): AppData {
  const defaults = getDefaultData();

  // Migrate competition IDs
  const migratedCompetitions = cloudData.competitions?.length > 0
    ? migrateCompetitionIds(cloudData.competitions)
    : defaults.competitions;

  // Migrate competition dances to add costume data, dancerIds, and fix names
  let migratedDances = cloudData.competitionDances?.length > 0
    ? migrateCompetitionDanceCostumes(cloudData.competitionDances)
    : defaults.competitionDances;
  migratedDances = migrateCompetitionDancerIds(migratedDances);
  migratedDances = migrateCompetitionDanceNames(migratedDances);

  // Merge students - migrate to add new students and update classIds
  const students = migrateClassRosters(
    (cloudData.students?.length ?? 0) > 0
      ? migrateStudents(cloudData.students!)
      : defaults.students!
  );

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

// Merge weekNotes from two sources - NEVER lose notes
function mergeWeekNotes(local: WeekNotes[], cloud: WeekNotes[]): WeekNotes[] {
  const merged = new Map<string, WeekNotes>();

  // Start with cloud data
  for (const wn of cloud) {
    merged.set(wn.weekOf, wn);
  }

  // Merge in local data
  for (const localWN of local) {
    const existing = merged.get(localWN.weekOf);
    if (!existing) {
      // Local has notes for a week cloud doesn't - keep them
      merged.set(localWN.weekOf, localWN);
    } else {
      // Both have notes for this week - merge class notes
      const mergedClassNotes = { ...existing.classNotes };

      for (const [classId, localClassNotes] of Object.entries(localWN.classNotes)) {
        const existingClassNotes = mergedClassNotes[classId];
        if (!existingClassNotes) {
          // Local has notes for a class cloud doesn't
          mergedClassNotes[classId] = localClassNotes;
        } else {
          // Both have notes - keep the one with more content, or merge liveNotes
          const localPlan = localClassNotes.plan || '';
          const cloudPlan = existingClassNotes.plan || '';
          const localLiveNotes = localClassNotes.liveNotes || [];
          const cloudLiveNotes = existingClassNotes.liveNotes || [];

          // Merge liveNotes by ID, keeping the most recent version of each note
          const liveNotesMap = new Map<string, typeof localLiveNotes[0]>();
          for (const note of cloudLiveNotes) {
            liveNotesMap.set(note.id, note);
          }
          for (const note of localLiveNotes) {
            const existing = liveNotesMap.get(note.id);
            // Keep whichever note is newer based on timestamp
            if (!existing || new Date(note.timestamp) >= new Date(existing.timestamp)) {
              liveNotesMap.set(note.id, note);
            }
          }

          mergedClassNotes[classId] = {
            ...existingClassNotes,
            ...localClassNotes,
            // Keep longer plan (more content = more work done)
            plan: localPlan.length >= cloudPlan.length ? localPlan : cloudPlan,
            // Merged live notes
            liveNotes: Array.from(liveNotesMap.values()),
            // Keep organized notes if either has them
            organizedNotes: localClassNotes.organizedNotes || existingClassNotes.organizedNotes,
            isOrganized: localClassNotes.isOrganized || existingClassNotes.isOrganized,
            // Merge media
            media: [...(existingClassNotes.media || []), ...(localClassNotes.media || [])].filter(
              (m, i, arr) => arr.findIndex(x => x.id === m.id) === i
            ),
            // Merge attendance
            attendance: localClassNotes.attendance || existingClassNotes.attendance,
          };
        }
      }

      merged.set(localWN.weekOf, {
        ...existing,
        classNotes: mergedClassNotes,
      });
    }
  }

  return Array.from(merged.values());
}

// Sync data from cloud - call this on app load
// Uses smart merging to NEVER lose data
export async function syncFromCloud(): Promise<AppData | null> {
  try {
    // If there was a recent local save, skip cloud sync to avoid race condition
    // The local data will be pushed to cloud by the pending save
    if (wasRecentlySavedLocally()) {
      return null;
    }

    const cloudData = await fetchCloudData();
    if (!cloudData) return null;

    // Apply migrations to cloud data
    const migratedCloudData = migrateCloudData(cloudData);

    const localData = loadData();

    // ALWAYS merge weekNotes - never lose notes from either source
    const mergedWeekNotes = mergeWeekNotes(
      localData.weekNotes || [],
      migratedCloudData.weekNotes || []
    );

    // Merge selfCare data - keep local if it has more recent dose times
    const localSelfCare = localData.selfCare || {};
    const cloudSelfCare = migratedCloudData.selfCare || {};
    const mergedSelfCare = {
      ...cloudSelfCare,
      ...localSelfCare,
      // Keep whichever has more recent dose times
      dose1Time: (localSelfCare.dose1Time || 0) > (cloudSelfCare.dose1Time || 0)
        ? localSelfCare.dose1Time : cloudSelfCare.dose1Time,
      dose1Date: (localSelfCare.dose1Time || 0) > (cloudSelfCare.dose1Time || 0)
        ? localSelfCare.dose1Date : cloudSelfCare.dose1Date,
      dose2Time: (localSelfCare.dose2Time || 0) > (cloudSelfCare.dose2Time || 0)
        ? localSelfCare.dose2Time : cloudSelfCare.dose2Time,
      dose2Date: (localSelfCare.dose2Time || 0) > (cloudSelfCare.dose2Time || 0)
        ? localSelfCare.dose2Date : cloudSelfCare.dose2Date,
    };

    // Compare timestamps for base data resolution (but weekNotes are always merged)
    const cloudTime = migratedCloudData.lastModified ? new Date(migratedCloudData.lastModified).getTime() : 0;
    const localTime = localData.lastModified ? new Date(localData.lastModified).getTime() : 0;

    let baseData: AppData;
    if (cloudTime > localTime) {
      // Cloud is newer for base data
      baseData = migratedCloudData;
    } else {
      // Local is newer for base data
      baseData = localData;
    }

    // Create merged result - weekNotes and selfCare are always merged
    const mergedData: AppData = {
      ...baseData,
      weekNotes: mergedWeekNotes,
      selfCare: mergedSelfCare,
      lastModified: new Date().toISOString(),
    };

    // Save merged data locally
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedData));

    // Push merged data to cloud so all devices have the same merged state
    debouncedCloudSave(mergedData);

    return mergedData;
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
  // Save locally (without triggering debounced cloud save)
  const dataWithTimestamp = saveDataLocalOnly(data);
  saveEvents.emit('saving');
  // IMMEDIATELY sync notes to cloud - these are critical and should never be lost
  // Only one cloud save, not two (was calling both saveData and immediateCloudSave before)
  immediateCloudSave(dataWithTimestamp);
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
  const existingEvents = data.calendarEvents || [];

  // Create a map of existing events to preserve user modifications (like linkedDanceIds)
  const existingMap = new Map<string, CalendarEvent>();
  for (const event of existingEvents) {
    existingMap.set(event.id, event);
  }

  // Deduplicate new events by ID, merging with existing user modifications
  const seen = new Map<string, CalendarEvent>();
  for (const event of events) {
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
