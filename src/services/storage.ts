import { AppData, Class, WeekNotes, Project, Competition } from '../types';
import { studios } from '../data/studios';
import { initialClasses } from '../data/classes';
import { terminology } from '../data/terminology';
import { initialProjects } from '../data/projects';

const STORAGE_KEY = 'dance-teaching-app-data';
const AUTH_KEY = 'dance-teaching-app-auth';

function getDefaultData(): AppData {
  return {
    studios,
    classes: initialClasses,
    weekNotes: [],
    exercises: [],
    terminology,
    projects: initialProjects,
    competitions: [],
  };
}

export function loadData(): AppData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all fields exist
      return {
        ...getDefaultData(),
        ...parsed,
      };
    }
  } catch (error) {
    console.error('Failed to load data:', error);
  }
  return getDefaultData();
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save data:', error);
  }
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
    return true;
  }
  return false;
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
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
