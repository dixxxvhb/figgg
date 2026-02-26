import { useState, useEffect, useCallback, useRef } from 'react';
import { AppData, Class, WeekNotes, Competition, CompetitionDance, Student, CalendarEvent, SelfCareData, LaunchPlanData } from '../types';
import type { AICheckIn, DayPlan } from '../types';
import type { Choreography } from '../types/choreography';
import { loadData, saveData, saveWeekNotes as saveWeekNotesToStorage, saveSelfCareToStorage, saveLaunchPlanToStorage, saveDayPlanToStorage } from '../services/storage';
import { runLearningEngine } from '../services/learningEngine';
import { getWeekStart, formatWeekOf } from '../utils/time';
import { v4 as uuid } from 'uuid';
import { auth } from '../services/firebase';
import {
  loadAllData,
  onSelfCareSnapshot,
  onDayPlanSnapshot,
  onLaunchPlanSnapshot,
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
  saveAICheckInDoc,
  saveChoreography as firestoreSaveChoreography,
  updateSelfCareDoc,
  updateDayPlanDoc,
  updateLaunchPlanDoc,
  updateProfile,
} from '../services/firestore';

// Helper: get current user ID or null
function getUserId(): string | null {
  return auth.currentUser?.uid ?? null;
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
  // Track if snapshot update is happening (to avoid triggering saveData)
  const snapshotUpdateRef = useRef(false);

  // Run learning engine on app open (generates yesterday's snapshot if missing)
  useEffect(() => {
    const updated = runLearningEngine();
    if (updated) setData(loadData());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load data from Firestore on mount (overlays localStorage data)
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    loadAllData(user.uid).then(firestoreData => {
      // Only use Firestore data if it has content (migration has been run)
      if (firestoreData.classes.length > 0 || firestoreData.studios.length > 0) {
        setData(firestoreData);
        // Also update localStorage cache for offline use
        try {
          localStorage.setItem('dance-teaching-app-data', JSON.stringify({
            ...firestoreData,
            lastModified: new Date().toISOString(),
          }));
        } catch {
          // localStorage write failed — not critical
        }
      }
    }).catch(err => {
      console.warn('Firestore load failed, using localStorage:', err);
    });
  }, []);

  // Set up Firestore real-time listeners for critical data
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubSelfCare = onSelfCareSnapshot(user.uid, (selfCare) => {
      if (selfCare) {
        snapshotUpdateRef.current = true;
        setData(prev => ({ ...prev, selfCare }));
        Promise.resolve().then(() => { snapshotUpdateRef.current = false; });
      }
    });

    const unsubDayPlan = onDayPlanSnapshot(user.uid, (dayPlan) => {
      if (dayPlan) {
        snapshotUpdateRef.current = true;
        setData(prev => ({ ...prev, dayPlan }));
        Promise.resolve().then(() => { snapshotUpdateRef.current = false; });
      }
    });

    const unsubLaunchPlan = onLaunchPlanSnapshot(user.uid, (launchPlan) => {
      if (launchPlan) {
        snapshotUpdateRef.current = true;
        setData(prev => ({ ...prev, launchPlan }));
        Promise.resolve().then(() => { snapshotUpdateRef.current = false; });
      }
    });

    return () => {
      unsubSelfCare();
      unsubDayPlan();
      unsubLaunchPlan();
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
    if (snapshotUpdateRef.current) {
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
    if (uid) firestoreSaveClass(uid, updatedClass).catch(console.warn);
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
          firestoreSaveStudent(uid, { ...s, classIds: s.classIds.filter(id => id !== classId) }).catch(console.warn);
        }
      }
      return {
        ...prev,
        classes: prev.classes.filter(c => c.id !== classId),
        students: (prev.students || []).map(s =>
          s.classIds?.includes(classId)
            ? { ...s, classIds: s.classIds.filter(id => id !== classId) }
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
    if (uid) saveWeekNotesDoc(uid, weekNotes).catch(console.warn);
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
            firestoreSaveCompetition(uid, { ...c, dances: c.dances.filter(id => id !== danceId) }).catch(console.warn);
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
            ? { ...c, dances: c.dances.filter(id => id !== danceId) }
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
    const user = auth.currentUser;
    if (user) {
      loadAllData(user.uid).then(firestoreData => {
        if (firestoreData.classes.length > 0 || firestoreData.studios.length > 0) {
          setData(firestoreData);
        } else {
          setData(loadData());
        }
      }).catch(() => {
        setData(loadData());
      });
    } else {
      setData(loadData());
    }
  }, []);

  // Listen for cloud sync events and local saves from other hook instances
  useEffect(() => {
    const handleCloudSync = () => {
      setData(loadData());
    };

    const handleLocalSave = () => {
      if (!isSavingRef.current) {
        setData(loadData());
      }
    };

    const handleCalendarSync = () => {
      setData(loadData());
    };

    window.addEventListener('cloud-sync-complete', handleCloudSync);
    window.addEventListener('local-data-saved', handleLocalSave);
    window.addEventListener('calendar-sync-complete', handleCalendarSync);

    return () => {
      window.removeEventListener('cloud-sync-complete', handleCloudSync);
      window.removeEventListener('local-data-saved', handleLocalSave);
      window.removeEventListener('calendar-sync-complete', handleCalendarSync);
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
    if (uid) firestoreSaveStudent(uid, newStudent).catch(console.warn);
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
    if (uid) firestoreSaveStudent(uid, student).catch(console.warn);
  }, []);

  const deleteStudent = useCallback((studentId: string) => {
    setData(prev => {
      // Cascade: update competition dances in Firestore
      const uid = getUserId();
      if (uid) {
        for (const d of (prev.competitionDances || [])) {
          if (d.dancerIds?.includes(studentId)) {
            firestoreSaveCompetitionDance(uid, { ...d, dancerIds: d.dancerIds.filter(id => id !== studentId) }).catch(console.warn);
          }
        }
      }
      return {
        ...prev,
        students: (prev.students || []).filter(s => s.id !== studentId),
        competitionDances: (prev.competitionDances || []).map(d =>
          d.dancerIds?.includes(studentId)
            ? { ...d, dancerIds: d.dancerIds.filter(id => id !== studentId) }
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
      launchPlan: { ...(prev.launchPlan || { tasks: [], decisions: [], contacts: [], planStartDate: '2026-02-12', planEndDate: '2026-06-30', lastModified: '', version: 1 }), ...updates, lastModified: now },
    }));

    // Firestore write
    const uid = getUserId();
    if (uid) updateLaunchPlanDoc(uid, { ...updates, lastModified: now }).catch(console.warn);
  }, []);

  // Choreographies
  const updateChoreographies = useCallback((choreographies: Choreography[]) => {
    setData(prev => ({ ...prev, choreographies }));
    // Firestore write — save each choreography
    const uid = getUserId();
    if (uid) {
      for (const choreo of choreographies) {
        firestoreSaveChoreography(uid, choreo).catch(console.warn);
      }
    }
  }, []);

  // AI check-ins — append and prune entries older than 30 days
  const saveAICheckIn = useCallback((checkIn: AICheckIn) => {
    setData(prev => {
      const existing = prev.aiCheckIns || [];
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
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
    // Student management
    addStudent,
    updateStudent,
    deleteStudent,
    // Calendar events
    updateCalendarEvent,
    // Self-care & choreography
    updateSelfCare,
    updateChoreographies,
    // Launch plan
    updateLaunchPlan,
    // AI
    saveAICheckIn,
    saveDayPlan,
  };
}
