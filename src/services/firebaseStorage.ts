import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';
import { v4 as uuid } from 'uuid';
import type { MediaItem } from '../types';

/**
 * Upload a media file to Firebase Storage.
 * Accepts either a Blob or a base64 data URL string.
 * Returns the download URL.
 */
export async function uploadMedia(
  userId: string,
  file: Blob | string,
  path: string
): Promise<string> {
  const storageRef = ref(storage, `users/${userId}/${path}`);

  let blob: Blob;
  if (typeof file === 'string') {
    // Convert base64 data URL to Blob
    blob = dataUrlToBlob(file);
  } else {
    blob = file;
  }

  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

/**
 * Delete a media file from Firebase Storage.
 */
export async function deleteMedia(userId: string, path: string): Promise<void> {
  const storageRef = ref(storage, `users/${userId}/${path}`);
  try {
    await deleteObject(storageRef);
  } catch (err: any) {
    // Ignore "object not found" errors — file may already be deleted
    if (err?.code !== 'storage/object-not-found') {
      throw err;
    }
  }
}

/**
 * Get the download URL for a media file.
 */
export async function getMediaUrl(userId: string, path: string): Promise<string> {
  const storageRef = ref(storage, `users/${userId}/${path}`);
  return getDownloadURL(storageRef);
}

/**
 * Check if a URL is a base64 data URL (needs migration to Storage).
 */
export function isBase64DataUrl(url: string): boolean {
  return url.startsWith('data:');
}

/**
 * Process a MediaItem array: upload any base64 items to Firebase Storage,
 * replace their URLs with download URLs. Already-uploaded items are passed through.
 * Returns a new array with all URLs pointing to Firebase Storage.
 */
export async function migrateMediaItems(
  userId: string,
  items: MediaItem[],
  pathPrefix: string
): Promise<MediaItem[]> {
  return Promise.all(
    items.map(async (item) => {
      if (!isBase64DataUrl(item.url)) {
        return item; // Already a Firebase Storage URL
      }
      try {
        const ext = item.url.startsWith('data:image/png') ? 'png' : 'jpg';
        const storagePath = `media/${pathPrefix}/${item.id || uuid()}.${ext}`;
        const downloadUrl = await uploadMedia(userId, item.url, storagePath);
        return { ...item, url: downloadUrl };
      } catch (err) {
        console.warn('Failed to migrate media item:', item.id, err);
        return item; // Keep base64 as fallback
      }
    })
  );
}

/**
 * Upload a music track (base64 audio) to Firebase Storage.
 * Returns the download URL, or the original URL if already uploaded.
 */
export async function migrateMusicTrack(
  userId: string,
  url: string,
  danceId: string,
  filename: string
): Promise<string> {
  if (!isBase64DataUrl(url)) {
    return url; // Already a Firebase Storage URL
  }
  try {
    const storagePath = `music/${danceId}/${filename}`;
    return await uploadMedia(userId, url, storagePath);
  } catch (err) {
    console.warn('Failed to migrate music track:', danceId, err);
    return url; // Keep base64 as fallback
  }
}

/**
 * Upload a student photo (base64) to Firebase Storage.
 * Returns the download URL, or the original URL if already uploaded.
 */
export async function migrateStudentPhoto(
  userId: string,
  photo: string,
  studentId: string
): Promise<string> {
  if (!isBase64DataUrl(photo)) {
    return photo; // Already a Firebase Storage URL
  }
  try {
    const ext = photo.startsWith('data:image/png') ? 'png' : 'jpg';
    const storagePath = `media/students/${studentId}.${ext}`;
    return await uploadMedia(userId, photo, storagePath);
  } catch (err) {
    console.warn('Failed to migrate student photo:', studentId, err);
    return photo; // Keep base64 as fallback
  }
}

/**
 * Convert a base64 data URL to a Blob.
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:([^;]+)/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}
