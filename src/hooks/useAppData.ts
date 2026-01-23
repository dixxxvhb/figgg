import { useState, useEffect, useCallback, useRef } from 'react';
import { AppData, Class, WeekNotes, Project, Competition, CompetitionDance } from '../types';
import { loadData, saveData, updateClass as saveClass, saveWeekNotes as persistWeekNotes } from '../services/storage';
import { getWeekStart, formatWeekOf } from '../utils/time';
import { fetchCalendarEvents } from '../services/calendar';
import { v4 as uuid } from 'uuid';

// Hardcoded Band calendar URL - this won't change
const BAND_CALENDAR_URL = 'https://api.band.us/ical?token=aAAxADU0MWQxZTdiZjdhYWQwMmJlOTMxNmIyYWJjZjA4NTAwN2Q1ZWNlODYwZDg3YTZiODdjYmI4YmQ3ZmI4YmRmZWIAMQA1NjA4NTEyNQ';

export function useAppData() {
  const [data, setData] = useState<AppData>(() => loadData());
  const hasAutoSynced = useRef(false);

  // Save whenever data changes
  useEffect(() => {
    saveData(data);
  }, [data]);

  // Auto-sync calendar on app load (always uses hardcoded Band calendar)
  useEffect(() => {
    if (hasAutoSynced.current) return;

    hasAutoSynced.current = true;

    // Sync calendar in the background
    fetchCalendarEvents(BAND_CALENDAR_URL)
      .then(events => {
        if (events.length > 0) {
          setData(prev => ({ ...prev, calendarEvents: events }));
        }
      })
      .catch(err => {
        console.error('Auto calendar sync failed:', err);
      });
  }, []);

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
  };
}
