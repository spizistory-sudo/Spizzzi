@AGENTS.md

# StoryMagic — Personalized Children's Book Platform

## Project Overview

AI-powered platform where families create personalized, illustrated, narrated children's books. Users pick a theme (or write a custom story), enter their child's name, upload photos, and the platform generates a complete book with custom story, AI illustrations based on the child's appearance, voice-over narration, background music, and an interactive book reader with page-turn animations.

## Tech Stack

- **Framework:** Next.js 16 (App Router) with TypeScript
- **Styling:** Tailwind CSS + inline styles for reader components
- **Animations:** CSS 3D transforms for page-flip in reader
- **State:** Zustand (client-side wizard state, no persistence)
- **Database/Auth/Storage:** Supabase (PostgreSQL + Auth + Storage buckets + RLS)
- **AI - Story generation:** Google Gemini 2.5 Flash (text, JSON mode)
- **AI - Photo analysis:** Google Gemini 2.5 Flash Vision (character description extraction)
- **AI - Illustrations (prod):** Gemini 3 Pro Image Preview → Imagen 4 fallback
- **AI - Illustrations (dev):** FLUX.2 Pro via fal.ai ($0.03/image)
- **AI - Narration:** ElevenLabs TTS (eleven_multilingual_v2)
- **AI - Voice preview:** ElevenLabs Flash v2.5
- **PDF Export:** @react-pdf/renderer (server-side)
- **Payments:** Stripe (Phase 5, stubbed)
- **Deployment:** Vercel + Supabase Cloud

## Project Structure

```
storymagic/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout
│   │   ├── page.tsx                    # Landing / marketing page
│   │   ├── (auth)/login|signup         # Auth pages (client components)
│   │   ├── auth/callback/route.ts      # OAuth callback handler
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx              # Sidebar layout (client component)
│   │   │   ├── library/page.tsx        # Book library (server, force-dynamic)
│   │   │   └── create/
│   │   │       ├── page.tsx            # Choose Theme or Create Your Own
│   │   │       ├── theme/              # Step 1: Theme picker (10 themes)
│   │   │       ├── custom/             # Alt Step 1: Custom story (free text / guided)
│   │   │       ├── details/            # Step 2: Child name, age, traits, language
│   │   │       ├── photos/             # Step 3: Photo upload + labels
│   │   │       ├── preview/            # Step 4: Story + cover selection
│   │   │       └── finalize/           # Step 5: Voice + music + building screen
│   │   ├── (admin)/admin/              # Admin panel (protected by is_admin)
│   │   │   ├── analytics/              # Stats + charts (recharts)
│   │   │   ├── themes/                 # Theme CRUD
│   │   │   ├── prompts/                # All prompt templates editor with versioning
│   │   │   ├── music/                  # Music track manager + upload
│   │   │   ├── voices/                 # Voice preview + testing
│   │   │   └── users/                  # User management + credits
│   │   ├── reader/[bookId]/            # Interactive book reader (server → client)
│   │   ├── share/[slug]/               # Public shareable landing page + OG tags
│   │   └── api/
│   │       ├── generate-story/         # Gemini story generation
│   │       ├── generate-cover/         # 3 cover options (watercolor/cartoon/storybook)
│   │       ├── generate-illustrations/ # Per-page illustration (background gen)
│   │       ├── generate-narration/     # ElevenLabs TTS per page
│   │       ├── generate-animations/    # Seedance 2.0 stub (Phase 4+)
│   │       ├── analyze-photo/          # Gemini Vision character description
│   │       ├── preview-voice/          # ElevenLabs quick preview
│   │       ├── book-status/            # Polling endpoint for generation progress
│   │       ├── export-pdf/             # PDF generation with @react-pdf/renderer
│   │       └── books/[bookId]/         # Delete + share toggle
│   ├── components/
│   │   ├── reader/
│   │   │   ├── BookReader.tsx          # Main reader with spreads + page-flip
│   │   │   ├── CoverImage.tsx          # Shared cover with title overlay
│   │   │   ├── ReaderControls.tsx      # Bottom bar (prev/next/auto/play)
│   │   │   ├── ReaderSettings.tsx      # Slide-out settings panel
│   │   │   ├── AudioController.tsx     # Narration + music hook
│   │   │   ├── CoverPage.tsx           # Legacy (unused — use CoverImage)
│   │   │   └── PageSpread.tsx          # Legacy (unused — inline in BookReader)
│   │   ├── share/ShareModal.tsx        # Share + PDF export modal
│   │   ├── library/BookCard.tsx        # Library card with menu
│   │   └── wizard/WizardProgress.tsx   # Step indicator bar
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts               # Browser Supabase client
│   │   │   ├── server.ts               # Server Supabase client
│   │   │   ├── middleware.ts            # Auth middleware (session refresh)
│   │   │   └── storage.ts              # Upload helpers (image, audio)
│   │   ├── ai/
│   │   │   ├── gemini.ts               # Gemini client singleton
│   │   │   ├── fal-client.ts           # FLUX.2 Pro via fal.ai
│   │   │   ├── story-generator.ts      # Story generation (mock in dev)
│   │   │   ├── illustration-generator.ts # Image gen (FLUX dev / Gemini prod)
│   │   │   ├── photo-analyzer.ts       # Gemini Vision character extraction
│   │   │   ├── video-generator.ts      # Seedance 2.0 stub
│   │   │   ├── rate-limit.ts           # Retry with exponential backoff
│   │   │   └── prompts/
│   │   │       ├── story-system.ts     # Story system prompts (EN + HE)
│   │   │       ├── story-themes.ts     # 10 theme definitions
│   │   │       ├── style-references.ts # 3 art styles (watercolor/cartoon/storybook)
│   │   │       └── motion-prompts.ts   # Per-theme animation prompts
│   │   ├── elevenlabs/
│   │   │   ├── client.ts               # ElevenLabs client singleton
│   │   │   └── voices.ts               # 5 narrator voices
│   │   ├── music/tracks.ts             # Music track definitions + mood matching
│   │   ├── dev/
│   │   │   ├── config.ts               # isDevMode, isDevNarration, isDevPhotoAnalysis
│   │   │   └── mock-data.ts            # Mock story, character desc, silent MP3
│   │   └── utils/
│   │       ├── validators.ts           # Zod schemas
│   │       └── share.ts                # Share slug generation (nanoid)
│   ├── stores/creation-wizard.ts       # Zustand wizard state
│   └── types/                          # TypeScript types (book, theme, ai)
├── supabase/migrations/                # 001_initial_schema.sql
├── public/
│   ├── music/                          # 6 background music tracks (MP3)
│   └── sounds/page-turn.mp3           # Page flip sound effect
└── .env.local
```

## Build Phases — All Complete

- **Phase 1:** Foundation — auth, wizard, theme picker, child details, Gemini story generation, library
- **Phase 2:** Illustrations + book reader (photo upload, cover gen, per-page illustrations, spread reader)
- **Phase 3:** Audio + custom stories (ElevenLabs narration, music, custom story builder)
- **Phase 4:** Sharing + export (share slugs, OG tags, PDF export, Seedance stub)
- **Phase 5:** Admin panel, dev mode, FLUX integration, building screen

## Book Reader Architecture

The reader (`src/components/reader/BookReader.tsx`) uses a view-based system:
- **VIEW 0:** Cover — single centered page with cover illustration + title overlay
- **VIEWS 1..N:** Story spreads — left page (text on cream) + right page (illustration)
- **VIEW N+1:** The End spread — left (end text) + right (back cover branding)

Key rules:
- Right page illustrations use `position: absolute; inset: 0; object-fit: cover` — NO overlays, NO shadows on the illustration itself
- Spine is a single 1px line only
- Two-layer flip system: next spread pre-rendered underneath, current spread animates away with CSS 3D `rotateY`, commit on `animationend`
- Audio unlocked on user's first click (Start Reading), then autoplays per page
- `?skipCover=true` query param skips VIEW 0 (used when coming from building screen)

## Dev Mode System

When `DEV_MODE=true`:
- **Story:** Returns mock data (free, instant)
- **Photo analysis:** Mock unless `DEV_PHOTO_ANALYSIS=true` (then real Gemini Vision ~$0.001)
- **Illustrations:** Real FLUX.2 Pro via fal.ai (~$0.03/image) — NOT mock placeholders
- **Narration:** Silent MP3 unless `DEV_NARRATION=true` (then real ElevenLabs)
- **Animation:** Skipped entirely
- `TEST_PAGE_COUNT=3` overrides page count for cheaper testing

Total cost per dev test book: ~$0.18 (3 covers + 3 pages via FLUX)

## Critical Conventions

- **Supabase queries:** NEVER use `.single()` for queries that might return 0 rows — it throws. Use `.limit(1)` and check `data?.[0]` instead.
- **React Strict Mode:** All `useEffect` that trigger API calls MUST use a `useRef` guard to prevent double execution. Zustand state checks alone are NOT sufficient.
- **Cover images:** The AI prompt must say "Do NOT include any text/title" — title is added as CSS overlay via `CoverImage` component.
- **Illustration prompts:** Must include "Generate ONLY the scene as a flat digital painting. Do NOT draw a book, book pages, or any book frame." Otherwise AI renders book-inside-a-book effects.
- **RTL support:** All user-facing text uses `dir="auto"`. Story generation supports EN + HE.
- **Audio:** Use `isValidUrl()` guard before setting `src` on Audio elements. Never set `src = ''`.
- **NO PostCSS config:** Do NOT create `postcss.config.*` files. Turbopack handles `@import "tailwindcss"` natively in Next.js 16. Adding a PostCSS config causes Turbopack to deadlock on this iCloud-synced filesystem.
- **Middleware:** Uses `src/proxy.ts` (NOT `middleware.ts`) with `export function proxy()` — the Next.js 16 convention.
- **iCloud sync:** The project lives on Desktop (iCloud-synced). The `.next` build cache is sensitive to file provider interference. If dev server hangs on "Compiling", delete `.next` and restart.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY   # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY       # Supabase service role (server-side storage)
GEMINI_API_KEY                  # Google Gemini API
ELEVENLABS_API_KEY              # ElevenLabs TTS
FAL_KEY                         # fal.ai (FLUX.2 Pro)
NEXT_PUBLIC_APP_URL             # App URL (http://localhost:3000)
DEV_MODE                        # true = use mock story + FLUX images
DEV_NARRATION                   # true = real ElevenLabs even in dev mode
DEV_PHOTO_ANALYSIS              # true = real Gemini Vision even in dev mode
TEST_PAGE_COUNT                 # Override page count (e.g., 3)
```

## Commands

```bash
npm run dev      # Start dev server (clear .next if 404s: rm -rf .next)
npm run build    # Production build
npm run lint     # ESLint
```
