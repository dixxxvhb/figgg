import { AppData } from '../types';
import { saveEvents } from './storage';

const API_BASE = '/.netlify/functions';
const TOKEN_KEY = 'dance-teaching-app-token';

// Cache for the auth token - initialized lazily
let tokenCache: string | null = null;

// Get the session token, initializing it if needed
export function getAuthToken(): string {
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
  const jsonString = JSON.stringify(data);
  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${API_BASE}/saveData`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: jsonString,
      });

      if (response.ok) {
        saveEvents.emit('saved');
        return true;
      }

      // Don't retry auth or size errors
      if (response.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        tokenCache = null;
        saveEvents.emit('error', 'Auth token expired. Will retry on next sync.');
        return false;
      }
      if (response.status === 413) {
        saveEvents.emit('error', 'Data too large for cloud sync. Try removing some photos.');
        return false;
      }

      // Retry on 5xx server errors
      if (response.status >= 500 && attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        continue;
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        continue;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      saveEvents.emit('error', `Cloud sync failed: ${errorMessage}`);
      return false;
    }
  }

  return false;
}

// Debounced save to avoid too many requests
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingData: AppData | null = null;
let lastSavedData: string | null = null;

export function debouncedCloudSave(data: AppData, delay: number = 500): void {
  // Shorter default delay (500ms) for faster syncs
  pendingData = data;
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(async () => {
    if (pendingData) {
      const jsonString = JSON.stringify(pendingData);
      // Only save if data actually changed (avoid duplicate saves)
      if (jsonString !== lastSavedData) {
        const success = await saveCloudData(pendingData);
        if (success) {
          lastSavedData = jsonString;
        }
      }
      pendingData = null;
    }
    saveTimeout = null;
  }, delay);
}

// Immediate cloud save for critical data (notes, etc)
export async function immediateCloudSave(data: AppData): Promise<boolean> {
  // Cancel any pending debounced save
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  pendingData = null;

  const jsonString = JSON.stringify(data);
  if (jsonString === lastSavedData) {
    return true; // Already saved
  }

  const success = await saveCloudData(data);
  if (success) {
    lastSavedData = jsonString;
  }
  return success;
}

// Force immediate save (call before page unload or refresh)
export function flushPendingSave(): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  if (pendingData) {
    // Use fetch with keepalive for reliable save on page unload
    // keepalive allows the request to outlive the page (like sendBeacon)
    // but supports Authorization header (sendBeacon cannot set headers)
    const token = getAuthToken();
    const jsonString = JSON.stringify(pendingData);
    fetch(`${API_BASE}/saveData`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: jsonString,
    }).catch(() => {
      // Fire-and-forget on page unload
    });
    pendingData = null;
  }
}

