import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  AppData,
  Studio,
  Class,
  WeekNotes,
  TerminologyEntry,
  Competition,
  CompetitionDance,
  CalendarEvent,
  Student,
  SelfCareData,
  LaunchPlanData,
  LearningData,
  AICheckIn,
  AIChatThread,
  DayPlan,
  DailyBriefing,
  AppSettings,
  TherapistData,
  MeditationData,
  GriefData,
  NudgeDismissState,
  FixItem,
} from '../types';
import { migrateMediaItems, migrateMusicTrack, migrateStudentPhoto, isBase64DataUrl } from './firebaseStorage';

// ============================================================
// Helper: strip undefined values (Firestore rejects them)
// ============================================================
function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripUndefined) as unknown as T;
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v !== undefined) {
      clean[k] = typeof v === 'object' && v !== null ? stripUndefined(v) : v;
    }
  }
  return clean as T;
}

// ============================================================
// Helper: get user's root reference
// ============================================================
function requireDb() {
  if (!db) throw new Error('Firestore not configured');
  return db;
}

function userCollection(userId: string, collectionName: string) {
  return collection(requireDb(), 'users', userId, collectionName);
}

function userDoc(userId: string, collectionName: string, docId: string) {
  return doc(requireDb(), 'users', userId, collectionName, docId);
}

// ============================================================
// STUDIOS
// ============================================================
export async function getStudios(userId: string): Promise<Studio[]> {
  const snapshot = await getDocs(userCollection(userId, 'studios'));
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Studio));
}

export async function saveStudio(userId: string, studio: Studio): Promise<void> {
  await setDoc(userDoc(userId, 'studios', studio.id), stripUndefined(studio));
}

export async function deleteStudio(userId: string, studioId: string): Promise<void> {
  await deleteDoc(userDoc(userId, 'studios', studioId));
}

// ============================================================
// CLASSES
// ============================================================
export async function getClasses(userId: string): Promise<Class[]> {
  const snapshot = await getDocs(userCollection(userId, 'classes'));
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Class));
}

export async function saveClass(userId: string, cls: Class): Promise<void> {
  await setDoc(userDoc(userId, 'classes', cls.id), stripUndefined(cls));
}

export async function deleteClassDoc(userId: string, classId: string): Promise<void> {
  await deleteDoc(userDoc(userId, 'classes', classId));
}

// ============================================================
// STUDENTS
// ============================================================
export async function getStudents(userId: string): Promise<Student[]> {
  const snapshot = await getDocs(userCollection(userId, 'students'));
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Student));
}

export async function saveStudent(userId: string, student: Student): Promise<void> {
  let processedStudent = student;
  // Migrate base64 photo to Firebase Storage
  if (student.photo && isBase64DataUrl(student.photo)) {
    const url = await migrateStudentPhoto(userId, student.photo, student.id);
    processedStudent = { ...student, photo: url };
  }
  await setDoc(userDoc(userId, 'students', processedStudent.id), stripUndefined(processedStudent));
}

export async function deleteStudentDoc(userId: string, studentId: string): Promise<void> {
  await deleteDoc(userDoc(userId, 'students', studentId));
}

// ============================================================
// WEEK NOTES
// ============================================================
export async function getWeekNotesList(userId: string): Promise<WeekNotes[]> {
  const snapshot = await getDocs(userCollection(userId, 'weekNotes'));
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as unknown as WeekNotes));
}

export async function saveWeekNotesDoc(userId: string, weekNotes: WeekNotes): Promise<void> {
  // Use weekOf as the document ID for natural lookup
  const docId = weekNotes.weekOf;
  const docRef = userDoc(userId, 'weekNotes', docId);

  // Migrate base64 media in classNotes to Firebase Storage
  const classNotesEntries = Object.entries(weekNotes.classNotes || {});
  const processedClassNotes: Record<string, unknown> = {};
  for (const [classId, cn] of classNotesEntries) {
    let processed = cn;
    if (cn.media?.some(m => isBase64DataUrl(m.url))) {
      const migratedMedia = await migrateMediaItems(userId, cn.media, `weekNotes/${docId}/${classId}`);
      processed = { ...cn, media: migratedMedia };
    }
    processedClassNotes[classId] = stripUndefined(processed);
  }

  // Use field-level updates so concurrent edits to DIFFERENT classes
  // don't overwrite each other (dot-notation targets individual class entries)
  const updates: Record<string, unknown> = { weekOf: weekNotes.weekOf };
  if (weekNotes.reflection !== undefined) updates.reflection = weekNotes.reflection;
  for (const [classId, classNotes] of Object.entries(processedClassNotes)) {
    updates[`classNotes.${classId}`] = classNotes;
  }

  try {
    await updateDoc(docRef, updates);
  } catch (e: unknown) {
    // Document doesn't exist yet — create it with full data
    if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'not-found') {
      await setDoc(docRef, stripUndefined({ ...weekNotes, classNotes: processedClassNotes }));
    } else {
      throw e;
    }
  }
}

// ============================================================
// TERMINOLOGY
// ============================================================
export async function getTerminology(userId: string): Promise<TerminologyEntry[]> {
  const snapshot = await getDocs(userCollection(userId, 'terminology'));
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as TerminologyEntry));
}

export async function saveTerminologyEntry(userId: string, entry: TerminologyEntry): Promise<void> {
  await setDoc(userDoc(userId, 'terminology', entry.id), stripUndefined(entry));
}

// ============================================================
// COMPETITIONS
// ============================================================
export async function getCompetitions(userId: string): Promise<Competition[]> {
  const snapshot = await getDocs(userCollection(userId, 'competitions'));
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Competition));
}

export async function saveCompetition(userId: string, comp: Competition): Promise<void> {
  await setDoc(userDoc(userId, 'competitions', comp.id), stripUndefined(comp));
}

export async function deleteCompetitionDoc(userId: string, compId: string): Promise<void> {
  await deleteDoc(userDoc(userId, 'competitions', compId));
}

// ============================================================
// COMPETITION DANCES
// ============================================================
export async function getCompetitionDances(userId: string): Promise<CompetitionDance[]> {
  const snapshot = await getDocs(userCollection(userId, 'competitionDances'));
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as CompetitionDance));
}

export async function saveCompetitionDance(userId: string, dance: CompetitionDance): Promise<void> {
  let processedDance = dance;

  // Migrate base64 media to Firebase Storage
  if (dance.media?.some(m => isBase64DataUrl(m.url))) {
    const migratedMedia = await migrateMediaItems(userId, dance.media, `dances/${dance.id}`);
    processedDance = { ...processedDance, media: migratedMedia };
  }

  // Migrate rehearsal note media
  if (dance.rehearsalNotes?.some(rn => rn.media?.some(m => isBase64DataUrl(m.url)))) {
    const migratedNotes = await Promise.all(
      dance.rehearsalNotes.map(async (rn) => {
        if (rn.media?.some(m => isBase64DataUrl(m.url))) {
          const migratedMedia = await migrateMediaItems(userId, rn.media, `dances/${dance.id}/rehearsals/${rn.id}`);
          return { ...rn, media: migratedMedia };
        }
        return rn;
      })
    );
    processedDance = { ...processedDance, rehearsalNotes: migratedNotes };
  }

  // Migrate music track
  if (dance.musicTrack?.url && isBase64DataUrl(dance.musicTrack.url)) {
    const url = await migrateMusicTrack(userId, dance.musicTrack.url, dance.id, dance.musicTrack.name);
    processedDance = { ...processedDance, musicTrack: { ...dance.musicTrack, url } };
  }

  await setDoc(userDoc(userId, 'competitionDances', processedDance.id), stripUndefined(processedDance));
}

export async function deleteCompetitionDanceDoc(userId: string, danceId: string): Promise<void> {
  await deleteDoc(userDoc(userId, 'competitionDances', danceId));
}

// ============================================================
// CALENDAR EVENTS
// ============================================================
export async function getCalendarEvents(userId: string): Promise<CalendarEvent[]> {
  const snapshot = await getDocs(userCollection(userId, 'calendarEvents'));
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as CalendarEvent));
}

export async function saveCalendarEvent(userId: string, event: CalendarEvent): Promise<void> {
  await setDoc(userDoc(userId, 'calendarEvents', event.id), stripUndefined(event));
}

export async function deleteCalendarEventDoc(userId: string, eventId: string): Promise<void> {
  await deleteDoc(userDoc(userId, 'calendarEvents', eventId));
}

export async function batchSaveCalendarEvents(userId: string, events: CalendarEvent[], deleteIds?: string[]): Promise<void> {
  if (events.length === 0 && (!deleteIds || deleteIds.length === 0)) return;
  // Combine saves and deletes into single batches so the snapshot fires once
  // with the final state, preventing UI flicker between save and delete
  const batches: Array<ReturnType<typeof writeBatch>> = [];
  let currentBatch = writeBatch(requireDb());
  let opCount = 0;
  for (const event of events) {
    if (opCount >= 450) {
      batches.push(currentBatch);
      currentBatch = writeBatch(requireDb());
      opCount = 0;
    }
    currentBatch.set(userDoc(userId, 'calendarEvents', event.id), stripUndefined(event));
    opCount++;
  }
  if (deleteIds) {
    for (const id of deleteIds) {
      if (opCount >= 450) {
        batches.push(currentBatch);
        currentBatch = writeBatch(requireDb());
        opCount = 0;
      }
      currentBatch.delete(userDoc(userId, 'calendarEvents', id));
      opCount++;
    }
  }
  batches.push(currentBatch);
  for (const batch of batches) {
    await batch.commit();
  }
}

export async function batchDeleteCalendarEvents(userId: string, eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return;
  const batches: Array<ReturnType<typeof writeBatch>> = [];
  let currentBatch = writeBatch(requireDb());
  let opCount = 0;
  for (const id of eventIds) {
    if (opCount >= 450) {
      batches.push(currentBatch);
      currentBatch = writeBatch(requireDb());
      opCount = 0;
    }
    currentBatch.delete(userDoc(userId, 'calendarEvents', id));
    opCount++;
  }
  batches.push(currentBatch);
  for (const batch of batches) {
    await batch.commit();
  }
}

// ============================================================
// AI CHECK-INS
// ============================================================
export async function getAICheckIns(userId: string): Promise<AICheckIn[]> {
  const snapshot = await getDocs(userCollection(userId, 'aiCheckIns'));
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as AICheckIn));
}

export async function saveAICheckInDoc(userId: string, checkIn: AICheckIn): Promise<void> {
  await setDoc(userDoc(userId, 'aiCheckIns', checkIn.id), stripUndefined(checkIn));
}

// ============================================================
// FIX ITEMS (app fixes logged by user, consumed by Cowork)
// ============================================================
export async function getFixItems(userId: string): Promise<FixItem[]> {
  const snapshot = await getDocs(userCollection(userId, 'fixItems'));
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as FixItem));
}

export async function saveFixItemDoc(userId: string, item: FixItem): Promise<void> {
  await setDoc(userDoc(userId, 'fixItems', item.id), stripUndefined(item));
}

export async function deleteFixItemDoc(userId: string, itemId: string): Promise<void> {
  await deleteDoc(userDoc(userId, 'fixItems', itemId));
}

export function onFixItemsSnapshot(
  userId: string,
  callback: (data: FixItem[]) => void
): Unsubscribe {
  return onSnapshot(userCollection(userId, 'fixItems'), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as FixItem)));
  }, (error) => { console.error('fixItems snapshot error:', error); });
}

// ============================================================
// PROJECTS
// ============================================================
export async function getProjects(userId: string): Promise<Array<{ id: string; name: string; type: string; dancers: string; song: string; status: string; notes: string }>> {
  const snapshot = await getDocs(userCollection(userId, 'projects'));
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as {
    id: string;
    name: string;
    type: string;
    dancers: string;
    song: string;
    status: string;
    notes: string;
  }));
}

// ============================================================
// SINGLE DOCUMENT: SELF CARE
// ============================================================
export async function getSelfCare(userId: string): Promise<SelfCareData | undefined> {
  const snap = await getDoc(userDoc(userId, 'singletons', 'selfCare'));
  return snap.exists() ? (snap.data() as SelfCareData) : undefined;
}

export async function updateSelfCareDoc(userId: string, updates: Partial<SelfCareData>): Promise<void> {
  await setDoc(userDoc(userId, 'singletons', 'selfCare'), stripUndefined(updates), { merge: true });
}

// ============================================================
// SINGLE DOCUMENT: DAY PLAN
// ============================================================
export async function getDayPlan(userId: string): Promise<DayPlan | undefined> {
  const snap = await getDoc(userDoc(userId, 'singletons', 'dayPlan'));
  return snap.exists() ? (snap.data() as DayPlan) : undefined;
}

export async function updateDayPlanDoc(userId: string, plan: DayPlan): Promise<void> {
  await setDoc(userDoc(userId, 'singletons', 'dayPlan'), stripUndefined(plan));
}

// ============================================================
// SINGLE DOCUMENT: LAUNCH PLAN
// ============================================================
export async function getLaunchPlan(userId: string): Promise<LaunchPlanData | undefined> {
  const snap = await getDoc(userDoc(userId, 'singletons', 'launchPlan'));
  return snap.exists() ? (snap.data() as LaunchPlanData) : undefined;
}

export async function updateLaunchPlanDoc(userId: string, updates: Partial<LaunchPlanData>): Promise<void> {
  await setDoc(userDoc(userId, 'singletons', 'launchPlan'), stripUndefined(updates), { merge: true });
}

// ============================================================
// SINGLE DOCUMENT: LEARNING DATA
// ============================================================
export async function getLearningData(userId: string): Promise<LearningData | undefined> {
  const snap = await getDoc(userDoc(userId, 'singletons', 'learningData'));
  return snap.exists() ? (snap.data() as LearningData) : undefined;
}

export async function updateLearningDataDoc(userId: string, data: LearningData): Promise<void> {
  await setDoc(userDoc(userId, 'singletons', 'learningData'), stripUndefined(data));
}

// ============================================================
// SINGLE DOCUMENT: PROFILE (settings)
// ============================================================
export async function getProfile(userId: string): Promise<{ settings: AppSettings; lastModified?: string } | undefined> {
  const snap = await getDoc(userDoc(userId, 'singletons', 'profile'));
  return snap.exists() ? (snap.data() as { settings: AppSettings; lastModified?: string }) : undefined;
}

export async function updateProfile(userId: string, updates: { settings?: AppSettings; lastModified?: string }): Promise<void> {
  await setDoc(userDoc(userId, 'singletons', 'profile'), stripUndefined(updates), { merge: true });
}

export function onProfileSnapshot(
  userId: string,
  callback: (data: { settings: AppSettings; lastModified?: string } | undefined) => void
): Unsubscribe {
  return onSnapshot(userDoc(userId, 'singletons', 'profile'), (snap) => {
    callback(snap.exists() ? (snap.data() as { settings: AppSettings; lastModified?: string }) : undefined);
  }, (error) => { console.error('profile snapshot error:', error); });
}

// ============================================================
// SINGLE DOCUMENT: THERAPIST DATA
// ============================================================
export async function getTherapist(userId: string): Promise<TherapistData | undefined> {
  const snap = await getDoc(userDoc(userId, 'singletons', 'therapist'));
  return snap.exists() ? (snap.data() as TherapistData) : undefined;
}

export async function updateTherapistDoc(userId: string, updates: Partial<TherapistData>): Promise<void> {
  await setDoc(userDoc(userId, 'singletons', 'therapist'), stripUndefined(updates), { merge: true });
}

// ============================================================
// SINGLE DOCUMENT: MEDITATION DATA
// ============================================================
export async function getMeditation(userId: string): Promise<MeditationData | undefined> {
  const snap = await getDoc(userDoc(userId, 'singletons', 'meditation'));
  return snap.exists() ? (snap.data() as MeditationData) : undefined;
}

export async function updateMeditationDoc(userId: string, updates: Partial<MeditationData>): Promise<void> {
  await setDoc(userDoc(userId, 'singletons', 'meditation'), stripUndefined(updates), { merge: true });
}

// ============================================================
// SINGLE DOCUMENT: GRIEF DATA
// ============================================================
export async function getGrief(userId: string): Promise<GriefData | undefined> {
  const snap = await getDoc(userDoc(userId, 'singletons', 'grief'));
  return snap.exists() ? (snap.data() as GriefData) : undefined;
}

export async function updateGriefDoc(userId: string, updates: Partial<GriefData>): Promise<void> {
  await setDoc(userDoc(userId, 'singletons', 'grief'), stripUndefined(updates), { merge: true });
}

// ============================================================
// SINGLE DOCUMENT: NUDGE STATE (cross-device dismiss/snooze)
// ============================================================
export async function updateNudgeStateDoc(userId: string, state: NudgeDismissState): Promise<void> {
  await setDoc(userDoc(userId, 'singletons', 'nudgeState'), stripUndefined(state));
}

// ============================================================
// REAL-TIME LISTENERS
// ============================================================
export function onTherapistSnapshot(
  userId: string,
  callback: (data: TherapistData | undefined) => void
): Unsubscribe {
  return onSnapshot(userDoc(userId, 'singletons', 'therapist'), (snap) => {
    callback(snap.exists() ? (snap.data() as TherapistData) : undefined);
  }, (error) => { console.error('therapist snapshot error:', error); });
}

export function onMeditationSnapshot(
  userId: string,
  callback: (data: MeditationData | undefined) => void
): Unsubscribe {
  return onSnapshot(userDoc(userId, 'singletons', 'meditation'), (snap) => {
    callback(snap.exists() ? (snap.data() as MeditationData) : undefined);
  }, (error) => { console.error('meditation snapshot error:', error); });
}

export function onGriefSnapshot(
  userId: string,
  callback: (data: GriefData | undefined) => void
): Unsubscribe {
  return onSnapshot(userDoc(userId, 'singletons', 'grief'), (snap) => {
    callback(snap.exists() ? (snap.data() as GriefData) : undefined);
  }, (error) => { console.error('grief snapshot error:', error); });
}

export function onNudgeStateSnapshot(
  userId: string,
  callback: (data: NudgeDismissState | undefined) => void
): Unsubscribe {
  return onSnapshot(userDoc(userId, 'singletons', 'nudgeState'), (snap) => {
    callback(snap.exists() ? (snap.data() as NudgeDismissState) : undefined);
  }, (error) => { console.error('nudgeState snapshot error:', error); });
}

export function onSelfCareSnapshot(
  userId: string,
  callback: (data: SelfCareData | undefined) => void
): Unsubscribe {
  return onSnapshot(userDoc(userId, 'singletons', 'selfCare'), (snap) => {
    callback(snap.exists() ? (snap.data() as SelfCareData) : undefined);
  }, (error) => { console.error('selfCare snapshot error:', error); });
}

export function onDayPlanSnapshot(
  userId: string,
  callback: (data: DayPlan | undefined) => void
): Unsubscribe {
  return onSnapshot(userDoc(userId, 'singletons', 'dayPlan'), (snap) => {
    callback(snap.exists() ? (snap.data() as DayPlan) : undefined);
  }, (error) => { console.error('dayPlan snapshot error:', error); });
}

export function onLaunchPlanSnapshot(
  userId: string,
  callback: (data: LaunchPlanData | undefined) => void
): Unsubscribe {
  return onSnapshot(userDoc(userId, 'singletons', 'launchPlan'), (snap) => {
    callback(snap.exists() ? (snap.data() as LaunchPlanData) : undefined);
  }, (error) => { console.error('launchPlan snapshot error:', error); });
}

// ============================================================
// AI CHAT THREADS (conversation memory)
// ============================================================
export async function getChatThreads(userId: string): Promise<AIChatThread[]> {
  const snapshot = await getDocs(userCollection(userId, 'chatThreads'));
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as AIChatThread))
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}

export async function saveChatThread(userId: string, thread: AIChatThread): Promise<void> {
  await setDoc(userDoc(userId, 'chatThreads', thread.id), stripUndefined(thread));
}

export async function deleteChatThread(userId: string, threadId: string): Promise<void> {
  await deleteDoc(userDoc(userId, 'chatThreads', threadId));
}

export async function updateDailyBriefingSummary(
  userId: string,
  date: string,
  summary: string
): Promise<void> {
  await setDoc(doc(requireDb(), 'users', userId, 'briefings', date), stripUndefined({ summary }), { merge: true });
}

export function onDailyBriefingSnapshot(
  userId: string,
  date: string,
  callback: (data: DailyBriefing | undefined) => void
): Unsubscribe {
  return onSnapshot(doc(requireDb(), 'users', userId, 'briefings', date), (snap) => {
    callback(snap.exists() ? ({ ...snap.data(), id: snap.id } as unknown as DailyBriefing) : undefined);
  }, (error) => { console.error('dailyBriefing snapshot error:', error); });
}

// ============================================================
// REAL-TIME COLLECTION LISTENERS
// ============================================================
export function onStudiosSnapshot(
  userId: string,
  callback: (data: Studio[]) => void
): Unsubscribe {
  return onSnapshot(userCollection(userId, 'studios'), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as Studio)));
  }, (error) => { console.error('studios snapshot error:', error); });
}

export function onClassesSnapshot(
  userId: string,
  callback: (data: Class[]) => void
): Unsubscribe {
  return onSnapshot(userCollection(userId, 'classes'), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as Class)));
  }, (error) => { console.error('classes snapshot error:', error); });
}

export function onStudentsSnapshot(
  userId: string,
  callback: (data: Student[]) => void
): Unsubscribe {
  return onSnapshot(userCollection(userId, 'students'), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as Student)));
  }, (error) => { console.error('students snapshot error:', error); });
}

export function onWeekNotesSnapshot(
  userId: string,
  callback: (data: WeekNotes[]) => void
): Unsubscribe {
  return onSnapshot(userCollection(userId, 'weekNotes'), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as unknown as WeekNotes)));
  }, (error) => { console.error('weekNotes snapshot error:', error); });
}

export function onCompetitionsSnapshot(
  userId: string,
  callback: (data: Competition[]) => void
): Unsubscribe {
  return onSnapshot(userCollection(userId, 'competitions'), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as Competition)));
  }, (error) => { console.error('competitions snapshot error:', error); });
}

export function onCompetitionDancesSnapshot(
  userId: string,
  callback: (data: CompetitionDance[]) => void
): Unsubscribe {
  return onSnapshot(userCollection(userId, 'competitionDances'), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as CompetitionDance)));
  }, (error) => { console.error('competitionDances snapshot error:', error); });
}

export function onCalendarEventsSnapshot(
  userId: string,
  callback: (data: CalendarEvent[]) => void
): Unsubscribe {
  return onSnapshot(userCollection(userId, 'calendarEvents'), (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as CalendarEvent)));
  }, (error) => { console.error('calendarEvents snapshot error:', error); });
}

// ============================================================
// LOAD ALL DATA — returns AppData shape for backward compatibility
// ============================================================
export async function loadAllData(userId: string): Promise<AppData> {
  return (await loadAllDataWithMeta(userId)).data;
}

export async function loadAllDataWithMeta(userId: string): Promise<{
  data: AppData;
  hasRemoteState: boolean;
}> {
  const [
    studios,
    classes,
    weekNotes,
    terminology,
    competitions,
    competitionDances,
    calendarEvents,
    students,
    aiCheckIns,
    selfCare,
    dayPlan,
    launchPlan,
    learningData,
    profile,
    therapist,
    meditation,
    grief,
    fixItems,
  ] = await Promise.all([
    getStudios(userId),
    getClasses(userId),
    getWeekNotesList(userId),
    getTerminology(userId),
    getCompetitions(userId),
    getCompetitionDances(userId),
    getCalendarEvents(userId),
    getStudents(userId),
    getAICheckIns(userId),
    getSelfCare(userId),
    getDayPlan(userId),
    getLaunchPlan(userId),
    getLearningData(userId),
    getProfile(userId),
    getTherapist(userId),
    getMeditation(userId),
    getGrief(userId),
    getFixItems(userId),
  ]);

  const data: AppData = {
    studios,
    classes,
    weekNotes,
    terminology,
    competitions,
    competitionDances,
    calendarEvents,
    settings: profile?.settings || {},
    lastModified: profile?.lastModified,
    students,
    selfCare,
    launchPlan,
    learningData,
    aiCheckIns,
    dayPlan,
    therapist,
    meditation,
    grief,
    fixItems,
  };

  const hasRemoteState = Boolean(
    profile ||
    selfCare ||
    dayPlan ||
    launchPlan ||
    learningData ||
    therapist ||
    meditation ||
    grief ||
    studios.length > 0 ||
    classes.length > 0 ||
    weekNotes.length > 0 ||
    terminology.length > 0 ||
    competitions.length > 0 ||
    competitionDances.length > 0 ||
    calendarEvents.length > 0 ||
    students.length > 0 ||
    aiCheckIns.length > 0 ||
    fixItems.length > 0
  );

  return { data, hasRemoteState };
}

// ============================================================
// MIGRATION: One-time transfer from AppData to Firestore
// ============================================================
export async function migrateDataToFirestore(data: AppData, userId: string): Promise<void> {
  // Firestore batches are limited to 500 writes per batch
  // We'll use multiple batches if needed
  const batches: Array<ReturnType<typeof writeBatch>> = [];
  let currentBatch = writeBatch(requireDb());
  let opCount = 0;

  function addOp(fn: (batch: ReturnType<typeof writeBatch>) => void) {
    if (opCount >= 450) {
      // Leave headroom below 500 limit
      batches.push(currentBatch);
      currentBatch = writeBatch(requireDb());
      opCount = 0;
    }
    fn(currentBatch);
    opCount++;
  }

  // Profile (settings + lastModified)
  addOp(b => b.set(userDoc(userId, 'singletons', 'profile'), stripUndefined({
    settings: data.settings || {},
    lastModified: data.lastModified || new Date().toISOString(),
  })));

  // Studios
  for (const studio of data.studios || []) {
    addOp(b => b.set(userDoc(userId, 'studios', studio.id), stripUndefined(studio)));
  }

  // Classes
  for (const cls of data.classes || []) {
    addOp(b => b.set(userDoc(userId, 'classes', cls.id), stripUndefined(cls)));
  }

  // Students
  for (const student of data.students || []) {
    addOp(b => b.set(userDoc(userId, 'students', student.id), stripUndefined(student)));
  }

  // WeekNotes — use weekOf as document ID
  for (const wn of data.weekNotes || []) {
    addOp(b => b.set(userDoc(userId, 'weekNotes', wn.weekOf), stripUndefined(wn)));
  }

  // Terminology
  for (const term of data.terminology || []) {
    addOp(b => b.set(userDoc(userId, 'terminology', term.id), stripUndefined(term)));
  }

  // Competitions
  for (const comp of data.competitions || []) {
    addOp(b => b.set(userDoc(userId, 'competitions', comp.id), stripUndefined(comp)));
  }

  // Competition Dances
  for (const dance of data.competitionDances || []) {
    addOp(b => b.set(userDoc(userId, 'competitionDances', dance.id), stripUndefined(dance)));
  }

  // Calendar Events
  for (const event of data.calendarEvents || []) {
    addOp(b => b.set(userDoc(userId, 'calendarEvents', event.id), stripUndefined(event)));
  }

  // AI Check-ins
  for (const checkIn of data.aiCheckIns || []) {
    addOp(b => b.set(userDoc(userId, 'aiCheckIns', checkIn.id), stripUndefined(checkIn)));
  }

  // Self Care (singleton)
  if (data.selfCare) {
    addOp(b => b.set(userDoc(userId, 'singletons', 'selfCare'), stripUndefined(data.selfCare!)));
  }

  // Day Plan (singleton)
  if (data.dayPlan) {
    addOp(b => b.set(userDoc(userId, 'singletons', 'dayPlan'), stripUndefined(data.dayPlan!)));
  }

  // Launch Plan (singleton)
  if (data.launchPlan) {
    addOp(b => b.set(userDoc(userId, 'singletons', 'launchPlan'), stripUndefined(data.launchPlan!)));
  }

  // Learning Data (singleton)
  if (data.learningData) {
    addOp(b => b.set(userDoc(userId, 'singletons', 'learningData'), stripUndefined(data.learningData!)));
  }

  // Therapist Data (singleton)
  if (data.therapist) {
    addOp(b => b.set(userDoc(userId, 'singletons', 'therapist'), stripUndefined(data.therapist!)));
  }

  // Meditation Data (singleton)
  if (data.meditation) {
    addOp(b => b.set(userDoc(userId, 'singletons', 'meditation'), stripUndefined(data.meditation!)));
  }

  // Grief Data (singleton)
  if (data.grief) {
    addOp(b => b.set(userDoc(userId, 'singletons', 'grief'), stripUndefined(data.grief!)));
  }

  // Commit all batches
  batches.push(currentBatch);
  for (const batch of batches) {
    await batch.commit();
  }

  console.log(`Migration complete: ${batches.length} batch(es), ~${batches.length > 1 ? (batches.length - 1) * 450 + opCount : opCount} documents written`);
}
