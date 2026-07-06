import { supabase, supabaseUrlBase } from './supabase';

export interface UploadResult {
  url: string;
  path: string;
  error?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export type ProgressCallback = (progress: UploadProgress) => void;

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const PDF_TYPES = ['application/pdf', 'application/x-pdf', 'application/acrobat', 'application/vnd.pdf', 'text/pdf', 'text/x-pdf'];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PDF_SIZE = 100 * 1024 * 1024; // 100MB

function generateFileName(originalName: string): string {
  // Get extension and sanitize
  const parts = originalName.split('.');
  const ext = parts.length > 1 ? parts.pop()?.toLowerCase() || 'pdf' : 'pdf';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}.${ext}`;
}

function validateFile(
  file: File,
  allowedTypes: string[],
  maxSize: number
): { valid: boolean; error?: string } {
  // Check file type - also check file extension as fallback for PDFs
  const extension = file.name.split('.').pop()?.toLowerCase();
  const isPdfType = allowedTypes.some(t => PDF_TYPES.includes(t));
  const hasValidExtension = isPdfType && extension === 'pdf';

  if (!file.type && !hasValidExtension) {
    return {
      valid: false,
      error: `Unable to detect file type. Please ensure you're uploading a valid file.`,
    };
  }

  if (!hasValidExtension && file.type && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type "${file.type}". Allowed: ${allowedTypes.join(', ')}`,
    };
  }
  // Check file size
  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    const fileMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File too large (${fileMB}MB). Maximum size: ${maxMB}MB`,
    };
  }
  return { valid: true };
}

export async function uploadCoverImage(
  file: File,
  onProgress?: ProgressCallback
): Promise<UploadResult> {
  const validation = validateFile(file, IMAGE_TYPES, MAX_IMAGE_SIZE);
  if (!validation.valid) {
    return { url: '', path: '', error: validation.error };
  }

  const fileName = generateFileName(file.name);
  const path = `covers/${fileName}`;

  try {
    const { error, data } = await supabase.storage
      .from('book-covers')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Cover upload error:', error);
      return { url: '', path: '', error: error.message };
    }

    if (!data || !data.path) {
      return { url: '', path: '', error: 'Upload failed - no data returned' };
    }

    const url = `${supabaseUrlBase}/storage/v1/object/public/book-covers/${data.path}`;
    console.log('Cover uploaded successfully:', url);
    return { url, path: data.path };
  } catch (err) {
    console.error('Cover upload exception:', err);
    const message = err instanceof Error ? err.message : 'Upload failed';
    return { url: '', path: '', error: message };
  }
}

export async function uploadPreviewPdf(
  file: File,
  onProgress?: ProgressCallback
): Promise<UploadResult> {
  const validation = validateFile(file, PDF_TYPES, MAX_PDF_SIZE);
  if (!validation.valid) {
    return { url: '', path: '', error: validation.error };
  }

  const fileName = generateFileName(file.name);
  const path = `previews/${fileName}`;

  try {
    const { error, data } = await supabase.storage
      .from('preview-pdfs')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Preview PDF upload error:', error);
      return { url: '', path: '', error: error.message };
    }

    if (!data || !data.path) {
      return { url: '', path: '', error: 'Upload failed - no data returned' };
    }

    const url = `${supabaseUrlBase}/storage/v1/object/public/preview-pdfs/${data.path}`;
    console.log('Preview PDF uploaded successfully:', url);
    return { url, path: data.path };
  } catch (err) {
    console.error('Preview PDF upload exception:', err);
    const message = err instanceof Error ? err.message : 'Upload failed';
    return { url: '', path: '', error: message };
  }
}

export async function uploadFullPdf(
  file: File,
  onProgress?: ProgressCallback
): Promise<UploadResult> {
  const validation = validateFile(file, PDF_TYPES, MAX_PDF_SIZE);
  if (!validation.valid) {
    return { url: '', path: '', error: validation.error };
  }

  const fileName = generateFileName(file.name);
  const path = `books/${fileName}`;

  console.log('Starting Full PDF upload:', { fileName, path, size: file.size, type: file.type });

  try {
    const { error, data } = await supabase.storage
      .from('full-pdfs')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Full PDF upload error:', error);
      return { url: '', path: '', error: error.message };
    }

    if (!data || !data.path) {
      console.error('Full PDF upload: No data returned');
      return { url: '', path: '', error: 'Upload failed - no data returned' };
    }

    const storagePath = data.path;
    // full-pdfs bucket is private — store the storage path, not a public URL.
    // The secure-download edge function generates a signed URL from this path.
    console.log('Full PDF uploaded successfully — bucket: full-pdfs, path:', storagePath);
    return { url: storagePath, path: storagePath };
  } catch (err) {
    console.error('Full PDF upload exception:', err);
    const message = err instanceof Error ? err.message : 'Upload failed';
    return { url: '', path: '', error: message };
  }
}

export async function uploadAvatar(
  file: File,
  userId: string
): Promise<UploadResult> {
  const validation = validateFile(file, IMAGE_TYPES, MAX_IMAGE_SIZE);
  if (!validation.valid) {
    return { url: '', path: '', error: validation.error };
  }

  const fileName = generateFileName(file.name);
  const path = `${userId}/${fileName}`;

  try {
    const { error, data } = await supabase.storage
      .from('avatars')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('Avatar upload error:', error);
      return { url: '', path: '', error: error.message };
    }

    if (!data || !data.path) {
      return { url: '', path: '', error: 'Upload failed - no data returned' };
    }

    const url = `${supabaseUrlBase}/storage/v1/object/public/avatars/${data.path}`;
    console.log('Avatar uploaded successfully:', url);
    return { url, path: data.path };
  } catch (err) {
    console.error('Avatar upload exception:', err);
    const message = err instanceof Error ? err.message : 'Upload failed';
    return { url: '', path: '', error: message };
  }
}

export async function deleteAvatar(path: string): Promise<boolean> {
  const { error } = await supabase.storage.from('avatars').remove([path]);
  return !error;
}

export async function deleteFile(bucket: string, path: string): Promise<boolean> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  return !error;
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function uploadPackageImage(
  file: File,
  onProgress?: ProgressCallback
): Promise<UploadResult> {
  const validation = validateFile(file, IMAGE_TYPES, MAX_IMAGE_SIZE);
  if (!validation.valid) {
    return { url: '', path: '', error: validation.error };
  }

  const fileName = generateFileName(file.name);
  const path = `gallery/${fileName}`;

  try {
    const { error, data } = await supabase.storage
      .from('package-images')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Package image upload error:', error);
      return { url: '', path: '', error: error.message };
    }

    if (!data || !data.path) {
      return { url: '', path: '', error: 'Upload failed - no data returned' };
    }

    const url = `${supabaseUrlBase}/storage/v1/object/public/package-images/${data.path}`;
    console.log('Package image uploaded successfully:', url);
    return { url, path: data.path };
  } catch (err) {
    console.error('Package image upload exception:', err);
    const message = err instanceof Error ? err.message : 'Upload failed';
    return { url: '', path: '', error: message };
  }
}

export async function deletePackageImage(path: string): Promise<boolean> {
  const { error } = await supabase.storage.from('package-images').remove([path]);
  return !error;
}
