import { supabase, STORAGE_BUCKET } from './supabase.ts';

export interface UploadedFileResult {
  name: string;
  path: string;
  size: number;
  type: string;
  signedUrl: string;
}

/**
 * Upload a file to the Supabase UPLOADS bucket and retrieve a signed URL.
 */
export async function uploadToSupabaseBucket(
  file: File,
  userId?: string
): Promise<UploadedFileResult> {
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const userPrefix = userId ? `${userId}/` : '';
  const filePath = `${userPrefix}${Date.now()}-${sanitizedName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Create a 7-day signed URL for secure viewing/downloading
  const { data: signedData, error: signedError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(filePath, 60 * 60 * 24 * 7);

  if (signedError || !signedData?.signedUrl) {
    // Fallback to public URL representation if signed URL fails
    const { data: pubData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return {
      name: file.name,
      path: filePath,
      size: file.size,
      type: file.type,
      signedUrl: pubData.publicUrl,
    };
  }

  return {
    name: file.name,
    path: filePath,
    size: file.size,
    type: file.type,
    signedUrl: signedData.signedUrl,
  };
}
