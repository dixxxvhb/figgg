/**
 * Legacy cloud storage stubs — Firestore handles all cloud persistence now.
 * These no-op exports keep storage.ts working without changes.
 */
import type { AppData } from '../types';

export function getAuthToken(): string {
  return '';
}

export async function initAuthToken(): Promise<void> {
  // No-op — Firebase Auth handles authentication
}

export async function fetchCloudData(): Promise<AppData | null> {
  // No-op — Firestore onSnapshot handles data sync
  return null;
}

export async function saveCloudData(_data: AppData): Promise<boolean> {
  // No-op — Firestore writes handle persistence
  return true;
}

export function debouncedCloudSave(_data: AppData, _delay?: number): void {
  // No-op — Firestore writes handle persistence
}

export async function immediateCloudSave(_data: AppData): Promise<boolean> {
  // No-op — Firestore writes handle persistence
  return true;
}

export function flushPendingSave(): void {
  // No-op — Firestore SDK handles offline persistence
}

// Legacy event emitter stub
export const saveEvents = {
  emit: (_event: string, _data?: unknown) => {},
  on: (_event: string, _callback: (...args: unknown[]) => void) => {},
  off: (_event: string, _callback: (...args: unknown[]) => void) => {},
};
