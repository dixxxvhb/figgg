import { AppData, Class, WeekNotes, Project, Competition, CalendarEvent, AppSettings, CompetitionDance } from '../types';
import { studios } from '../data/studios';
import { initialClasses } from '../data/classes';
import { terminology } from '../data/terminology';
import { initialProjects } from '../data/projects';
import { initialCompetitions } from '../data/competitions';
import { initialCompetitionDances } from '../data/competitionDances';
import { debouncedCloudSave, fetchCloudData, saveCloudData } from './cloudStorage';

const STORAGE_KEY = 'dance-teaching-app-data';
const AUTH_KEY = 'dance-teaching-app-auth';
const PASSWORD_KEY = 'dance-teaching-app-password';

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
  };
}

export function loadData(): AppData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const defaults = getDefaultData();
      // Merge with defaults to ensure all fields exist
      // Use default competitions/dances if stored is empty (to seed initial data)
      return {
        ...defaults,
        ...parsed,
        // Keep default competitions if stored competitions is empty
        competitions: parsed.competitions?.length > 0 ? parsed.competitions : defaults.competitions,
        // Keep default competition dances if stored is empty
        competitionDances: parsed.competitionDances?.length > 0 ? parsed.competitionDances : defaults.competitionDances,
      };
    }
  } catch (error) {
    console.error('Failed to load data:', error);
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
    const jsonString = JSON.stringify(data);
    const sizeInMB = (jsonString.length / (1024 * 1024)).toFixed(2);
    console.log(`Saving data: ${sizeInMB}MB`);

    // Check if data is too large for localStorage (typically 5-10MB limit)
    if (jsonString.length > 4 * 1024 * 1024) {
      console.warn(`Data size (${sizeInMB}MB) is large, may exceed localStorage limit`);
    }

    localStorage.setItem(STORAGE_KEY, jsonString);
    // Also sync to cloud (debounced to avoid too many requests)
    debouncedCloudSave(data);
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

// Sync data from cloud - call this on app load
export async function syncFromCloud(): Promise<AppData | null> {
  try {
    const cloudData = await fetchCloudData();
    if (cloudData) {
      // Save cloud data to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudData));
      console.log('Synced from cloud successfully');
      return cloudData;
    }
    return null;
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
  data.calendarEvents = events;
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

// Simple password auth
export function isAuthenticated(): boolean {
  return localStorage.getItem(AUTH_KEY) === 'true';
}

export function authenticate(password: string): boolean {
  // In production, this would check against an environment variable via Netlify function
  // For development, use a simple password
  const correctPassword = import.meta.env.VITE_APP_PASSWORD || 'dance2024';
  if (password === correctPassword) {
    localStorage.setItem(AUTH_KEY, 'true');
    // Store password for cloud API calls
    localStorage.setItem(PASSWORD_KEY, password);
    return true;
  }
  return false;
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(PASSWORD_KEY);
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
