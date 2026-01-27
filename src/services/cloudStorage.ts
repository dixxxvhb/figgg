import { AppData } from '../types';
import { saveEvents } from './storage';

const API_BASE = '/.netlify/functions';
const TOKEN_KEY = 'dance-teaching-app-token';

// Cache for the auth token - initialized lazily
let tokenCache: string | null = null;

// Get the session token, initializing it if needed
function getAuthToken(): string {
  if (tokenCache) return tokenCache;
  const stored = localStorage.getItem(TOKEN_KEY);
  if (stored) {
    tokenCache = stored;
    return stored;
  }
  return '';
}

// Initialize the auth token by calling the server login endpoint
// Called once on app startup
export async function initAuthToken(): Promise<void> {
  if (getAuthToken()) return; // Already have a token

  try {
    const password = import.meta.env.VITE_APP_PASSWORD || 'dance2024';
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (response.ok) {
      const { token } = await response.json();
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
        tokenCache = token;
      }
    }
  } catch {
    // Offline or server unreachable - cloud sync will fail gracefully
  }
}

export async function fetchCloudData(): Promise<AppData | null> {
  // Ensure token is initialized before making API calls
  await initAuthToken();

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
        // Token may be stale, clear it so it re-initializes next time
        localStorage.removeItem(TOKEN_KEY);
        tokenCache = null;
        return null;
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch {
    return null;
  }
}

export async function saveCloudData(data: AppData): Promise<boolean> {
  try {
    const jsonString = JSON.stringify(data);

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
        // Token may be stale, clear and retry
        localStorage.removeItem(TOKEN_KEY);
        tokenCache = null;
        saveEvents.emit('error', 'Auth token expired. Will retry on next sync.');
        return false;
      }
      if (response.status === 413) {
        saveEvents.emit('error', 'Data too large for cloud sync. Try removing some videos.');
        return false;
      }
      throw new Error(`HTTP ${response.status}`);
    }

    saveEvents.emit('saved');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    saveEvents.emit('error', `Cloud sync failed: ${errorMessage}`);
    return false;
  }
}

// Debounced save to avoid too many requests
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingData: AppData | null = null;

export function debouncedCloudSave(data: AppData, delay: number = 1000): void {
  pendingData = data;
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    if (pendingData) {
      saveCloudData(pendingData);
      pendingData = null;
    }
    saveTimeout = null;
  }, delay);
}

// Force immediate save (call before page unload or refresh)
export function flushPendingSave(): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  if (pendingData) {
    // Use sendBeacon for reliable save on page unload
    // sendBeacon can't set custom headers, so pass token as query param
    const token = getAuthToken();
    const jsonString = JSON.stringify(pendingData);
    const blob = new Blob([jsonString], { type: 'application/json' });
    navigator.sendBeacon(`/.netlify/functions/saveData?token=${encodeURIComponent(token)}`, blob);
    pendingData = null;
  }
}
