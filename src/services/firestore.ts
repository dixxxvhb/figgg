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
  DayPlan,
  AppSettings,
} from '../types';
import type { Choreography } from '../types/choreography';
import { migrateMediaItems, migrateMusicTrack, migrateStudentPhoto, isBase64DataUrl } from './firebaseStorage';

// ============================================================
// Helper: get user's root reference
// ============================================================
function requireDb() {
  if (!db) throw new Error('Firestore not configured');
  return db;
}

function userRef(userId: string) {
  return doc(requireDb(), 'users', userId);
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
  await setDoc(userDoc(userId, 'studios', studio.id), studio);
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
  await setDoc(userDoc(userId, 'classes', cls.id), cls);
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
  await setDoc(userDoc(userId, 'students', processedStudent.id), processedStudent);
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

  // Migrate base64 media in classNotes to Firebase Storage
  let processedNotes = weekNotes;
  const classNotesEntries = Object.entries(weekNotes.classNotes || {});
  const hasBase64Media = classNotesEntries.some(
    ([, cn]) => cn.media?.some(m => isBase64DataUrl(m.url))
  );

  if (hasBase64Media) {
    const migratedClassNotes: typeof weekNotes.classNotes = {};
    for (const [classId, cn] of classNotesEntries) {
      if (cn.media?.some(m => isBase64DataUrl(m.url))) {
        const migratedMedia = await migrateMediaItems(userId, cn.media, `weekNotes/${docId}/${classId}`);
        migratedClassNotes[classId] = { ...cn, media: migratedMedia };
      } else {
        migratedClassNotes[classId] = cn;
      }
    }
    processedNotes = { ...weekNotes, classNotes: migratedClassNotes };
  }

  await setDoc(userDoc(userId, 'weekNotes', docId), processedNotes);
}

// ============================================================
// TERMINOLOGY
// ============================================================
export async function getTerminology(userId: string): Promise<TerminologyEntry[]> {
  const snapshot = await getDocs(userCollection(userId, 'terminology'));
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as TerminologyEntry));
}

export async function saveTerminologyEntry(userId: string, entry: TerminologyEntry): Promise<void> {
  await setDoc(userDoc(userId, 'terminology', entry.id), entry);
}

// ============================================================
// COMPETITIONS
// ============================================================
export async function getCompetitions(userId: string): Promise<Competition[]> {
  const snapshot = await getDocs(userCollection(userId, 'competitions'));
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Competition));
}

export async function saveCompetition(userId: string, comp: Competition): Promise<void> {
  await setDoc(userDoc(userId, 'competitions', comp.id), comp);
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

  await setDoc(userDoc(userId, 'competitionDances', processedDance.id), processedDance);
}

export async function deleteCompetitionDanceDoc(userId: string, danceId: string): Promise<void> {
  await deleteDoc(userDoc(userId, 'competitionDances', danceId));
}

// ============================================================
// CHOREOGRAPHIES
// ============================================================
export async function getChoreographies(userId: string): Promise<Choreography[]> {
  const snapshot = await getDocs(userCollection(userId, 'choreographies'));
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as unknown as Choreography));
}

export async function saveChoreography(userId: string, choreo: Choreography): Promise<void> {
  await setDoc(userDoc(userId, 'choreographies', choreo.id), choreo);
}

export async function deleteChoreographyDoc(userId: string, choreoId: string): Promise<void> {
  await deleteDoc(userDoc(userId, 'choreographies', choreoId));
}

// ============================================================
// CALENDAR EVENTS
// ============================================================
export async function getCalendarEvents(userId: string): Promise<CalendarEvent[]> {
  const snapshot = await getDocs(userCollection(userId, 'calendarEvents'));
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as CalendarEvent));
}

export async function saveCalendarEvent(userId: string, event: CalendarEvent): Promise<void> {
  await setDoc(userDoc(userId, 'calendarEvents', event.id), event);
}

export async function deleteCalendarEventDoc(userId: string, eventId: string): Promise<void> {
  await deleteDoc(userDoc(userId, 'calendarEvents', eventId));
}

// ============================================================
// AI CHECK-INS
// ============================================================
export async function getAICheckIns(userId: string): Promise<AICheckIn[]> {
  const snapshot = await getDocs(userCollection(userId, 'aiCheckIns'));
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as AICheckIn));
}

export async function saveAICheckInDoc(userId: string, checkIn: AICheckIn): Promise<void> {
  await setDoc(userDoc(userId, 'aiCheckIns', checkIn.id), checkIn);
}

// ============================================================
// PROJECTS
// ============================================================
export async function getProjects(userId: string): Promise<Array<{ id: string; name: string; type: string; dancers: string; song: string; status: string; notes: string }>> {
  const snapshot = await getDocs(userCollection(userId, 'projects'));
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as any));
}

// ============================================================
// SINGLE DOCUMENT: SELF CARE
// ============================================================
export async function getSelfCare(userId: string): Promise<SelfCareData | undefined> {
  const snap = await getDoc(userDoc(userId, 'singletons', 'selfCare'));
  return snap.exists() ? (snap.data() as SelfCareData) : undefined;
}

export async function updateSelfCareDoc(userId: string, updates: Partial<SelfCareData>): Promise<void> {
  const ref = userDoc(userId, 'singletons', 'selfCare');
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, updates as Record<string, unknown>);
  } else {
    await setDoc(ref, updates);
  }
}

// ============================================================
// SINGLE DOCUMENT: DAY PLAN
// ============================================================
export async function getDayPlan(userId: string): Promise<DayPlan | undefined> {
  const snap = await getDoc(userDoc(userId, 'singletons', 'dayPlan'));
  return snap.exists() ? (snap.data() as DayPlan) : undefined;
}

export async function updateDayPlanDoc(userId: string, plan: DayPlan): Promise<void> {
  await setDoc(userDoc(userId, 'singletons', 'dayPlan'), plan);
}

// ============================================================
// SINGLE DOCUMENT: LAUNCH PLAN
// ============================================================
export async function getLaunchPlan(userId: string): Promise<LaunchPlanData | undefined> {
  const snap = await getDoc(userDoc(userId, 'singletons', 'launchPlan'));
  return snap.exists() ? (snap.data() as LaunchPlanData) : undefined;
}

export async function updateLaunchPlanDoc(userId: string, updates: Partial<LaunchPlanData>): Promise<void> {
  const ref = userDoc(userId, 'singletons', 'launchPlan');
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, updates as Record<string, unknown>);
  } else {
    await setDoc(ref, updates);
  }
}

// ============================================================
// SINGLE DOCUMENT: LEARNING DATA
// ============================================================
export async function getLearningData(userId: string): Promise<LearningData | undefined> {
  const snap = await getDoc(userDoc(userId, 'singletons', 'learningData'));
  return snap.exists() ? (snap.data() as LearningData) : undefined;
}

export async function updateLearningDataDoc(userId: string, data: LearningData): Promise<void> {
  await setDoc(userDoc(userId, 'singletons', 'learningData'), data);
}

// ============================================================
// SINGLE DOCUMENT: PROFILE (settings)
// ============================================================
export async function getProfile(userId: string): Promise<{ settings: AppSettings; lastModified?: string } | undefined> {
  const snap = await getDoc(userDoc(userId, 'singletons', 'profile'));
  return snap.exists() ? (snap.data() as { settings: AppSettings; lastModified?: string }) : undefined;
}

export async function updateProfile(userId: string, updates: { settings?: AppSettings; lastModified?: string }): Promise<void> {
  const ref = userDoc(userId, 'singletons', 'profile');
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, updates as Record<string, unknown>);
  } else {
    await setDoc(ref, updates);
  }
}

// ============================================================
// REAL-TIME LISTENERS
// ============================================================
export function onSelfCareSnapshot(
  userId: string,
  callback: (data: SelfCareData | undefined) => void
): Unsubscribe {
  return onSnapshot(userDoc(userId, 'singletons', 'selfCare'), (snap) => {
    callback(snap.exists() ? (snap.data() as SelfCareData) : undefined);
  });
}

export function onDayPlanSnapshot(
  userId: string,
  callback: (data: DayPlan | undefined) => void
): Unsubscribe {
  return onSnapshot(userDoc(userId, 'singletons', 'dayPlan'), (snap) => {
    callback(snap.exists() ? (snap.data() as DayPlan) : undefined);
  });
}

export function onLaunchPlanSnapshot(
  userId: string,
  callback: (data: LaunchPlanData | undefined) => void
): Unsubscribe {
  return onSnapshot(userDoc(userId, 'singletons', 'launchPlan'), (snap) => {
    callback(snap.exists() ? (snap.data() as LaunchPlanData) : undefined);
  });
}

// ============================================================
// LOAD ALL DATA — returns AppData shape for backward compatibility
// ============================================================
export async function loadAllData(userId: string): Promise<AppData> {
  const [
    studios,
    classes,
    weekNotes,
    terminology,
    competitions,
    competitionDances,
    calendarEvents,
    students,
    choreographies,
    aiCheckIns,
    selfCare,
    dayPlan,
    launchPlan,
    learningData,
    profile,
  ] = await Promise.all([
    getStudios(userId),
    getClasses(userId),
    getWeekNotesList(userId),
    getTerminology(userId),
    getCompetitions(userId),
    getCompetitionDances(userId),
    getCalendarEvents(userId),
    getStudents(userId),
    getChoreographies(userId),
    getAICheckIns(userId),
    getSelfCare(userId),
    getDayPlan(userId),
    getLaunchPlan(userId),
    getLearningData(userId),
    getProfile(userId),
  ]);

  return {
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
    choreographies,
    launchPlan,
    learningData,
    aiCheckIns,
    dayPlan,
  };
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
  addOp(b => b.set(userDoc(userId, 'singletons', 'profile'), {
    settings: data.settings || {},
    lastModified: data.lastModified || new Date().toISOString(),
  }));

  // Studios
  for (const studio of data.studios || []) {
    addOp(b => b.set(userDoc(userId, 'studios', studio.id), studio));
  }

  // Classes
  for (const cls of data.classes || []) {
    addOp(b => b.set(userDoc(userId, 'classes', cls.id), cls));
  }

  // Students
  for (const student of data.students || []) {
    addOp(b => b.set(userDoc(userId, 'students', student.id), student));
  }

  // WeekNotes — use weekOf as document ID
  for (const wn of data.weekNotes || []) {
    addOp(b => b.set(userDoc(userId, 'weekNotes', wn.weekOf), wn));
  }

  // Terminology
  for (const term of data.terminology || []) {
    addOp(b => b.set(userDoc(userId, 'terminology', term.id), term));
  }

  // Competitions
  for (const comp of data.competitions || []) {
    addOp(b => b.set(userDoc(userId, 'competitions', comp.id), comp));
  }

  // Competition Dances
  for (const dance of data.competitionDances || []) {
    addOp(b => b.set(userDoc(userId, 'competitionDances', dance.id), dance));
  }

  // Choreographies
  for (const choreo of data.choreographies || []) {
    addOp(b => b.set(userDoc(userId, 'choreographies', choreo.id), choreo));
  }

  // Calendar Events
  for (const event of data.calendarEvents || []) {
    addOp(b => b.set(userDoc(userId, 'calendarEvents', event.id), event));
  }

  // AI Check-ins
  for (const checkIn of data.aiCheckIns || []) {
    addOp(b => b.set(userDoc(userId, 'aiCheckIns', checkIn.id), checkIn));
  }

  // Self Care (singleton)
  if (data.selfCare) {
    addOp(b => b.set(userDoc(userId, 'singletons', 'selfCare'), data.selfCare!));
  }

  // Day Plan (singleton)
  if (data.dayPlan) {
    addOp(b => b.set(userDoc(userId, 'singletons', 'dayPlan'), data.dayPlan!));
  }

  // Launch Plan (singleton)
  if (data.launchPlan) {
    addOp(b => b.set(userDoc(userId, 'singletons', 'launchPlan'), data.launchPlan!));
  }

  // Learning Data (singleton)
  if (data.learningData) {
    addOp(b => b.set(userDoc(userId, 'singletons', 'learningData'), data.learningData!));
  }

  // Commit all batches
  batches.push(currentBatch);
  for (const batch of batches) {
    await batch.commit();
  }

  console.log(`Migration complete: ${batches.length} batch(es), ~${batches.length > 1 ? (batches.length - 1) * 450 + opCount : opCount} documents written`);
}
