import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

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
