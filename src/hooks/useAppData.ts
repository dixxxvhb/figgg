import { useState, useEffect, useCallback, useRef } from 'react';
import { AppData, Class, WeekNotes, Project, Competition, CompetitionDance, Student, AttendanceRecord, CompetitionChecklist, CalendarEvent } from '../types';
import { loadData, saveData } from '../services/storage';
import { getWeekStart, formatWeekOf } from '../utils/time';
import { v4 as uuid } from 'uuid';

export function useAppData() {
  const [data, setData] = useState<AppData>(() => loadData());
  const isInitialMount = useRef(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    // Immediate local save, debounced cloud save happens inside saveData
    saveData(data);
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

  // Listen for cloud sync events and refresh data automatically
  useEffect(() => {
    const handleCloudSync = () => {
      setData(loadData());
    };

    window.addEventListener('cloud-sync-complete', handleCloudSync);

    return () => {
      window.removeEventListener('cloud-sync-complete', handleCloudSync);
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
    }));
  }, []);

  // Attendance management
  const saveAttendance = useCallback((record: AttendanceRecord) => {
    setData(prev => {
      const attendance = prev.attendance || [];
      const index = attendance.findIndex(a => a.classId === record.classId && a.date === record.date);
      if (index !== -1) {
        const updated = [...attendance];
        updated[index] = record;
        return { ...prev, attendance: updated };
      }
      return { ...prev, attendance: [...attendance, record] };
    });
  }, []);

  const getAttendanceForClass = useCallback((classId: string, weekOf: string): AttendanceRecord | undefined => {
    return (data.attendance || []).find(a => a.classId === classId && a.weekOf === weekOf);
  }, [data.attendance]);

  // Competition checklist management
  const updateCompetitionChecklist = useCallback((checklist: CompetitionChecklist) => {
    setData(prev => {
      const checklists = prev.competitionChecklists || [];
      const index = checklists.findIndex(c => c.id === checklist.id);
      if (index !== -1) {
        const updated = [...checklists];
        updated[index] = checklist;
        return { ...prev, competitionChecklists: updated };
      }
      return { ...prev, competitionChecklists: [...checklists, checklist] };
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
    // Attendance management
    saveAttendance,
    getAttendanceForClass,
    // Competition checklist
    updateCompetitionChecklist,
    // Calendar events
    updateCalendarEvent,
  };
}
