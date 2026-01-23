import { AppData } from '../types';
import { saveEvents } from './storage';

const API_BASE = '/.netlify/functions';

// Get the password from localStorage (set during login)
// Falls back to default password for users who logged in before password storage was added
function getAuthToken(): string {
  const stored = localStorage.getItem('dance-teaching-app-password');
  if (stored) return stored;

  // If user is authenticated but password not stored, use default and store it
  const isAuth = localStorage.getItem('dance-teaching-app-auth') === 'true';
  if (isAuth) {
    const defaultPassword = 'dance2024';
    localStorage.setItem('dance-teaching-app-password', defaultPassword);
    return defaultPassword;
  }

  return '';
}

export async function fetchCloudData(): Promise<AppData | null> {
  try {
    const response = await fetch(`${API_BASE}/getData`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.warn('Cloud sync: Not authenticated');
        return null;
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch cloud data:', error);
    return null;
  }
}

export async function saveCloudData(data: AppData): Promise<boolean> {
  try {
    const jsonString = JSON.stringify(data);
    const sizeInMB = (jsonString.length / (1024 * 1024)).toFixed(2);
    console.log(`Cloud save: ${sizeInMB}MB`);

    const response = await fetch(`${API_BASE}/saveData`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json',
      },
      body: jsonString,
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.warn('Cloud sync: Not authenticated');
        saveEvents.emit('error', 'Not authenticated. Please log in again.');
        return false;
      }
      if (response.status === 413) {
        console.warn('Cloud sync: Payload too large');
        saveEvents.emit('error', 'Data too large for cloud sync. Try removing some videos.');
        return false;
      }
      throw new Error(`HTTP ${response.status}`);
    }

    console.log('Cloud save successful');
    saveEvents.emit('saved');
    return true;
  } catch (error) {
    console.error('Failed to save cloud data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    saveEvents.emit('error', `Cloud sync failed: ${errorMessage}`);
    return false;
  }
}

// Debounced save to avoid too many requests
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

export function debouncedCloudSave(data: AppData, delay: number = 2000): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    saveCloudData(data);
    saveTimeout = null;
  }, delay);
}
