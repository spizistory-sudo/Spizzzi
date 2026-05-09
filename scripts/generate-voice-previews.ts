/**
 * Generate and cache voice preview MP3s in Supabase Storage.
 *
 * Usage:
 *   npx tsx scripts/generate-voice-previews.ts
 *
 * One-time script. Generates a short sample per voice and uploads to
 * the `voice-previews` Supabase bucket. Public URLs are permanent.
 *
 * Cost: ~$0.15 total in ElevenLabs credits (2,500 chars).
 */

import * as path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { createClient } from '@supabase/supabase-js';

// Import voice config — can't use @ alias in scripts, so use relative path
const VOICES = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George' },
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel' },
];

const SAMPLE_TEXT =
  'Once upon a time, in a land far away, a small adventure was about to begin. ' +
  'Are you ready to listen?';

const MODEL = 'eleven_multilingual_v2';
const VOICE_SETTINGS = {
  stability: 0.65,
  similarity_boost: 0.75,
  style: 0.10,
  use_speaker_boost: true,
};

const BUCKET = 'voice-previews';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error) throw new Error(`Failed to create bucket: ${error.message}`);
    console.log(`Created bucket: ${BUCKET}`);
  }
}

async function generatePreview(voiceId: string, voiceName: string): Promise<Buffer> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: SAMPLE_TEXT,
        model_id: MODEL,
        voice_settings: VOICE_SETTINGS,
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed for ${voiceName}: ${res.status} ${body}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function uploadPreview(voiceId: string, buffer: Buffer): Promise<string> {
  const filePath = `${voiceId}.mp3`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, buffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

async function main() {
  console.log(`ELEVENLABS_API_KEY: ${process.env.ELEVENLABS_API_KEY ? 'set' : 'MISSING'}`);
  console.log(`SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'MISSING'}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING'}\n`);

  await ensureBucket();
  console.log(`Generating previews for ${VOICES.length} voices...\n`);

  const results: Array<{ name: string; url: string }> = [];

  for (const voice of VOICES) {
    process.stdout.write(`  ${voice.name}... `);
    try {
      const audio = await generatePreview(voice.id, voice.name);
      const url = await uploadPreview(voice.id, audio);
      results.push({ name: voice.name, url });
      console.log(`done (${(audio.length / 1024).toFixed(0)} KB)`);
    } catch (e) {
      console.log(`FAILED: ${(e as Error).message}`);
    }
  }

  console.log('\n=== Preview URLs ===');
  results.forEach((r) => console.log(`${r.name}: ${r.url}`));
  console.log(`\nGenerated ${results.length}/${VOICES.length} previews.`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
