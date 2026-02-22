import { AppData, Class, WeekNotes, Competition, CalendarEvent, AppSettings, CompetitionDance, Student, LaunchPlanData } from '../types';
import { studios } from '../data/studios';
import { initialClasses } from '../data/classes';
import { terminology } from '../data/terminology';
import { initialProjects } from '../data/projects';
import { initialCompetitions } from '../data/competitions';
import { initialCompetitionDances } from '../data/competitionDances';
import { students as initialStudents } from '../data/students';
import { debouncedCloudSave, fetchCloudData, flushPendingSave, immediateCloudSave } from './cloudStorage';

// Set up page unload handler to flush pending saves
// NOTE: Only on beforeunload (tab close / navigate away).
// We do NOT flush on visibilitychange=hidden because:
// 1. flushPendingSave does a blind push (no merge) via keepalive fetch
// 2. When the app becomes visible again, SyncContext fires syncFromCloud(true)
//    which properly merges local + cloud and pushes the merged result
// 3. The blind push could race with and overwrite the merge
// For tab close, there's no "visible" handler coming, so flush is correct.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    flushPendingSave();
  });
}

const STORAGE_KEY = 'dance-teaching-app-data';

// Global cloud operation mutex — serializes all fetch+merge+push sequences
// to prevent concurrent cloud operations from overwriting each other's merges
let cloudOpQueue: Promise<void> = Promise.resolve();
function withCloudMutex<T>(fn: () => Promise<T>): Promise<T> {
  let resolve: (v: T) => void;
  let reject: (e: unknown) => void;
  const result = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  cloudOpQueue = cloudOpQueue.then(() => fn().then(resolve!, reject!), () => fn().then(resolve!, reject!));
  return result;
}

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
    saveEvents.emit('warning', `Data size is ${sizeInMB}MB — approaching storage limit. Consider removing some photos.`);
  }

  localStorage.setItem(STORAGE_KEY, jsonString);
  return dataWithTimestamp;
}

export function saveData(data: AppData): void {
  try {
    const dataWithTimestamp = saveDataLocalOnly(data);
    saveEvents.emit('saving');
    // Notify other useAppData instances to re-sync from localStorage
    window.dispatchEvent(new CustomEvent('local-data-saved'));

    // Fetch cloud first, merge, then push — serialized via mutex to prevent races
    withCloudMutex(async () => {
      try {
        const cloudData = await fetchCloudData();
        if (cloudData) {
          // Re-read local data FRESH inside mutex to avoid stale closure
          const freshLocal = loadData();
          const now = new Date().toISOString();
          const localSC = freshLocal.selfCare || {};
          const cloudSC = cloudData.selfCare || {};
          const localMod = localSC.selfCareModified ? new Date(localSC.selfCareModified).getTime() : 0;
          const cloudMod = cloudSC.selfCareModified ? new Date(cloudSC.selfCareModified).getTime() : 0;
          const mergedSelfCare = cloudMod > localMod ? cloudSC : localSC;
          const mergedWeekNotes = mergeWeekNotes(
            freshLocal.weekNotes || [],
            cloudData.weekNotes || []
          );
          const localLP = freshLocal.launchPlan;
          const cloudLP = cloudData.launchPlan;
          const localLPMod = localLP?.lastModified ? new Date(localLP.lastModified).getTime() : 0;
          const cloudLPMod = cloudLP?.lastModified ? new Date(cloudLP.lastModified).getTime() : 0;
          const mergedLP = cloudLPMod > localLPMod ? cloudLP : localLP;
          const localDP = freshLocal.dayPlan;
          const cloudDP = cloudData.dayPlan;
          const localDPMod = localDP?.lastModified ? new Date(localDP.lastModified).getTime() : 0;
          const cloudDPMod = cloudDP?.lastModified ? new Date(cloudDP.lastModified).getTime() : 0;
          const mergedDP = cloudDPMod > localDPMod ? cloudDP : localDP;
          const merged: AppData = {
            ...cloudData,
            ...freshLocal,
            selfCare: mergedSelfCare,
            weekNotes: mergedWeekNotes,
            launchPlan: mergedLP,
            dayPlan: mergedDP,
            lastModified: now,
          };
          saveDataLocalOnly(merged);
          await immediateCloudSave(merged);
        } else {
          debouncedCloudSave(dataWithTimestamp);
        }
      } catch {
        debouncedCloudSave(dataWithTimestamp);
      }
    });
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
    // Merged students: initial roster + user-added students preserved
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
            // Merge media — local first so newer edits win dedup
            media: [...(localClassNotes.media || []), ...(existingClassNotes.media || [])].filter(
              (m, i, arr) => arr.findIndex(x => x.id === m.id) === i
            ),
            // Merge attendance
            attendance: localClassNotes.attendance || existingClassNotes.attendance,
            // Preserve class-level fields from whichever has content
            weekIdea: localClassNotes.weekIdea || existingClassNotes.weekIdea,
            nextWeekGoal: localClassNotes.nextWeekGoal || existingClassNotes.nextWeekGoal,
            carryForwardDismissed: localClassNotes.carryForwardDismissed || existingClassNotes.carryForwardDismissed,
          };
        }
      }

      merged.set(localWN.weekOf, {
        ...existing,
        ...localWN,
        classNotes: mergedClassNotes,
      });
    }
  }

  return Array.from(merged.values());
}

// Sync data from cloud - call this on app load
// Simple last-write-wins: whoever saved last wins the entire selfCare object
// force=true skips the grace period (used by pushToCloud and visibility change)
export async function syncFromCloud(force: boolean = false): Promise<AppData | null> {
  try {
    // If there was a recent local save, skip cloud sync to avoid race condition
    // The local data will be pushed to cloud by the pending save
    if (!force && wasRecentlySavedLocally()) {
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

    // === SIMPLE LAST-WRITE-WINS FOR ENTIRE selfCare OBJECT ===
    // Compare selfCareModified timestamps. The device that wrote last wins everything.
    // No per-field merge, no dose merge, no reminder dedup. Last save = new baseline.
    const localSelfCare = localData.selfCare || {};
    const cloudSelfCare = migratedCloudData.selfCare || {};
    const localMod = localSelfCare.selfCareModified ? new Date(localSelfCare.selfCareModified).getTime() : 0;
    const cloudMod = cloudSelfCare.selfCareModified ? new Date(cloudSelfCare.selfCareModified).getTime() : 0;
    const mergedSelfCare = cloudMod > localMod ? cloudSelfCare : localSelfCare;

    // === LAUNCH PLAN: last-write-wins via lastModified ===
    const localLP = localData.launchPlan;
    const cloudLP = migratedCloudData.launchPlan;
    const localLPMod = localLP?.lastModified ? new Date(localLP.lastModified).getTime() : 0;
    const cloudLPMod = cloudLP?.lastModified ? new Date(cloudLP.lastModified).getTime() : 0;
    const mergedLaunchPlan = cloudLPMod > localLPMod ? cloudLP : localLP;

    // === DAY PLAN: last-write-wins via lastModified ===
    const localDP = localData.dayPlan;
    const cloudDP = migratedCloudData.dayPlan;
    const localDPMod = localDP?.lastModified ? new Date(localDP.lastModified).getTime() : 0;
    const cloudDPMod = cloudDP?.lastModified ? new Date(cloudDP.lastModified).getTime() : 0;
    const mergedDayPlan = cloudDPMod > localDPMod ? cloudDP : localDP;

    // === AI CHECK-INS: union-merge by id ===
    const localCheckIns = localData.aiCheckIns || [];
    const cloudCheckIns = migratedCloudData.aiCheckIns || [];
    const checkInMap = new Map<string, typeof localCheckIns[0]>();
    // Cloud first, then local overwrites — local is authoritative for today
    cloudCheckIns.forEach(c => checkInMap.set(c.id, c));
    localCheckIns.forEach(c => checkInMap.set(c.id, c));
    const mergedCheckIns = Array.from(checkInMap.values());

    // Compare timestamps for base data resolution (but weekNotes are always merged)
    const cloudTime = migratedCloudData.lastModified ? new Date(migratedCloudData.lastModified).getTime() : 0;
    const localTime = localData.lastModified ? new Date(localData.lastModified).getTime() : 0;

    let baseData: AppData;
    if (cloudTime > localTime) {
      baseData = migratedCloudData;
    } else {
      baseData = localData;
    }

    // Create merged result - weekNotes always merged, selfCare + launchPlan + dayPlan + aiCheckIns are last-write-wins
    const mergedData: AppData = {
      ...baseData,
      weekNotes: mergedWeekNotes,
      selfCare: mergedSelfCare,
      launchPlan: mergedLaunchPlan,
      dayPlan: mergedDayPlan,
      aiCheckIns: mergedCheckIns,
      lastModified: new Date().toISOString(),
    };

    // Save merged data locally (uses quota guard)
    saveDataLocalOnly(mergedData);

    // Push merged data to cloud immediately so all devices converge
    immediateCloudSave(mergedData);

    return mergedData;
  } catch (error) {
    console.error('Failed to sync from cloud:', error);
    return null;
  }
}

// Save selfCare data with immediate cloud sync (no debounce)
// Medications are critical — must reach cloud before user locks phone
// Fetches cloud state first so we don't overwrite the other device's changes
export function saveSelfCareToStorage(updates: Partial<import('../types').SelfCareData>): void {
  const data = loadData();
  const now = new Date().toISOString();
  const updatedData = {
    ...data,
    selfCare: { ...data.selfCare, ...updates, selfCareModified: now },
  };
  const dataWithTimestamp = saveDataLocalOnly(updatedData);
  saveEvents.emit('saving');

  // Fetch cloud state, merge, then push — serialized via mutex
  withCloudMutex(async () => {
    try {
      const cloudData = await fetchCloudData();
      if (cloudData) {
        const cloudSelfCare = cloudData.selfCare || {};
        const mergedSelfCare = { ...cloudSelfCare, ...updates, selfCareModified: now };
        const mergedWeekNotes = mergeWeekNotes(data.weekNotes || [], cloudData.weekNotes || []);
        const merged: AppData = { ...cloudData, ...data, selfCare: mergedSelfCare, weekNotes: mergedWeekNotes, lastModified: now };
        saveDataLocalOnly(merged);
        await immediateCloudSave(merged);
      } else {
        await immediateCloudSave(dataWithTimestamp);
      }
    } catch {
      await immediateCloudSave(dataWithTimestamp);
    }
  });
}

// Save launch plan data with immediate cloud sync (same pattern as selfCare)
// Launch plan edits (completing tasks, adding notes) should persist ASAP
export function saveLaunchPlanToStorage(updates: Partial<LaunchPlanData>): void {
  const data = loadData();
  const now = new Date().toISOString();
  const currentPlan = data.launchPlan || { tasks: [], decisions: [], contacts: [], planStartDate: '2026-02-12', planEndDate: '2026-06-30', lastModified: now, version: 1 };
  const updatedPlan = { ...currentPlan, ...updates, lastModified: now };
  const updatedData = {
    ...data,
    launchPlan: updatedPlan,
  };
  console.log('[LaunchPlan] Saving locally:', updates.decisions ? `${(updates.decisions as any[]).filter(d => d.status === 'decided').length} decided` : 'task/contact update');
  const dataWithTimestamp = saveDataLocalOnly(updatedData);
  saveEvents.emit('saving');

  withCloudMutex(async () => {
    try {
      const cloudData = await fetchCloudData();
      if (cloudData) {
        // Re-read local data FRESH inside mutex to avoid stale closure
        const freshLocal = loadData();
        const cloudPlan = cloudData.launchPlan || currentPlan;
        const mergedPlan = { ...cloudPlan, ...updates, lastModified: now };
        const mergedWeekNotes = mergeWeekNotes(freshLocal.weekNotes || [], cloudData.weekNotes || []);
        const localSC = freshLocal.selfCare || {};
        const cloudSC = cloudData.selfCare || {};
        const localMod = (localSC as any).selfCareModified ? new Date((localSC as any).selfCareModified).getTime() : 0;
        const cloudMod = (cloudSC as any).selfCareModified ? new Date((cloudSC as any).selfCareModified).getTime() : 0;
        const mergedSelfCare = cloudMod > localMod ? cloudSC : localSC;
        const localDP = freshLocal.dayPlan;
        const cloudDP = cloudData.dayPlan;
        const localDPMod = localDP?.lastModified ? new Date(localDP.lastModified).getTime() : 0;
        const cloudDPMod = cloudDP?.lastModified ? new Date(cloudDP.lastModified).getTime() : 0;
        const mergedDP = cloudDPMod > localDPMod ? cloudDP : localDP;
        const merged: AppData = { ...cloudData, ...freshLocal, launchPlan: mergedPlan, selfCare: mergedSelfCare, weekNotes: mergedWeekNotes, dayPlan: mergedDP, lastModified: now };
        console.log('[LaunchPlan] Cloud merge done:', mergedPlan.decisions?.filter((d: any) => d.status === 'decided').length, 'decided');
        saveDataLocalOnly(merged);
        await immediateCloudSave(merged);
      } else {
        await immediateCloudSave(dataWithTimestamp);
      }
    } catch (err) {
      console.warn('[LaunchPlan] Cloud fetch failed, pushing local:', err);
      await immediateCloudSave(dataWithTimestamp);
    }
  });
}

// Save day plan with immediate cloud sync (same pattern as selfCare/launchPlan)
// Day plans need cross-device sync so both phone and laptop show the same plan
export function saveDayPlanToStorage(plan: import('../types').DayPlan): void {
  const data = loadData();
  const now = plan.lastModified || new Date().toISOString();
  const updatedData = {
    ...data,
    dayPlan: plan,
  };
  const dataWithTimestamp = saveDataLocalOnly(updatedData);
  saveEvents.emit('saving');

  withCloudMutex(async () => {
    try {
      const cloudData = await fetchCloudData();
      if (cloudData) {
        // Day plan: we just mutated it, so our version is authoritative
        // (timestamp-based merge only happens in syncFromCloud)

        // Re-read local data FRESH inside mutex to avoid stale closure
        const freshLocal = loadData();
        const mergedWeekNotes = mergeWeekNotes(freshLocal.weekNotes || [], cloudData.weekNotes || []);
        const localSC = freshLocal.selfCare || {};
        const cloudSC = cloudData.selfCare || {};
        const localSCMod = (localSC as any).selfCareModified ? new Date((localSC as any).selfCareModified).getTime() : 0;
        const cloudSCMod = (cloudSC as any).selfCareModified ? new Date((cloudSC as any).selfCareModified).getTime() : 0;
        const mergedSelfCare = cloudSCMod > localSCMod ? cloudSC : localSC;
        const localLP = freshLocal.launchPlan;
        const cloudLP = cloudData.launchPlan;
        const localLPMod = localLP?.lastModified ? new Date(localLP.lastModified).getTime() : 0;
        const cloudLPMod = cloudLP?.lastModified ? new Date(cloudLP.lastModified).getTime() : 0;
        const mergedLP = cloudLPMod > localLPMod ? cloudLP : localLP;

        const merged: AppData = {
          ...cloudData, ...freshLocal,
          dayPlan: plan,
          selfCare: mergedSelfCare,
          weekNotes: mergedWeekNotes,
          launchPlan: mergedLP,
          lastModified: now,
        };
        saveDataLocalOnly(merged);
        await immediateCloudSave(merged);
      } else {
        await immediateCloudSave(dataWithTimestamp);
      }
    } catch {
      await immediateCloudSave(dataWithTimestamp);
    }
  });
}

// Force sync: pull cloud, merge with local, push merged result back
// This replaces the old blind push that clobbered other devices' data
export async function pushToCloud(): Promise<boolean> {
  try {
    // Just trigger a full syncFromCloud which already merges + pushes
    const result = await syncFromCloud(true); // force = skip grace period
    return result !== null;
  } catch (e) {
    console.error('pushToCloud failed:', e);
    return false;
  }
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
  // Save locally first (instant)
  const dataWithTimestamp = saveDataLocalOnly(data);
  saveEvents.emit('saving');

  // Fetch cloud first, merge, then push — so we don't clobber other device's data
  // Serialized via mutex to prevent race conditions
  withCloudMutex(async () => {
    try {
      const cloudData = await fetchCloudData();
      if (cloudData) {
        // Re-read local data FRESH inside mutex to avoid stale closure
        const freshLocal = loadData();
        const now = new Date().toISOString();
        const mergedWeekNotes = mergeWeekNotes(freshLocal.weekNotes, cloudData.weekNotes || []);
        const localSC = freshLocal.selfCare || {};
        const cloudSC = cloudData.selfCare || {};
        const localMod = localSC.selfCareModified ? new Date(localSC.selfCareModified).getTime() : 0;
        const cloudMod = cloudSC.selfCareModified ? new Date(cloudSC.selfCareModified).getTime() : 0;
        const mergedSelfCare = cloudMod > localMod ? cloudSC : localSC;
        const localLP = freshLocal.launchPlan;
        const cloudLP = cloudData.launchPlan;
        const localLPMod = localLP?.lastModified ? new Date(localLP.lastModified).getTime() : 0;
        const cloudLPMod = cloudLP?.lastModified ? new Date(cloudLP.lastModified).getTime() : 0;
        const mergedLP = cloudLPMod > localLPMod ? cloudLP : localLP;
        const localDP = freshLocal.dayPlan;
        const cloudDP = cloudData.dayPlan;
        const localDPMod = localDP?.lastModified ? new Date(localDP.lastModified).getTime() : 0;
        const cloudDPMod = cloudDP?.lastModified ? new Date(cloudDP.lastModified).getTime() : 0;
        const mergedDP = cloudDPMod > localDPMod ? cloudDP : localDP;
        const merged: AppData = { ...cloudData, ...freshLocal, selfCare: mergedSelfCare, weekNotes: mergedWeekNotes, launchPlan: mergedLP, dayPlan: mergedDP, lastModified: now };
        saveDataLocalOnly(merged);
        await immediateCloudSave(merged);
      } else {
        await immediateCloudSave(dataWithTimestamp);
      }
    } catch {
      await immediateCloudSave(dataWithTimestamp);
    }
  });
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
