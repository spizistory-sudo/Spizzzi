# StoryMagic — Voice Picker + Speed Control Feature

**Project root:** `/Users/yossicohen/Desktop/StoryMagic/storymagic/`
**Stack:** Next.js 16 + TypeScript + Tailwind, Supabase, ElevenLabs
**Pattern:** A (voice locked at generation time, no in-reader voice swap)

This document is a complete spec for Claude Code. Implement the steps in order. Do NOT skip ahead — each step depends on the previous one.

---

## Goal

1. Add a curated 10-voice picker (5 female + 5 male) to the **pre-read book creation screen** alongside the existing music picker.
2. Add a **playback speed control** (0.75x / 1x / 1.25x / 1.5x) to the **book reader**, using browser `playbackRate` (no API calls, no credit burn).
3. Generate and cache **10 preview MP3s** (one short sample sentence per voice) in Supabase Storage so users can hear voices before picking — free forever after first generation.
4. Wire the selected `voice_id` through to the narration generation call so each book is generated with the user's chosen voice.

**Pattern A (locked):** voice is selected pre-generation, baked into the book. No voice swap available in the reader. Speed is the only in-reader audio control beyond play/pause.

---

## Step 1 — Create the voice config file

**File:** `lib/elevenlabs/voices.ts` *(create new — if `lib/elevenlabs/` doesn't exist, create it)*

```typescript
// lib/elevenlabs/voices.ts
// Curated voice roster for StoryMagic — 5 female + 5 male
// All voices are ElevenLabs DEFAULT voices (available on every account, no library imports needed)

export type VoiceGender = 'female' | 'male';
export type VoiceAccent = 'american' | 'british';

export type VoiceOption = {
  id: string;             // ElevenLabs voice_id
  name: string;           // Display name
  gender: VoiceGender;
  accent: VoiceAccent;
  description: string;    // User-facing tagline
  vibe: string;           // Internal tag for sorting/filtering
  previewUrl?: string;    // Populated at runtime from Supabase
};

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

export const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Sarah — safest universal pick

// Voice settings tuned for calm storybook narration
// stability HIGH (consistent), style LOW (not theatrical), boost ON
export const STORYMAGIC_VOICE_SETTINGS = {
  stability: 0.65,
  similarity_boost: 0.75,
  style: 0.10,
  use_speaker_boost: true,
};

// Multilingual v2 — best quality for long-form narration. Do NOT use Flash here.
export const STORYMAGIC_TTS_MODEL = 'eleven_multilingual_v2';

// Helper for the picker UI
export function getVoicesByGender(gender: VoiceGender): VoiceOption[] {
  return STORYMAGIC_VOICES.filter(v => v.gender === gender);
}

export function getVoiceById(voiceId: string): VoiceOption | undefined {
  return STORYMAGIC_VOICES.find(v => v.id === voiceId);
}
```

---

## Step 2 — Update the narration generation call

**File:** find the existing ElevenLabs narration call. Likely at one of:
- `lib/elevenlabs/narration.ts`
- `lib/elevenlabs/generate.ts`
- `app/api/narration/route.ts`
- `app/api/generate-narration/route.ts`

If none of these exist, search for `eleven_multilingual_v2`, `elevenlabs.io/v1/text-to-speech`, or `xi-api-key` in the codebase to locate the current narration logic.

**What to change:**
1. Accept a `voiceId: string` parameter (was likely hardcoded before).
2. Use `STORYMAGIC_VOICE_SETTINGS` and `STORYMAGIC_TTS_MODEL` from the new config.
3. If the existing settings are different (e.g., higher style, lower stability), REPLACE them — these new settings are tuned for calm storybook narration.

**Reference shape of the call** (adapt to existing structure, don't rewrite the whole file):

```typescript
import {
  STORYMAGIC_VOICE_SETTINGS,
  STORYMAGIC_TTS_MODEL,
  DEFAULT_VOICE_ID
} from '@/lib/elevenlabs/voices';

export async function generateNarration({
  text,
  voiceId = DEFAULT_VOICE_ID,
}: {
  text: string;
  voiceId?: string;
}): Promise<ArrayBuffer> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: STORYMAGIC_TTS_MODEL,
        voice_settings: STORYMAGIC_VOICE_SETTINGS,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs TTS failed: ${response.status} ${await response.text()}`);
  }

  return response.arrayBuffer();
}
```

**Important:** every place in the codebase that calls narration generation must now pass the user's selected `voiceId`. Find all callers and update them. Common candidates:
- The book generation pipeline (likely `app/api/generate-book/route.ts` or similar)
- Any "regenerate page audio" admin function
- The DEV_NARRATION test path

If the book generation pipeline reads narration settings from a per-book record, **add a `voice_id` column to the books table** (Step 3).

---

## Step 3 — Add voice_id to the database schema

**Supabase project ref:** `jhwzjrclptwclyewehff`

Run this migration via the Supabase dashboard SQL editor or `supabase migration new add_voice_id_to_books`:

```sql
-- Add voice_id to books table
ALTER TABLE books
  ADD COLUMN IF NOT EXISTS voice_id TEXT DEFAULT 'EXAVITQu4vr4xnSDxMaL';

-- Backfill existing books with the default voice
UPDATE books
  SET voice_id = 'EXAVITQu4vr4xnSDxMaL'
  WHERE voice_id IS NULL;

-- Index for any future analytics on voice popularity
CREATE INDEX IF NOT EXISTS idx_books_voice_id ON books(voice_id);
```

If the table is named something else (e.g. `stories`, `book_drafts`), substitute. Confirm by querying:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

After the migration, regenerate Supabase types if the project uses generated types:
```bash
npx supabase gen types typescript --project-id jhwzjrclptwclyewehff --schema public > lib/supabase/database.types.ts
```

---

## Step 4 — Generate and cache the 10 preview MP3s

This is a **one-time setup script**. Run once locally, MP3s land in Supabase Storage, then `previewUrl` for each voice points to the public CDN URL forever. No further ElevenLabs cost for previews.

**File:** `scripts/generate-voice-previews.ts` *(create new)*

```typescript
// scripts/generate-voice-previews.ts
// Run with: npx tsx scripts/generate-voice-previews.ts
// One-time script. Generates a sample MP3 per voice and uploads to Supabase Storage.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import {
  STORYMAGIC_VOICES,
  STORYMAGIC_VOICE_SETTINGS,
  STORYMAGIC_TTS_MODEL,
} from '../lib/elevenlabs/voices';

const SAMPLE_TEXT =
  'Once upon a time, in a land far away, a small adventure was about to begin. ' +
  'Are you ready to listen?';

const BUCKET = 'voice-previews';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service role required for Storage write
);

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === BUCKET);
  if (!exists) {
    await supabase.storage.createBucket(BUCKET, { public: true });
    console.log(`✓ Created bucket: ${BUCKET}`);
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
        model_id: STORYMAGIC_TTS_MODEL,
        voice_settings: STORYMAGIC_VOICE_SETTINGS,
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`Failed for ${voiceName}: ${res.status} ${await res.text()}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function uploadPreview(voiceId: string, buffer: Buffer): Promise<string> {
  const path = `${voiceId}.mp3`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: 'audio/mpeg',
      upsert: true, // overwrite if re-run
    });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function main() {
  await ensureBucket();
  console.log(`Generating previews for ${STORYMAGIC_VOICES.length} voices...\n`);

  const results: Array<{ name: string; url: string }> = [];

  for (const voice of STORYMAGIC_VOICES) {
    process.stdout.write(`  ${voice.name}... `);
    try {
      const audio = await generatePreview(voice.id, voice.name);
      const url = await uploadPreview(voice.id, audio);
      results.push({ name: voice.name, url });
      console.log('✓');
    } catch (e) {
      console.log(`✗  ${(e as Error).message}`);
    }
  }

  console.log('\n=== Preview URLs ===');
  results.forEach(r => console.log(`${r.name}: ${r.url}`));
  console.log('\nDone. URLs follow the pattern:');
  console.log(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/<voice_id>.mp3`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
```

**Run it once:**
```bash
cd /Users/yossicohen/Desktop/StoryMagic/storymagic
npx tsx scripts/generate-voice-previews.ts
```

**Cost:** ~250 chars × 10 voices = ~2,500 chars total. On the ElevenLabs Creator plan that's roughly $0.15 in credits, one-time.

**Helper for the picker** — add to `lib/elevenlabs/voices.ts`:

```typescript
// At the top of voices.ts, add:
export const VOICE_PREVIEW_BASE_URL =
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/voice-previews`;

export function getVoicePreviewUrl(voiceId: string): string {
  return `${VOICE_PREVIEW_BASE_URL}/${voiceId}.mp3`;
}
```

---

## Step 5 — Build the shared `<VoicePicker />` component

**File:** `components/voice-picker/VoicePicker.tsx` *(create new — match existing component folder convention; if components live under `app/components/`, put it there instead)*

This component is **shared** between the book creation screen and any future use case. Keep it presentation-focused; the parent owns selection state.

```typescript
// components/voice-picker/VoicePicker.tsx
'use client';

import { useRef, useState } from 'react';
import {
  STORYMAGIC_VOICES,
  type VoiceOption,
  getVoicePreviewUrl,
} from '@/lib/elevenlabs/voices';

type Props = {
  selectedVoiceId: string;
  onSelect: (voiceId: string) => void;
  className?: string;
};

export function VoicePicker({ selectedVoiceId, onSelect, className = '' }: Props) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const female = STORYMAGIC_VOICES.filter(v => v.gender === 'female');
  const male = STORYMAGIC_VOICES.filter(v => v.gender === 'male');

  const handlePreview = (voiceId: string) => {
    // Stop current playback if any
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Toggle off if same voice clicked
    if (playingId === voiceId) {
      setPlayingId(null);
      return;
    }

    const audio = new Audio(getVoicePreviewUrl(voiceId));
    audioRef.current = audio;
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);
    audio.play().catch(() => setPlayingId(null));
    setPlayingId(voiceId);
  };

  const renderVoice = (voice: VoiceOption) => {
    const isSelected = voice.id === selectedVoiceId;
    const isPlaying = voice.id === playingId;

    return (
      <button
        key={voice.id}
        type="button"
        onClick={() => onSelect(voice.id)}
        className={`
          group relative flex flex-col items-start gap-2
          rounded-2xl border p-4 text-left transition-all
          ${isSelected
            ? 'border-violet-400 bg-violet-500/10 ring-2 ring-violet-400/50'
            : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
          }
        `}
      >
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base font-medium text-white">{voice.name}</span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60">
              {voice.accent === 'british' ? '🇬🇧' : '🇺🇸'}
            </span>
          </div>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              handlePreview(voice.id);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                handlePreview(voice.id);
              }
            }}
            className={`
              flex h-8 w-8 items-center justify-center rounded-full
              transition-all
              ${isPlaying
                ? 'bg-violet-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
              }
            `}
            aria-label={isPlaying ? `Stop ${voice.name} preview` : `Play ${voice.name} preview`}
          >
            {isPlaying ? (
              // Pause icon
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <rect x="2" y="1" width="3" height="10" rx="0.5" />
                <rect x="7" y="1" width="3" height="10" rx="0.5" />
              </svg>
            ) : (
              // Play icon
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M2.5 1.5L10 6L2.5 10.5V1.5Z" />
              </svg>
            )}
          </span>
        </div>
        <p className="text-sm text-white/60">{voice.description}</p>
      </button>
    );
  };

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      <section>
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-white/50">
          Female voices
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {female.map(renderVoice)}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-white/50">
          Male voices
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {male.map(renderVoice)}
        </div>
      </section>
    </div>
  );
}
```

**Styling note:** the classes above use the Premium Night Sky dark glassmorphism palette already in StoryMagic (`bg-white/5`, `border-white/10`, violet accents). If your existing design tokens use different class names, swap them — but keep the visual hierarchy: selected state uses violet ring, hover increases white opacity, preview button is a circular icon button.

---

## Step 6 — Wire `<VoicePicker />` into the book creation screen

**File:** find the book creation/setup screen. Likely at one of:
- `app/create/page.tsx`
- `app/new-book/page.tsx`
- `app/(book)/create/page.tsx`
- `components/book-creation/BookCreationForm.tsx`

It's the screen where the user picks **music** (and currently a voice somewhere). Search for the music picker component or "music" string to find it fast.

**Changes:**
1. Add `voiceId` to the form state (default to `DEFAULT_VOICE_ID`).
2. Render `<VoicePicker />` directly above or below the music picker.
3. Pass `voiceId` to whatever submits the form / kicks off generation.
4. Persist `voice_id` to the books table when the book record is created.

**Pattern (adapt to existing form architecture):**

```typescript
import { useState } from 'react';
import { VoicePicker } from '@/components/voice-picker/VoicePicker';
import { DEFAULT_VOICE_ID } from '@/lib/elevenlabs/voices';

export default function BookCreationPage() {
  // ...existing state (child name, story prompt, music, etc.)
  const [voiceId, setVoiceId] = useState<string>(DEFAULT_VOICE_ID);

  const handleCreate = async () => {
    // ...existing submission, but include voiceId:
    await createBook({
      // ...existing fields,
      voice_id: voiceId,
      music_id: selectedMusic, // or whatever the music field is
    });
  };

  return (
    <div className="...">
      {/* existing fields */}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">
          Choose a narrator
        </h2>
        <p className="text-sm text-white/60">
          Tap any voice to hear a sample. Pick the one that feels right for bedtime.
        </p>
        <VoicePicker
          selectedVoiceId={voiceId}
          onSelect={setVoiceId}
        />
      </section>

      {/* music picker stays where it is */}

      <button onClick={handleCreate}>Create my book</button>
    </div>
  );
}
```

**On the API/server side**, the create-book handler must persist `voice_id` and pass it to the narration generation pipeline. If the pipeline reads from the book record, it'll just work. If narration is generated synchronously and `voice_id` isn't being passed through, plumb it through.

---

## Step 7 — Add the speed control to the book reader

**File:** find the book reader. Likely at one of:
- `app/read/[bookId]/page.tsx`
- `app/book/[id]/page.tsx`
- `components/reader/BookReader.tsx`
- `components/reader/AudioController.tsx`

The reader currently has audio playback (with the previously-fixed null controller bug). Find the `<audio>` element or `audioRef`.

**Create:** `components/reader/SpeedControl.tsx`

```typescript
// components/reader/SpeedControl.tsx
'use client';

import { useEffect, useState } from 'react';

const SPEEDS = [0.75, 1.0, 1.25, 1.5] as const;
type Speed = typeof SPEEDS[number];

const STORAGE_KEY = 'storymagic-narration-speed';

type Props = {
  audioRef: React.RefObject<HTMLAudioElement>;
  className?: string;
};

export function SpeedControl({ audioRef, className = '' }: Props) {
  const [speed, setSpeed] = useState<Speed>(1.0);

  // Hydrate from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = parseFloat(stored);
      if (SPEEDS.includes(parsed as Speed)) {
        setSpeed(parsed as Speed);
      }
    }
  }, []);

  // Apply to audio element whenever speed changes OR audio src changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed, audioRef]);

  // Re-apply when audio is loaded (e.g., page turn loads new audio)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleLoaded = () => {
      audio.playbackRate = speed;
    };
    audio.addEventListener('loadedmetadata', handleLoaded);
    return () => audio.removeEventListener('loadedmetadata', handleLoaded);
  }, [speed, audioRef]);

  const handleSpeedChange = (newSpeed: Speed) => {
    setSpeed(newSpeed);
    localStorage.setItem(STORAGE_KEY, String(newSpeed));
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  return (
    <div
      className={`flex items-center gap-1 rounded-full bg-white/5 p-1 backdrop-blur-sm ${className}`}
      role="group"
      aria-label="Narration speed"
    >
      {SPEEDS.map(s => (
        <button
          key={s}
          type="button"
          onClick={() => handleSpeedChange(s)}
          className={`
            min-w-[44px] rounded-full px-3 py-1 text-xs font-medium transition-all
            ${s === speed
              ? 'bg-violet-500 text-white shadow-sm'
              : 'text-white/60 hover:bg-white/10 hover:text-white'
            }
          `}
          aria-pressed={s === speed}
          aria-label={`Set speed to ${s}x`}
        >
          {s === 1.0 ? '1x' : `${s}x`}
        </button>
      ))}
    </div>
  );
}
```

**Wire into the reader:**

```typescript
import { SpeedControl } from '@/components/reader/SpeedControl';

// inside the reader component, near the audio controls:
<SpeedControl audioRef={audioRef} />
```

**Critical reminder for the reader:** when the user turns the page and a new audio source loads, the `playbackRate` resets to 1.0 in some browsers. The `loadedmetadata` listener in the component above re-applies it, but **double-check** by manually flipping pages and confirming speed persists.

If the reader uses **separate `<audio>` elements per page** (less common) instead of swapping `src` on a single element, the `audioRef` will need to point to the active one — coordinate with however page-turn audio is currently handled.

---

## Step 8 — Test checklist

Before considering this done, verify:

- [ ] `npx tsx scripts/generate-voice-previews.ts` ran successfully and 10 MP3s exist in the `voice-previews` Supabase bucket
- [ ] All 10 preview MP3s play correctly when clicking the play icon in the picker (test in a browser, not just dev tools)
- [ ] Picking a voice in the create screen and creating a book results in the chosen voice in the generated narration (DB `books.voice_id` matches selection)
- [ ] Default voice (Sarah) is pre-selected on a fresh book creation
- [ ] Books created BEFORE the migration still play (backfill ran correctly)
- [ ] Speed control buttons in the reader change playback speed in real time
- [ ] Speed selection persists across page turns within the same book
- [ ] Speed selection persists across browser sessions (localStorage)
- [ ] Speed defaults to 1x for first-time users
- [ ] No regression in the existing audio controller null bug
- [ ] No regression in the cover image generation (separate system)

---

## What this does NOT include (deferred for later)

- **In-reader voice swap with regeneration** (Pattern B/C) — locked Pattern A per spec
- **Custom voice cloning** (per-parent voice for premium tier) — separate phase
- **Per-character voices for dialogue** (Eleven v3 multi-speaker) — much bigger lift, future work
- **Hebrew voice support** — current 10 voices are English. The model `eleven_multilingual_v2` supports Hebrew so it'll still output something, but voice IDs above are tuned for English. If Hebrew narration is needed, curate a separate Hebrew voice list.
- **Voice analytics dashboard** in `/admin` — useful later (which voices are most popular?), out of scope now

---

## Cost summary

- One-time preview generation: ~$0.15 in ElevenLabs credits (tiny)
- Per-book narration cost: **unchanged** — same as before, just with a different voice_id
- Speed control: **$0.00** — pure browser playback, no API calls
- Storage: 10 small MP3s (~50KB each) = negligible Supabase Storage usage

---

## File summary (what gets created/modified)

**New files:**
- `lib/elevenlabs/voices.ts`
- `scripts/generate-voice-previews.ts`
- `components/voice-picker/VoicePicker.tsx`
- `components/reader/SpeedControl.tsx`

**Modified files:**
- The narration generation function (wherever it currently lives)
- The book creation screen/form
- The book reader component
- Supabase schema (add `voice_id` to `books`)

---

End of spec. Implement steps 1 → 8 in order. Report back after Step 4 (preview generation script run) so we can verify the MP3s sound right before wiring the rest of the UI.
