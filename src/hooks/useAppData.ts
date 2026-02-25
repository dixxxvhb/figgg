import { useState, useEffect, useCallback, useRef } from 'react';
import { AppData, Class, WeekNotes, Project, Competition, CompetitionDance, Student, CalendarEvent, SelfCareData, LaunchPlanData } from '../types';
import type { AICheckIn, AIChatMessage, AIModification, DayPlan } from '../types';
import type { Choreography } from '../types/choreography';
import { loadData, saveData, saveWeekNotes as saveWeekNotesToStorage, saveSelfCareToStorage, saveLaunchPlanToStorage, saveDayPlanToStorage } from '../services/storage';
import { runLearningEngine } from '../services/learningEngine';
import { getWeekStart, formatWeekOf } from '../utils/time';
import { v4 as uuid } from 'uuid';

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

  // Run learning engine on app open (generates yesterday's snapshot if missing)
  useEffect(() => {
    const updated = runLearningEngine();
    if (updated) setData(loadData());
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  }, []);

  const addClass = useCallback((newClass: Omit<Class, 'id'>) => {
    const classWithId: Class = { ...newClass, id: uuid() };
    setData(prev => ({
      ...prev,
      classes: [...prev.classes, classWithId],
    }));
    return classWithId;
  }, []);

  const deleteClass = useCallback((classId: string) => {
    setData(prev => ({
      ...prev,
      classes: prev.classes.filter(c => c.id !== classId),
      // Cascade: remove class from all enrolled students' classIds
      students: (prev.students || []).map(s =>
        s.classIds?.includes(classId)
          ? { ...s, classIds: s.classIds.filter(id => id !== classId) }
          : s
      ),
    }));
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
  }, []);

  const updateProject = useCallback((project: Project) => {
    setData(prev => {
      const index = prev.projects.findIndex(p => p.id === project.id);
      if (index !== -1) {
        const updated = [...prev.projects];
        updated[index] = project;
        return { ...prev, projects: updated };
      }
      return { ...prev, projects: [...prev.projects, project] };
    });
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    setData(prev => ({
      ...prev,
      projects: prev.projects.filter(p => p.id !== projectId),
    }));
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
  }, []);

  const deleteCompetition = useCallback((competitionId: string) => {
    setData(prev => ({
      ...prev,
      competitions: prev.competitions.filter(c => c.id !== competitionId),
      // Cascade: remove orphaned competition dances
      competitionDances: (prev.competitionDances || []).filter(d => {
        // Keep dances that belong to OTHER competitions
        const otherComps = prev.competitions.filter(c => c.id !== competitionId);
        return otherComps.some(c => c.dances?.includes(d.id));
      }),
    }));
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
  }, []);

  const deleteCompetitionDance = useCallback((danceId: string) => {
    setData(prev => ({
      ...prev,
      competitionDances: (prev.competitionDances || []).filter(d => d.id !== danceId),
      // Cascade: remove dance from competitions and unlink rehearsal classes
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
    }));
  }, []);

  const updateStudio = useCallback((studioId: string, updates: Partial<{ address: string; coordinates: { lat: number; lng: number } }>) => {
    setData(prev => ({
      ...prev,
      studios: prev.studios.map(s =>
        s.id === studioId ? { ...s, ...updates } : s
      ),
    }));
  }, []);

  const refreshData = useCallback(() => {
    setData(loadData());
  }, []);

  // Listen for cloud sync events and local saves from other hook instances
  useEffect(() => {
    const handleCloudSync = () => {
      // Always reload after cloud sync — syncFromCloud properly merges
      // local + cloud data, so the merged result is safe to display
      setData(loadData());
    };

    const handleLocalSave = () => {
      if (!isSavingRef.current) {
        setData(loadData());
      }
    };

    // Calendar sync saves directly to storage — always reload on completion
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
  }, []);

  const deleteStudent = useCallback((studentId: string) => {
    setData(prev => ({
      ...prev,
      students: (prev.students || []).filter(s => s.id !== studentId),
      // Cascade: remove student from competition dance rosters
      competitionDances: (prev.competitionDances || []).map(d =>
        d.dancerIds?.includes(studentId)
          ? { ...d, dancerIds: d.dancerIds.filter(id => id !== studentId) }
          : d
      ),
    }));
  }, []);

  // Note: attendance is stored in weekNotes.classNotes[classId].attendance (not the legacy data.attendance array)

  // Self-care (meds + reminders) — uses immediate cloud save, not debounced
  // Medication data is critical and must sync before user locks phone
  const updateSelfCare = useCallback((updates: Partial<SelfCareData>) => {
    // Save to storage with immediate cloud sync (like saveWeekNotes)
    // saveSelfCareToStorage does a proper partial merge: { ...cloud, ...updates }
    saveSelfCareToStorage(updates);

    // Mark next setData as selfCare-only so the useEffect skips saveData
    // (saveSelfCareToStorage already handles the cloud push with correct merge)
    selfCareOnlyRef.current = true;
    // Update React state so UI reflects changes immediately
    setData(prev => ({
      ...prev,
      selfCare: { ...prev.selfCare, ...updates },
    }));
  }, []);

  // Launch plan — uses immediate cloud save (same pattern as selfCare)
  const updateLaunchPlan = useCallback((updates: Partial<LaunchPlanData>) => {
    saveLaunchPlanToStorage(updates);
    launchPlanOnlyRef.current = true;
    setData(prev => ({
      ...prev,
      launchPlan: { ...(prev.launchPlan || { tasks: [], decisions: [], contacts: [], planStartDate: '2026-02-12', planEndDate: '2026-06-30', lastModified: '', version: 1 }), ...updates, lastModified: new Date().toISOString() },
    }));
  }, []);

  // Choreographies
  const updateChoreographies = useCallback((choreographies: Choreography[]) => {
    setData(prev => ({ ...prev, choreographies }));
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
  }, []);

  // Day plan — immediate cloud sync (same pattern as selfCare/launchPlan)
  const saveDayPlan = useCallback((plan: DayPlan) => {
    const now = new Date().toISOString();
    const planWithTimestamp = { ...plan, lastModified: now };
    saveDayPlanToStorage(planWithTimestamp);
    dayPlanOnlyRef.current = true;
    setData(prev => ({ ...prev, dayPlan: planWithTimestamp }));
  }, []);

  // Disruption state — simple last-write-wins (no special cloud sync needed)
  const updateDisruption = useCallback((disruption: AppData['disruption']) => {
    setData(prev => {
      const updated = { ...prev, disruption, lastModified: new Date().toISOString() };
      saveData(updated);
      return updated;
    });
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
  }, []);

  // AI modification log — rolling 90 days
  const saveAIModification = useCallback((modification: AIModification) => {
    setData(prev => {
      const existing = prev.aiModifications || [];
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      const cutoffStr = cutoff.toISOString();
      const pruned = [...existing, modification].filter(m => m.timestamp >= cutoffStr);
      return { ...prev, aiModifications: pruned };
    });
  }, []);

  // AI chat history — rolling 7 days
  const saveChatHistory = useCallback((messages: AIChatMessage[]) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString();
    const pruned = messages.filter(m => m.timestamp >= cutoffStr);
    setData(prev => ({ ...prev, chatHistory: pruned }));
  }, []);

  return {
    data,
    updateClass,
    addClass,
    deleteClass,
    getWeekNotes,
    getCurrentWeekNotes,
    saveWeekNotes,
    updateProject,
    deleteProject,
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
    // Disruption
    updateDisruption,
    // AI
    saveAICheckIn,
    saveDayPlan,
    saveAIModification,
    saveChatHistory,
  };
}
