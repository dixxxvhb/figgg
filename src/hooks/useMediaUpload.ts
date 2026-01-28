import { useState, useCallback } from 'react';

export interface MediaItem {
  id: string;
  type: 'image';
  data: string; // base64
  caption?: string;
  timestamp: string;
}

interface UseMediaUploadOptions {
  maxSizeMB?: number;
  allowedTypes?: string[];
  onUpload?: (media: MediaItem) => void;
  onError?: (error: string) => void;
}

const DEFAULT_MAX_SIZE_MB = 2;
const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function useMediaUpload(options: UseMediaUploadOptions = {}) {
  const {
    maxSizeMB = DEFAULT_MAX_SIZE_MB,
    allowedTypes = DEFAULT_ALLOWED_TYPES,
    onUpload,
    onError,
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return `File type not supported. Allowed: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`;
    }

    // Check file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      return `File too large. Maximum size: ${maxSizeMB}MB`;
    }

    return null;
  }, [allowedTypes, maxSizeMB]);

  const uploadFile = useCallback((file: File): Promise<MediaItem> => {
    return new Promise((resolve, reject) => {
      const validationError = validateFile(file);
      if (validationError) {
        reject(new Error(validationError));
        return;
      }

      setIsUploading(true);
      setProgress(0);
      setError(null);

      const reader = new FileReader();

      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          setProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      reader.onload = (event) => {
        const result = event.target?.result as string;
        const mediaItem: MediaItem = {
          id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'image',
          data: result,
          timestamp: new Date().toISOString(),
        };

        setIsUploading(false);
        setProgress(100);
        onUpload?.(mediaItem);
        resolve(mediaItem);
      };

      reader.onerror = () => {
        const errorMsg = 'Failed to read file';
        setError(errorMsg);
        setIsUploading(false);
        onError?.(errorMsg);
        reject(new Error(errorMsg));
      };

      reader.readAsDataURL(file);
    });
  }, [validateFile, onUpload, onError]);

  const handleFileInput = useCallback(async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<MediaItem | null> => {
    const file = event.target.files?.[0];
    if (!file) return null;

    try {
      const media = await uploadFile(file);
      // Reset the input so the same file can be selected again
      event.target.value = '';
      return media;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMsg);
      onError?.(errorMsg);
      event.target.value = '';
      return null;
    }
  }, [uploadFile, onError]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isUploading,
    progress,
    error,
    uploadFile,
    handleFileInput,
    clearError,
    validateFile,
  };
}

// Helper to generate file input props
export function getMediaInputProps() {
  return {
    type: 'file' as const,
    accept: 'image/*',
    className: 'hidden',
  };
}
