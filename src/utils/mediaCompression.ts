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

        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// Process a media file - compress images, reject videos
export async function processMediaFile(file: File): Promise<{ dataUrl: string; warning?: string } | { error: string }> {
  if (file.type.startsWith('image/')) {
    try {
      const compressedDataUrl = await compressImage(file);
      // If compression made the image larger (e.g. converting PNG to JPEG), use original
      if (compressedDataUrl.length > file.size * 1.37) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve({ dataUrl: e.target?.result as string });
          reader.onerror = () => reject({ error: 'Failed to read file' });
          reader.readAsDataURL(file);
        });
      }
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
    return {
      error: 'Video upload is not supported. Videos are too large for local storage (a 1-minute video needs 50-100MB, but storage is limited to 5-10MB). Please use photos instead.'
    };
  }

  return { error: 'Unsupported file type' };
}
