import { useState, useEffect, useCallback, useRef } from 'react';
import { AppData, AppSettings, Class, WeekNotes, Competition, CompetitionDance, Student, CalendarEvent, SelfCareData, LaunchPlanData } from '../types';
import type { AICheckIn, DayPlan, TherapistData, MeditationData, GriefData, DailyBriefing, NudgeDismissState, FixItem } from '../types';
import { loadData, saveData, saveWeekNotes as saveWeekNotesToStorage, saveSelfCareToStorage, saveLaunchPlanToStorage, saveDayPlanToStorage, saveTherapistToStorage, saveMeditationToStorage, saveGriefToStorage } from '../services/storage';
import { runLearningEngine } from '../services/learningEngine';
import { getWeekStart, formatWeekOf, toDateStr } from '../utils/time';
import { v4 as uuid } from 'uuid';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  loadAllData,
  onSelfCareSnapshot,
  onDayPlanSnapshot,
  onLaunchPlanSnapshot,
  onStudiosSnapshot,
  onClassesSnapshot,
  onStudentsSnapshot,
  onWeekNotesSnapshot,
  onCompetitionsSnapshot,
  onCompetitionDancesSnapshot,
  onCalendarEventsSnapshot,
  onDailyBriefingSnapshot,
  saveClass as firestoreSaveClass,
  deleteClassDoc,
  saveStudent as firestoreSaveStudent,
  deleteStudentDoc,
  saveWeekNotesDoc,
  saveCompetition as firestoreSaveCompetition,
  deleteCompetitionDoc,
  saveCompetitionDance as firestoreSaveCompetitionDance,
  deleteCompetitionDanceDoc,
  saveStudio as firestoreSaveStudio,
  saveCalendarEvent as firestoreSaveCalendarEvent,
  deleteCalendarEventDoc,
  saveAICheckInDoc,
  updateSelfCareDoc,
  updateDayPlanDoc,
  updateLaunchPlanDoc,
  updateProfile,
  updateTherapistDoc,
  updateMeditationDoc,
  updateGriefDoc,
  onTherapistSnapshot,
  onMeditationSnapshot,
  onGriefSnapshot,
  updateLearningDataDoc,
  onNudgeStateSnapshot,
  onProfileSnapshot,
  updateNudgeStateDoc,
  onFixItemsSnapshot,
  saveFixItemDoc,
  deleteFixItemDoc,
} from '../services/firestore';

// Helper: get current user ID or null
function getUserId(): string | null {
  return auth?.currentUser?.uid ?? null;
}

export function useAppData() {
  const [data, setData] = useState<AppData>(() => loadData());
  const isInitialMount = useRef(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track when this instance is the one saving, to avoid reacting to our own event
  const isSavingRef = useRef(false);
  // Track selfCare-only updates — saveSelfCareToStorage already handles cloud sync,
  // so the useEffect saveData call should skip cloud push to avoid racing
  const selfCareOnlyRef = useRef(false);
  // Same pattern for launch plan updates
  const launchPlanOnlyRef = useRef(false);
  // Same pattern for day plan updates
  const dayPlanOnlyRef = useRef(false);
  // Same pattern for wellness singletons
  const therapistOnlyRef = useRef(false);
  const meditationOnlyRef = useRef(false);
  const griefOnlyRef = useRef(false);
  // Track calendar sync updates — SyncContext already handles Firestore batch writes,
  // so the save effect should skip to avoid racing partial snapshot data
  const calendarSyncOnlyRef = useRef(false);
  // Track Firestore write failures — warn user after repeated failures
  const writeFailCountRef = useRef(0);
  const writeFailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnCooldownRef = useRef(false);
  // Plain function (not useCallback) — only uses refs, no deps needed.
  // Adding a useCallback here would change the hook count and break HMR.
  function trackWriteFail() {
    writeFailCountRef.current++;
    if (!writeFailTimerRef.current) {
      writeFailTimerRef.current = setTimeout(() => {
        writeFailCountRef.current = 0;
        writeFailTimerRef.current = null;
      }, 60_000);
    }
    // Threshold 5 (was 3) + 2-minute cooldown to avoid spamming during transient blips
    if (writeFailCountRef.current >= 5 && !warnCooldownRef.current) {
      window.dispatchEvent(new CustomEvent('figgg-sync-warning', {
        detail: 'Cloud sync issues — changes saved locally',
      }));
      writeFailCountRef.current = 0;
      warnCooldownRef.current = true;
      setTimeout(() => { warnCooldownRef.current = false; }, 120_000);
    }
  }
  function trackWriteSuccess() {
    if (writeFailCountRef.current > 0) {
      writeFailCountRef.current = 0;
      if (writeFailTimerRef.current) {
        clearTimeout(writeFailTimerRef.current);
        writeFailTimerRef.current = null;
      }
      // Dismiss any visible sync warning now that writes are succeeding again
      window.dispatchEvent(new CustomEvent('figgg-sync-recovered'));
    }
  }

  // Track active snapshot updates. Uses boolean + queueMicrotask instead of counter
  // to avoid React 18 batching issue where N snapshot callbacks increment by N but
  // the save effect only decrements by 1, suppressing subsequent user saves.
  const isSnapshotUpdate = useRef(false);

  // Run learning engine on app open (generates yesterday's snapshot if missing)
  useEffect(() => {
    const updated = runLearningEngine();
    if (updated) {
      const newData = loadData();
      setData(prev => ({ ...prev, ...newData }));
      // Push learningData to Firestore so it syncs across devices
      const uid = getUserId();
      if (uid && newData.learningData) {
        updateLearningDataDoc(uid, newData.learningData).catch(console.warn);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load data from Firestore on mount (overlays localStorage data)
  useEffect(() => {
    const user = auth?.currentUser;
    if (!user) return;

    loadAllData(user.uid).then(firestoreData => {
      // Only use Firestore data if it has content (migration has been run)
      const hasFirestoreData = firestoreData.classes.length > 0
        || firestoreData.studios.length > 0
        || firestoreData.selfCare
        || firestoreData.launchPlan
        || firestoreData.dayPlan
        || (firestoreData.students && firestoreData.students.length > 0)
        || firestoreData.weekNotes.length > 0;
      if (hasFirestoreData) {
        // Preserve seed/localStorage data for collections not yet migrated to Firestore.
        // Without this, Firestore's empty arrays wipe out seed studios, classes, etc.
        const localData = loadData();
        setData(prev => {
          const mergedData = {
            ...prev,
            ...firestoreData,
            classes: firestoreData.classes.length > 0 ? firestoreData.classes : localData.classes,
            studios: firestoreData.studios.length > 0 ? firestoreData.studios : localData.studios,
            competitions: firestoreData.competitions.length > 0 ? firestoreData.competitions : localData.competitions,
            competitionDances: firestoreData.competitionDances.length > 0 ? firestoreData.competitionDances : localData.competitionDances,
            terminology: firestoreData.terminology.length > 0 ? firestoreData.terminology : localData.terminology,
            students: (firestoreData.students?.length ?? 0) > 0 ? firestoreData.students : localData.students,
            weekNotes: firestoreData.weekNotes.length > 0 ? firestoreData.weekNotes : localData.weekNotes,
          };
          // Also update localStorage cache for offline use
          try {
            localStorage.setItem('dance-teaching-app-data', JSON.stringify({
              ...mergedData,
              lastModified: new Date().toISOString(),
            }));
          } catch {
            // localStorage write failed — not critical
          }
          return mergedData;
        });
      }
    }).catch(err => {
      console.warn('Firestore load failed, using localStorage:', err);
    });
  }, []);

  // Set up Firestore real-time listeners once auth is ready.
  // auth.currentUser is null on mount (Firebase restores session async),
  // so we wait for onAuthStateChanged to fire before starting listeners.
  useEffect(() => {
    if (!auth) return;

    let listenerUnsubs: (() => void)[] = [];

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      // Tear down previous listeners (e.g. if user signs out then back in)
      listenerUnsubs.forEach(fn => fn());
      listenerUnsubs = [];

      if (!user) return;

      // Singleton listeners
      listenerUnsubs.push(onSelfCareSnapshot(user.uid, (selfCare) => {
        if (selfCare) {
          isSnapshotUpdate.current = true; queueMicrotask(() => { isSnapshotUpdate.current = false; });
          setData(prev => ({ ...prev, selfCare }));
        }
      }));

      listenerUnsubs.push(onDayPlanSnapshot(user.uid, (dayPlan) => {
        if (dayPlan) {
          isSnapshotUpdate.current = true; queueMicrotask(() => { isSnapshotUpdate.current = false; });
          setData(prev => ({ ...prev, dayPlan }));
        }
      }));

      listenerUnsubs.push(onLaunchPlanSnapshot(user.uid, (launchPlan) => {
        if (launchPlan) {
          isSnapshotUpdate.current = true; queueMicrotask(() => { isSnapshotUpdate.current = false; });
          setData(prev => ({ ...prev, launchPlan }));
        }
      }));

      // Daily briefing listener (read-only, generated by Cloud Function)
      // Supports date rollover: re-subscribes when date changes (app open past midnight)
      let briefingUnsub: (() => void) | null = null;
      let currentBriefingDate = new Date().toISOString().slice(0, 10);

      function setupBriefingListener(uid: string, dateStr: string) {
        briefingUnsub?.();
        briefingUnsub = onDailyBriefingSnapshot(uid, dateStr, (dailyBriefing) => {
          isSnapshotUpdate.current = true; queueMicrotask(() => { isSnapshotUpdate.current = false; });
          setData(prev => ({ ...prev, dailyBriefing }));
        });
      }
      setupBriefingListener(user.uid, currentBriefingDate);
      listenerUnsubs.push(() => briefingUnsub?.());

      // Check for date rollover every 60s
      const dateCheckInterval = setInterval(() => {
        const now = new Date().toISOString().slice(0, 10);
        if (now !== currentBriefingDate) {
          currentBriefingDate = now;
          setupBriefingListener(user.uid, now);
        }
      }, 60_000);
      listenerUnsubs.push(() => clearInterval(dateCheckInterval));

      listenerUnsubs.push(onTherapistSnapshot(user.uid, (therapist) => {
        if (therapist) {
          isSnapshotUpdate.current = true; queueMicrotask(() => { isSnapshotUpdate.current = false; });
          setData(prev => ({ ...prev, therapist }));
        }
      }));

      listenerUnsubs.push(onMeditationSnapshot(user.uid, (meditation) => {
        if (meditation) {
          isSnapshotUpdate.current = true; queueMicrotask(() => { isSnapshotUpdate.current = false; });
          setData(prev => ({ ...prev, meditation }));
        }
      }));

      listenerUnsubs.push(onGriefSnapshot(user.uid, (grief) => {
        if (grief) {
          isSnapshotUpdate.current = true; queueMicrotask(() => { isSnapshotUpdate.current = false; });
          setData(prev => ({ ...prev, grief }));
        }
      }));

      listenerUnsubs.push(onNudgeStateSnapshot(user.uid, (nudgeState) => {
        isSnapshotUpdate.current = true; queueMicrotask(() => { isSnapshotUpdate.current = false; });
        setData(prev => ({ ...prev, nudgeState: nudgeState || { dismissed: {}, snoozed: {} } }));
      }));

      listenerUnsubs.push(onProfileSnapshot(user.uid, (profile) => {
        if (profile?.settings) {
          isSnapshotUpdate.current = true; queueMicrotask(() => { isSnapshotUpdate.current = false; });
          setData(prev => ({ ...prev, settings: { ...prev.settings, ...profile.settings } }));
        }
      }));

      listenerUnsubs.push(onFixItemsSnapshot(user.uid, (fixItems) => {
        isSnapshotUpdate.current = true; queueMicrotask(() => { isSnapshotUpdate.current = false; });
        setData(prev => ({ ...prev, fixItems }));
      }));

      // Collection listeners for cross-device sync
      listenerUnsubs.push(onClassesSnapshot(user.uid, (classes) => {
        if (classes.length > 0) {
          isSnapshotUpdate.current = true; queueMicrotask(() => { isSnapshotUpdate.current = false; });
          setData(prev => ({ ...prev, classes }));
        }
      }));

      listenerUnsubs.push(onStudentsSnapshot(user.uid, (students) => {
        isSnapshotUpdate.current = true; queueMicrotask(() => { isSnapshotUpdate.current = false; });
        setData(prev => ({ ...prev, students }));
      }));

      listenerUnsubs.push(onWeekNotesSnapshot(user.uid, (weekNotes) => {
        if (weekNotes.length > 0) {
          isSnapshotUpdate.current = true; queueMicrotask(() => { isSnapshotUpdate.current = false; });
          setData(prev => ({ ...prev, weekNotes }));
        }
      }));

      listenerUnsubs.push(onCompetitionsSnapshot(user.uid, (competitions) => {
        isSnapshotUpdate.current = true; queueMicrotask(() => { isSnapshotUpdate.current = false; });
        setData(prev => ({ ...prev, competitions }));
      }));

      listenerUnsubs.push(onCompetitionDancesSnapshot(user.uid, (competitionDances) => {
        isSnapshotUpdate.current = true; queueMicrotask(() => { isSnapshotUpdate.current = false; });
        setData(prev => ({ ...prev, competitionDances }));
      }));

      listenerUnsubs.push(onStudiosSnapshot(user.uid, (studios) => {
        if (studios.length > 0) {
          isSnapshotUpdate.current = true; queueMicrotask(() => { isSnapshotUpdate.current = false; });
          setData(prev => ({ ...prev, studios }));
        }
      }));

      listenerUnsubs.push(onCalendarEventsSnapshot(user.uid, (calendarEvents) => {
        isSnapshotUpdate.current = true; queueMicrotask(() => { isSnapshotUpdate.current = false; });
        setData(prev => ({ ...prev, calendarEvents }));
      }));

    });

    return () => {
      unsubAuth();
      listenerUnsubs.forEach(fn => fn());
    };
  }, []);

  // Save whenever data changes (skip initial mount to avoid double-save)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Skip save if this update came from a Firestore snapshot listener
    if (isSnapshotUpdate.current) {
      return;
    }

    // If this change was from updateSelfCare, saveSelfCareToStorage already
    // pushed to cloud with proper partial merge. Only save locally here to
    // avoid a racing whole-object last-write-wins push from saveData.
    if (selfCareOnlyRef.current) {
      selfCareOnlyRef.current = false;
      return;
    }

    // Same for launch plan — saveLaunchPlanToStorage already handles cloud push
    if (launchPlanOnlyRef.current) {
      launchPlanOnlyRef.current = false;
      return;
    }

    // Same for day plan — saveDayPlanToStorage already handles cloud push
    if (dayPlanOnlyRef.current) {
      dayPlanOnlyRef.current = false;
      return;
    }

    // Same for wellness singletons
    if (therapistOnlyRef.current) {
      therapistOnlyRef.current = false;
      return;
    }
    if (meditationOnlyRef.current) {
      meditationOnlyRef.current = false;
      return;
    }
    if (griefOnlyRef.current) {
      griefOnlyRef.current = false;
      return;
    }
    // Same for calendar sync — SyncContext batch writes to Firestore directly
    if (calendarSyncOnlyRef.current) {
      calendarSyncOnlyRef.current = false;
      return;
    }

    // Immediate local save, debounced cloud save happens inside saveData
    isSavingRef.current = true;
    saveData(data);
    // Reset after microtask so the event listener doesn't pick up our own save
    Promise.resolve().then(() => { isSavingRef.current = false; });
  }, [data]);

  const updateClass = useCallback((updatedClass: Class) => {
    setData(prev => ({
      ...prev,
      classes: prev.classes.map(c =>
        c.id === updatedClass.id ? updatedClass : c
      ),
    }));
    // Firestore write (fire-and-forget)
    const uid = getUserId();
    if (uid) firestoreSaveClass(uid, updatedClass).then(trackWriteSuccess).catch(e => { console.warn(e); trackWriteFail(); });
  }, []);

  const addClass = useCallback((newClass: Omit<Class, 'id'>) => {
    const classWithId: Class = { ...newClass, id: uuid() };
    setData(prev => ({
      ...prev,
      classes: [...prev.classes, classWithId],
    }));
    const uid = getUserId();
    if (uid) firestoreSaveClass(uid, classWithId).catch(console.warn);
    return classWithId;
  }, []);

  const deleteClass = useCallback((classId: string) => {
    setData(prev => {
      // Also update students in Firestore (cascade)
      const uid = getUserId();
      if (uid) {
        const affectedStudents = (prev.students || []).filter(s => s.classIds?.includes(classId));
        for (const s of affectedStudents) {
          firestoreSaveStudent(uid, { ...s, classIds: (s.classIds || []).filter(id => id !== classId) }).catch(console.warn);
        }
      }
      return {
        ...prev,
        classes: prev.classes.filter(c => c.id !== classId),
        students: (prev.students || []).map(s =>
          s.classIds?.includes(classId)
            ? { ...s, classIds: (s.classIds || []).filter(id => id !== classId) }
            : s
        ),
      };
    });
    const uid = getUserId();
    if (uid) deleteClassDoc(uid, classId).catch(console.warn);
  }, []);

  const getWeekNotes = useCallback((weekOf: string): WeekNotes | undefined => {
    return data.weekNotes.find(w => w.weekOf === weekOf);
  }, [data.weekNotes]);

  const getCurrentWeekNotes = useCallback((): WeekNotes => {
    const weekOf = formatWeekOf(getWeekStart());
    const existing = data.weekNotes.find(w => w.weekOf === weekOf);
    if (existing) return existing;

    // Create new week notes
    return {
      id: uuid(),
      weekOf,
      classNotes: {},
    };
  }, [data.weekNotes]);

  const saveWeekNotes = useCallback((weekNotes: WeekNotes) => {
    // Use the storage version directly for immediate cloud sync
    // This ensures notes are saved reliably even if the app closes
    saveWeekNotesToStorage(weekNotes);

    // Also update React state so UI reflects changes immediately
    setData(prev => {
      const index = prev.weekNotes.findIndex(w => w.weekOf === weekNotes.weekOf);
      if (index !== -1) {
        const updated = [...prev.weekNotes];
        updated[index] = weekNotes;
        return { ...prev, weekNotes: updated };
      }
      return { ...prev, weekNotes: [...prev.weekNotes, weekNotes] };
    });

    // Firestore write
    const uid = getUserId();
    if (uid) saveWeekNotesDoc(uid, weekNotes).then(trackWriteSuccess).catch(e => { console.warn(e); trackWriteFail(); });
  }, []);

  const updateCompetition = useCallback((competition: Competition) => {
    setData(prev => {
      const index = prev.competitions.findIndex(c => c.id === competition.id);
      if (index !== -1) {
        const updated = [...prev.competitions];
        updated[index] = competition;
        return { ...prev, competitions: updated };
      }
      return { ...prev, competitions: [...prev.competitions, competition] };
    });
    const uid = getUserId();
    if (uid) firestoreSaveCompetition(uid, competition).catch(console.warn);
  }, []);

  const deleteCompetition = useCallback((competitionId: string) => {
    setData(prev => {
      // Cascade: delete orphaned dances from Firestore
      const uid = getUserId();
      if (uid) {
        const orphanedDances = (prev.competitionDances || []).filter(d => {
          const otherComps = prev.competitions.filter(c => c.id !== competitionId);
          return !otherComps.some(c => c.dances?.includes(d.id));
        });
        for (const d of orphanedDances) {
          deleteCompetitionDanceDoc(uid, d.id).catch(console.warn);
        }
      }
      return {
        ...prev,
        competitions: prev.competitions.filter(c => c.id !== competitionId),
        competitionDances: (prev.competitionDances || []).filter(d => {
          const otherComps = prev.competitions.filter(c => c.id !== competitionId);
          return otherComps.some(c => c.dances?.includes(d.id));
        }),
      };
    });
    const uid = getUserId();
    if (uid) deleteCompetitionDoc(uid, competitionId).catch(console.warn);
  }, []);

  const updateCompetitionDance = useCallback((dance: CompetitionDance) => {
    setData(prev => {
      const dances = prev.competitionDances || [];
      const index = dances.findIndex(d => d.id === dance.id);
      if (index !== -1) {
        const updated = [...dances];
        updated[index] = dance;
        return { ...prev, competitionDances: updated };
      }
      return { ...prev, competitionDances: [...dances, dance] };
    });
    const uid = getUserId();
    if (uid) firestoreSaveCompetitionDance(uid, dance).catch(console.warn);
  }, []);

  const deleteCompetitionDance = useCallback((danceId: string) => {
    setData(prev => {
      // Cascade: update competitions and classes in Firestore
      const uid = getUserId();
      if (uid) {
        // Update competitions that reference this dance
        for (const c of prev.competitions) {
          if (c.dances?.includes(danceId)) {
            firestoreSaveCompetition(uid, { ...c, dances: (c.dances || []).filter(id => id !== danceId) }).catch(console.warn);
          }
        }
        // Update classes that link to this dance
        for (const c of prev.classes) {
          if (c.competitionDanceId === danceId) {
            firestoreSaveClass(uid, { ...c, competitionDanceId: undefined }).catch(console.warn);
          }
        }
      }
      return {
        ...prev,
        competitionDances: (prev.competitionDances || []).filter(d => d.id !== danceId),
        competitions: prev.competitions.map(c =>
          c.dances?.includes(danceId)
            ? { ...c, dances: (c.dances || []).filter(id => id !== danceId) }
            : c
        ),
        classes: prev.classes.map(c =>
          c.competitionDanceId === danceId
            ? { ...c, competitionDanceId: undefined }
            : c
        ),
      };
    });
    const uid = getUserId();
    if (uid) deleteCompetitionDanceDoc(uid, danceId).catch(console.warn);
  }, []);

  const updateStudio = useCallback((studioId: string, updates: Partial<{ address: string; coordinates: { lat: number; lng: number } }>) => {
    setData(prev => {
      const studio = prev.studios.find(s => s.id === studioId);
      if (studio) {
        const updated = { ...studio, ...updates };
        const uid = getUserId();
        if (uid) firestoreSaveStudio(uid, updated).catch(console.warn);
      }
      return {
        ...prev,
        studios: prev.studios.map(s =>
          s.id === studioId ? { ...s, ...updates } : s
        ),
      };
    });
  }, []);

  const refreshData = useCallback(() => {
    // Try Firestore first, fall back to localStorage
    // Use functional setData to preserve real-time listener fields (dailyBriefing, etc.)
    const user = auth?.currentUser;
    if (user) {
      loadAllData(user.uid).then(firestoreData => {
        if (firestoreData.classes.length > 0 || firestoreData.studios.length > 0) {
          setData(prev => ({ ...prev, ...firestoreData }));
        } else {
          setData(prev => ({ ...prev, ...loadData() }));
        }
      }).catch(() => {
        setData(prev => ({ ...prev, ...loadData() }));
      });
    } else {
      setData(prev => ({ ...prev, ...loadData() }));
    }
  }, []);

  // Listen for cloud sync events and local saves from other hook instances
  useEffect(() => {
    const handleCloudSync = () => {
      setData(prev => ({ ...prev, ...loadData() }));
    };

    const handleLocalSave = () => {
      if (!isSavingRef.current) {
        setData(prev => ({ ...prev, ...loadData() }));
      }
    };

    const handleCalendarEventsSaved = () => {
      calendarSyncOnlyRef.current = true;
      setData(prev => ({ ...prev, calendarEvents: loadData().calendarEvents }));
    };

    window.addEventListener('cloud-sync-complete', handleCloudSync);
    window.addEventListener('local-data-saved', handleLocalSave);
    window.addEventListener('calendar-events-saved', handleCalendarEventsSaved);

    return () => {
      window.removeEventListener('cloud-sync-complete', handleCloudSync);
      window.removeEventListener('local-data-saved', handleLocalSave);
      window.removeEventListener('calendar-events-saved', handleCalendarEventsSaved);
    };
  }, []);

  // Student management
  const addStudent = useCallback((studentData: Omit<Student, 'id' | 'createdAt' | 'skillNotes'>) => {
    const newStudent: Student = {
      ...studentData,
      id: uuid(),
      skillNotes: [],
      createdAt: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      students: [...(prev.students || []), newStudent],
    }));
    const uid = getUserId();
    if (uid) firestoreSaveStudent(uid, newStudent).then(trackWriteSuccess).catch(e => { console.warn(e); trackWriteFail(); });
    return newStudent;
  }, []);

  const updateStudent = useCallback((student: Student) => {
    setData(prev => {
      const students = prev.students || [];
      const index = students.findIndex(s => s.id === student.id);
      if (index !== -1) {
        const updated = [...students];
        updated[index] = student;
        return { ...prev, students: updated };
      }
      return { ...prev, students: [...students, student] };
    });
    const uid = getUserId();
    if (uid) firestoreSaveStudent(uid, student).then(trackWriteSuccess).catch(e => { console.warn(e); trackWriteFail(); });
  }, []);

  const deleteStudent = useCallback((studentId: string) => {
    setData(prev => {
      // Cascade: update competition dances in Firestore
      const uid = getUserId();
      if (uid) {
        for (const d of (prev.competitionDances || [])) {
          if (d.dancerIds?.includes(studentId)) {
            firestoreSaveCompetitionDance(uid, { ...d, dancerIds: (d.dancerIds || []).filter(id => id !== studentId) }).catch(console.warn);
          }
        }
      }
      return {
        ...prev,
        students: (prev.students || []).filter(s => s.id !== studentId),
        competitionDances: (prev.competitionDances || []).map(d =>
          d.dancerIds?.includes(studentId)
            ? { ...d, dancerIds: (d.dancerIds || []).filter(id => id !== studentId) }
            : d
        ),
      };
    });
    const uid = getUserId();
    if (uid) deleteStudentDoc(uid, studentId).catch(console.warn);
  }, []);

  // Self-care (meds + reminders) — uses immediate cloud save, not debounced
  const updateSelfCare = useCallback((updates: Partial<SelfCareData>) => {
    // Save to storage with immediate cloud sync (like saveWeekNotes)
    saveSelfCareToStorage(updates);

    selfCareOnlyRef.current = true;
    setData(prev => ({
      ...prev,
      selfCare: { ...prev.selfCare, ...updates },
    }));

    // Firestore write
    const uid = getUserId();
    if (uid) {
      const now = new Date().toISOString();
      updateSelfCareDoc(uid, { ...updates, selfCareModified: now }).catch(console.warn);
    }
  }, []);

  // Launch plan — uses immediate cloud save (same pattern as selfCare)
  const updateLaunchPlan = useCallback((updates: Partial<LaunchPlanData>) => {
    saveLaunchPlanToStorage(updates);
    launchPlanOnlyRef.current = true;
    const now = new Date().toISOString();
    setData(prev => ({
      ...prev,
      launchPlan: { ...(prev.launchPlan || { tasks: [], decisions: [], contacts: [], planStartDate: '', planEndDate: '', lastModified: '', version: 1 }), ...updates, lastModified: now },
    }));

    // Firestore write
    const uid = getUserId();
    if (uid) updateLaunchPlanDoc(uid, { ...updates, lastModified: now }).catch(console.warn);
  }, []);

  // AI check-ins — append and prune entries older than 30 days
  const saveAICheckIn = useCallback((checkIn: AICheckIn) => {
    setData(prev => {
      const existing = prev.aiCheckIns || [];
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const cutoffStr = toDateStr(cutoff);
      const updated = [...existing, checkIn].filter(c => c.date >= cutoffStr);
      return { ...prev, aiCheckIns: updated };
    });
    const uid = getUserId();
    if (uid) saveAICheckInDoc(uid, checkIn).catch(console.warn);
  }, []);

  // Day plan — immediate cloud sync (same pattern as selfCare/launchPlan)
  const saveDayPlan = useCallback((plan: DayPlan) => {
    const now = new Date().toISOString();
    const planWithTimestamp = { ...plan, lastModified: now };
    saveDayPlanToStorage(planWithTimestamp);
    dayPlanOnlyRef.current = true;
    setData(prev => ({ ...prev, dayPlan: planWithTimestamp }));

    // Firestore write
    const uid = getUserId();
    if (uid) updateDayPlanDoc(uid, planWithTimestamp).catch(console.warn);
  }, []);

  // Therapist data — immediate cloud sync
  const updateTherapist = useCallback((updates: Partial<TherapistData>) => {
    saveTherapistToStorage(updates);
    therapistOnlyRef.current = true;
    const now = new Date().toISOString();
    setData(prev => ({
      ...prev,
      therapist: { ...(prev.therapist || { prepNotes: [], sessions: [], lastModified: '' }), ...updates, lastModified: now },
    }));
    const uid = getUserId();
    if (uid) updateTherapistDoc(uid, { ...updates, lastModified: now }).catch(console.warn);
  }, []);

  // Meditation data — immediate cloud sync
  const updateMeditation = useCallback((updates: Partial<MeditationData>) => {
    saveMeditationToStorage(updates);
    meditationOnlyRef.current = true;
    const now = new Date().toISOString();
    setData(prev => ({
      ...prev,
      meditation: { ...(prev.meditation || { sessions: [], preferences: { defaultRounds: { box: 4, fourSevenEight: 4, slow: 6 } }, lastModified: '' }), ...updates, lastModified: now },
    }));
    const uid = getUserId();
    if (uid) updateMeditationDoc(uid, { ...updates, lastModified: now }).catch(console.warn);
  }, []);

  // Grief data — immediate cloud sync
  const updateGrief = useCallback((updates: Partial<GriefData>) => {
    saveGriefToStorage(updates);
    griefOnlyRef.current = true;
    const now = new Date().toISOString();
    setData(prev => ({
      ...prev,
      grief: { ...(prev.grief || { letters: [], emotionalCheckins: [], lastPermissionSlipIndex: -1, lastModified: '' }), ...updates, lastModified: now },
    }));
    const uid = getUserId();
    if (uid) updateGriefDoc(uid, { ...updates, lastModified: now }).catch(console.warn);
  }, []);

  // Nudge state — cross-device dismiss/snooze sync
  const updateNudgeState = useCallback((state: NudgeDismissState) => {
    setData(prev => ({ ...prev, nudgeState: state }));
    const uid = getUserId();
    if (uid) updateNudgeStateDoc(uid, state).catch(console.warn);
  }, []);

  // Fix items — app bugs/improvements logged for Cowork fix-queue
  const addFixItem = useCallback((description: string, page?: string, priority: FixItem['priority'] = 'medium') => {
    const item: FixItem = {
      id: uuid(),
      description,
      page,
      priority,
      processed: false,
      createdAt: new Date().toISOString(),
    };
    setData(prev => ({ ...prev, fixItems: [...(prev.fixItems || []), item] }));
    const uid = getUserId();
    if (uid) saveFixItemDoc(uid, item).catch(console.warn);
    return item;
  }, []);

  const deleteFixItem = useCallback((itemId: string) => {
    setData(prev => ({
      ...prev,
      fixItems: (prev.fixItems || []).filter(f => f.id !== itemId),
    }));
    const uid = getUserId();
    if (uid) deleteFixItemDoc(uid, itemId).catch(console.warn);
  }, []);

  // Calendar event management (for linking dances to calendar events)
  const updateCalendarEvent = useCallback((event: CalendarEvent) => {
    setData(prev => {
      const events = prev.calendarEvents || [];
      const index = events.findIndex(e => e.id === event.id);
      if (index !== -1) {
        const updated = [...events];
        updated[index] = event;
        return { ...prev, calendarEvents: updated };
      }
      return { ...prev, calendarEvents: [...events, event] };
    });
    const uid = getUserId();
    if (uid) firestoreSaveCalendarEvent(uid, event).catch(console.warn);
  }, []);

  const deleteCalendarEvent = useCallback((eventId: string) => {
    setData(prev => {
      const event = (prev.calendarEvents || []).find(e => e.id === eventId);
      const isFeedEvent = event?.source === 'ics' || event?.source === 'google';

      // Feed-sourced events must be hidden (not just deleted) to prevent re-sync
      const hidden = prev.settings?.hiddenCalendarEventIds || [];
      const newSettings = isFeedEvent && !hidden.includes(eventId)
        ? { ...prev.settings, hiddenCalendarEventIds: [...hidden, eventId] }
        : prev.settings;

      const uid = getUserId();
      if (uid) {
        deleteCalendarEventDoc(uid, eventId).catch(console.warn);
        if (isFeedEvent && newSettings !== prev.settings) {
          updateProfile(uid, { settings: newSettings }).catch(console.warn);
        }
      }

      return {
        ...prev,
        calendarEvents: (prev.calendarEvents || []).filter(e => e.id !== eventId),
        settings: newSettings,
      };
    });
  }, []);

  // Hide a calendar event (persists across syncs — event won't reappear)
  const hideCalendarEvent = useCallback((eventId: string) => {
    setData(prev => {
      const hidden = prev.settings?.hiddenCalendarEventIds || [];
      if (hidden.includes(eventId)) return prev;
      const newSettings = {
        ...prev.settings,
        hiddenCalendarEventIds: [...hidden, eventId],
      };

      // Persist both operations — if profile update fails, the event will reappear
      // on next sync, so we retry the profile update on the next sync cycle too
      const uid = getUserId();
      if (uid) {
        const profileUpdate = updateProfile(uid, { settings: newSettings });
        // Only delete from Firestore after profile update succeeds to avoid orphaned state
        profileUpdate
          .then(() => deleteCalendarEventDoc(uid, eventId))
          .catch((err) => {
            console.warn('Failed to persist hidden event — will retry on next sync:', err);
          });
      }

      return {
        ...prev,
        calendarEvents: (prev.calendarEvents || []).filter(e => e.id !== eventId),
        settings: newSettings,
      };
    });
  }, []);

  // Settings — writes to both localStorage and Firestore
  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setData(prev => {
      const newSettings = { ...prev.settings, ...updates };
      // Persist to Firestore
      const uid = getUserId();
      if (uid) updateProfile(uid, { settings: newSettings }).catch(console.warn);
      return { ...prev, settings: newSettings };
    });
  }, []);

  return {
    data,
    updateClass,
    addClass,
    deleteClass,
    getWeekNotes,
    getCurrentWeekNotes,
    saveWeekNotes,
    updateCompetition,
    deleteCompetition,
    updateCompetitionDance,
    deleteCompetitionDance,
    updateStudio,
    refreshData,
    // Settings
    updateSettings,
    // Student management
    addStudent,
    updateStudent,
    deleteStudent,
    // Calendar events
    updateCalendarEvent,
    deleteCalendarEvent,
    hideCalendarEvent,
    // Self-care
    updateSelfCare,
    // Launch plan
    updateLaunchPlan,
    // AI
    saveAICheckIn,
    saveDayPlan,
    // Wellness tab singletons
    updateTherapist,
    updateMeditation,
    updateGrief,
    // Nudge state (cross-device)
    updateNudgeState,
    // Fix items (app bugs → Cowork fix-queue)
    addFixItem,
    deleteFixItem,
  };
}
