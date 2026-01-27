// Compress images before storing as base64
// This significantly reduces storage size

const MAX_IMAGE_WIDTH = 1200;
const MAX_IMAGE_HEIGHT = 1200;
const IMAGE_QUALITY = 0.7;

export async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;

        if (width > MAX_IMAGE_WIDTH) {
          height = (height * MAX_IMAGE_WIDTH) / width;
          width = MAX_IMAGE_WIDTH;
        }
        if (height > MAX_IMAGE_HEIGHT) {
          width = (width * MAX_IMAGE_HEIGHT) / height;
          height = MAX_IMAGE_HEIGHT;
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to compressed JPEG
        const compressedDataUrl = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);

        const originalSize = (e.target?.result as string).length;
        const compressedSize = compressedDataUrl.length;
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// For videos, we can't easily compress them client-side
// Instead, we'll check the file size and warn if too large
export const MAX_VIDEO_SIZE_MB = 3;

export function checkVideoSize(file: File): { ok: boolean; sizeMB: number } {
  const sizeMB = file.size / (1024 * 1024);
  return {
    ok: sizeMB <= MAX_VIDEO_SIZE_MB,
    sizeMB: parseFloat(sizeMB.toFixed(2))
  };
}

// Process a media file - compress images, check video sizes
export async function processMediaFile(file: File): Promise<{ dataUrl: string; warning?: string } | { error: string }> {
  if (file.type.startsWith('image/')) {
    try {
      const compressedDataUrl = await compressImage(file);
      return { dataUrl: compressedDataUrl };
    } catch (error) {
      console.error('Image compression failed:', error);
      // Fall back to original
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve({ dataUrl: e.target?.result as string, warning: 'Image could not be compressed' });
        reader.onerror = () => reject({ error: 'Failed to read file' });
        reader.readAsDataURL(file);
      });
    }
  }

  if (file.type.startsWith('video/')) {
    const check = checkVideoSize(file);
    if (!check.ok) {
      return {
        error: `Video is too large (${check.sizeMB}MB). Maximum size is ${MAX_VIDEO_SIZE_MB}MB. Please use a shorter clip or compress the video first.`
      };
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const warning = check.sizeMB > 2
          ? `Large video (${check.sizeMB}MB) may affect storage and sync speed`
          : undefined;
        resolve({ dataUrl: e.target?.result as string, warning });
      };
      reader.onerror = () => reject({ error: 'Failed to read video file' });
      reader.readAsDataURL(file);
    });
  }

  return { error: 'Unsupported file type' };
}
