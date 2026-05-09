// Curated voice roster for StoryMagic — 5 female + 5 male
// All voices are ElevenLabs DEFAULT voices (available on every account)

export type VoiceGender = 'female' | 'male';
export type VoiceAccent = 'american' | 'british';

export interface VoiceOption {
  id: string;             // ElevenLabs voice_id
  name: string;           // Display name
  gender: VoiceGender;
  accent: VoiceAccent;
  description: string;    // User-facing tagline
  vibe: string;           // Internal tag for sorting/filtering
}

export const STORYMAGIC_VOICES: VoiceOption[] = [
  // ===== FEMALE =====
  {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Sarah',
    gender: 'female',
    accent: 'american',
    description: 'Warm and gentle — like a loving mom at bedtime',
    vibe: 'calm-warm',
  },
  {
    id: 'pFZP5JQG7iQjIQuC4Bku',
    name: 'Lily',
    gender: 'female',
    accent: 'british',
    description: 'British storyteller with a warm narrator\'s touch',
    vibe: 'storyteller-classic',
  },
  {
    id: 'XrExE9yKIg1WjnnlVkGX',
    name: 'Matilda',
    gender: 'female',
    accent: 'american',
    description: 'Friendly and inviting — perfect for any adventure',
    vibe: 'friendly-narrator',
  },
  {
    id: 'Xb7hH8MSUJpSbSDYk0k2',
    name: 'Alice',
    gender: 'female',
    accent: 'british',
    description: 'Confident British voice for spirited tales',
    vibe: 'confident-storyteller',
  },
  {
    id: 'XB0fDUnXU5powFXDhCwa',
    name: 'Charlotte',
    gender: 'female',
    accent: 'british',
    description: 'Soft and lullaby-like — ideal for sleepy stories',
    vibe: 'gentle-lullaby',
  },
  // ===== MALE =====
  {
    id: 'JBFqnCBsd6RMkjVDRZzb',
    name: 'George',
    gender: 'male',
    accent: 'british',
    description: 'Warm British grandfather — the classic storyteller',
    vibe: 'warm-grandfather',
  },
  {
    id: 'pqHfZKP75CvOlQylNhV4',
    name: 'Bill',
    gender: 'male',
    accent: 'american',
    description: 'Trustworthy and kind — like a beloved grandpa',
    vibe: 'kind-grandpa',
  },
  {
    id: 'nPczCjzI2devNBz1zQrb',
    name: 'Brian',
    gender: 'male',
    accent: 'american',
    description: 'Deep and soothing — calming and steady',
    vibe: 'deep-soothing',
  },
  {
    id: 'TX3LPaxmHKxFdv7VOQHJ',
    name: 'Liam',
    gender: 'male',
    accent: 'american',
    description: 'Young and clear — like a fun older brother',
    vibe: 'youthful-articulate',
  },
  {
    id: 'onwK4e9ZLuTAKqWW03F9',
    name: 'Daniel',
    gender: 'male',
    accent: 'british',
    description: 'Authoritative British — perfect for magical tales',
    vibe: 'wizard-storyteller',
  },
];

export const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Sarah

// Voice settings tuned for calm storybook narration
export const STORYMAGIC_VOICE_SETTINGS = {
  stability: 0.65,
  similarityBoost: 0.75,
  style: 0.10,
  useSpeakerBoost: true,
};

// Multilingual v2 — best quality for long-form narration
export const STORYMAGIC_TTS_MODEL = 'eleven_multilingual_v2';

// Preview URL helper — previews are cached in Supabase Storage
export function getVoicePreviewUrl(voiceId: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/voice-previews/${voiceId}.mp3`;
}

export function getVoiceById(voiceId: string): VoiceOption | undefined {
  return STORYMAGIC_VOICES.find((v) => v.id === voiceId);
}

export function getVoicesByGender(gender: VoiceGender): VoiceOption[] {
  return STORYMAGIC_VOICES.filter((v) => v.gender === gender);
}

// Legacy compatibility — old code used internal IDs like 'warm-female'.
// Map them to the new ElevenLabs IDs for any books created before migration.
const LEGACY_VOICE_MAP: Record<string, string> = {
  'warm-female': '21m00Tcm4TlvDq8ikWAM',     // old Rachel
  'friendly-male': '29vD33N1CtxCmqQRPOHJ',    // old Drew
  'playful-female': 'EXAVITQu4vr4xnSDxMaL',   // old Bella → now Sarah
  'storyteller-male': 'ErXwobaYiN019PkySvjV',  // old Antoni
  'soft-female': 'MF3mGyEYCl7XYWbV9V6O',      // old Emily
};

export function resolveVoiceId(voiceId: string): string {
  return LEGACY_VOICE_MAP[voiceId] || voiceId;
}
