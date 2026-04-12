import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key for storage operations
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase service role credentials');
  }
  return createClient(url, key);
}

export async function uploadImage(
  bucket: string,
  path: string,
  imageBuffer: Buffer,
  contentType = 'image/png'
): Promise<string> {
  const supabase = getServiceClient();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, imageBuffer, { contentType, upsert: true });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  return urlData.publicUrl;
}

export async function downloadImage(
  bucket: string,
  path: string
): Promise<Buffer> {
  const supabase = getServiceClient();

  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) throw error;

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function uploadAudio(
  bucket: string,
  path: string,
  audioBuffer: Buffer
): Promise<string> {
  const supabase = getServiceClient();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, audioBuffer, { contentType: 'audio/mpeg', upsert: true });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  return urlData.publicUrl;
}

export async function getImageBase64(
  bucket: string,
  path: string
): Promise<string> {
  const buffer = await downloadImage(bucket, path);
  return buffer.toString('base64');
}
