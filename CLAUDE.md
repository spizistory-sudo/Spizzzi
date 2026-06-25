@AGENTS.md

# Spizzzy — Master Reference

## 1. Project Overview

AI-powered personalized children's book platform. Parents upload a child's photo, choose an art style and story category, and the platform generates a complete illustrated storybook with AI-generated text, illustrations matching the child's appearance and chosen art style, voice narration, background music, and an interactive reader with page-flip animations.

**Current status:** English-first with Israeli Hebrew legacy support. Production at spizzzi.vercel.app.

**Brand:** "Spizzzy" (Latin letters, with y) in all user-facing UI. Code identifiers still use `StoryMagic` or `STORYMAGIC_` internally. Vercel URL: `spizzzi.vercel.app` (with i).

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.1 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS 4.2.2 + inline styles |
| State | Zustand (client wizard state, no persistence) |
| Database/Auth/Storage | Supabase (PostgreSQL + Auth + Storage + RLS) |
| Story generation (EN) | Claude Opus 4.7 via Anthropic SDK (structured story + character bible) |
| Story curation (EN) | Claude Haiku 4.5 (ranks 72 stories for child fit) |
| Story generation (HE) | Claude Sonnet 4.5 (structured Hebrew stories) |
| Photo analysis | Gemini 2.5 Flash Vision (character description) |
| Photo validation | Gemini 2.5 Flash (person detection pre-check) |
| Illustrations (prod) | Gemini 3 Pro Image Preview → Imagen 4 fallback |
| Illustrations (dev) | FLUX.2 Pro via fal.ai (~$0.03/image) |
| Animation | MiniMax Hailuo-02 via fal.ai → Kling v1.6 fallback |
| Narration (Hebrew) | ElevenLabs eleven_v3, Liam voice |
| Narration (English) | ElevenLabs eleven_multilingual_v2, 10 curated voices |
| PDF export | @react-pdf/renderer |
| Icons | lucide-react |
| Deployment | Vercel (hobby plan, maxDuration=300) |
| Fonts | Figtree + Lora (English), Heebo + Rubik (Hebrew) |

---

## 2. Architecture

### Directory Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout, metadata "Spizzzy"
│   ├── page.tsx                      # Landing page (logo, hero, video, cards, category strip)
│   ├── (auth)/login|signup           # Auth pages (glassmorphism dark theme)
│   ├── auth/callback/route.ts        # OAuth callback
│   ├── (dashboard)/
│   │   ├── layout.tsx                # Sidebar layout (Spizzzy logo image)
│   │   ├── library/page.tsx          # Book library
│   │   └── create/
│   │       ├── page.tsx              # Two-card chooser: Guided + Write Your Own (coming soon)
│   │       ├── details/              # Step 1: Name, age, gender, photo upload, optional traits/interests
│   │       ├── style/                # Step 2: 8 art style cards with preview PNGs
│   │       ├── categories/           # Step 3: 7 category cards (icon + text, lucide-react)
│   │       ├── stories/              # Step 4: AI-curated story cards + inline story generation
│   │       ├── finalize/             # Step 5: Voice + music + "Create My Book" → building reveal
│   │       ├── preview/              # Dead route → redirects to finalize or details
│   │       ├── photos/               # Legacy (Hebrew flow)
│   │       ├── theme/                # Legacy (Hebrew flow)
│   │       ├── custom/               # Legacy (Hebrew flow)
│   │       ├── topic/                # Legacy (Hebrew flow)
│   │       └── all-stories/          # Legacy browse-all
│   ├── (admin)/admin/                # Admin panel (voices, prompts)
│   ├── reader/[bookId]/              # Book reader (server → client)
│   ├── share/[slug]/                 # Public share page
│   └── api/
│       ├── generate-story/           # Claude Opus story generation (EN) + Gemini (HE legacy)
│       ├── curate-stories/           # Claude Haiku story recommendations
│       ├── generate-cover/           # Single cover in chosen style (Gemini 3 Pro)
│       ├── generate-illustrations/   # Per-page illustration with style preview reference
│       ├── generate-narration/       # ElevenLabs TTS per page
│       ├── analyze-photo/            # Gemini Vision character description (book-linked)
│       ├── analyze-photo-standalone/ # Gemini Vision + person validation (no bookId needed)
│       ├── preview-voice/            # ElevenLabs quick voice preview
│       ├── book-status/              # Polling endpoint for generation progress
│       ├── export-pdf/               # PDF generation
│       ├── animate-book/             # fal.ai video submission
│       └── animate-page/status/      # Poll fal.ai queue
├── components/
│   ├── reader/ (BookReader, ReaderPanel, ReaderControls, ReaderSettings, AudioController, CoverImage, AnimatePromptModal, AnimationProgress)
│   ├── share/ShareModal.tsx
│   ├── library/BookCard.tsx
│   ├── wizard/
│   │   ├── WizardProgress.tsx        # 6-step EN / 5-step HE progress indicator
│   │   └── PhotoUpload.tsx           # Shared drag-and-drop photo upload component
│   └── ui/ (NightSkyBackground, MagicReaderBackground, VideoBackground)
├── lib/
│   ├── supabase/ (client.ts, server.ts, middleware.ts, storage.ts)
│   ├── ai/
│   │   ├── gemini.ts                 # Client singleton
│   │   ├── fal-client.ts            # FLUX.2 Pro wrapper
│   │   ├── story-generator.ts       # Hebrew story gen (Gemini legacy + Claude structured)
│   │   ├── story-generation-en.ts   # English story gen (Claude Opus + character bible + style tone)
│   │   ├── curation-en.ts           # Story curation (Claude Haiku)
│   │   ├── illustration-generator.ts # Gemini 3 Pro with 3-image reference (photo + style + cover)
│   │   ├── photo-analyzer.ts        # Gemini Vision with 503 retry
│   │   ├── rate-limit.ts            # Exponential backoff wrapper
│   │   └── prompts/
│   │       ├── style-references.ts  # 8 art styles with stylePrompt + storyTonePrompt
│   │       ├── en/ (story-catalog.ts, age-rules.ts)
│   │       └── (story-system.ts, story-themes.ts, motion-prompts.ts)
│   ├── elevenlabs/ (client.ts, voices.ts — 10 curated voices)
│   ├── music/tracks.ts
│   ├── personality-traits-en.ts     # 17 traits with prompt_instruction
│   ├── interests-en.ts             # 24 interests in 5 groups
│   ├── dev/ (config.ts, mock-data.ts)
│   └── utils/ (validators.ts, share.ts)
├── stores/creation-wizard.ts         # Zustand store (selectedStyleKey, photoDescription, etc.)
├── types/ (book.ts, ai.ts, theme.ts)
└── middleware.ts                     # Supabase session refresh
```

### English Create Flow (Current)

```
/create (two-card chooser: Guided vs Write Your Own)
  → /create/details (name + age + gender + photo upload + optional traits/interests)
     Photo analyzed via /api/analyze-photo-standalone (person validation + character description)
  → /create/style (8 art style cards with preview PNGs from /public/images/styles/)
  → /create/categories (7 icon+text category cards)
  → /create/stories (AI curation → story cards → pick one → inline story generation via Claude Opus)
     Story generated with character_bible based on real photo description + style tone
     Photos saved to DB with new bookId
  → /create/finalize (voice picker + music picker → "Create My Book")
     Fires in parallel: cover generation (single style) + illustrations + narration
     Building screen with progress polling, cover poll, "Painting your cover..." spinner
     Phase transitions to 'done' only when illustrations + narrations + cover all complete
  → /reader/[bookId] ("Start Reading")
```

### Hebrew Create Flow (Legacy, unchanged)

```
/create/theme → /create/details → /create/photos → /create/preview → /create/finalize → /reader
```

### Illustration Reference Image Pipeline

Cover and page illustrations receive up to 3 reference images:
1. **Child photo** (FIRST) — character identity anchor
2. **Style preview PNG** (SECOND) — authoritative art style reference from `/public/images/styles/<key>.png`
3. **Cover image** (THIRD, pages only) — consistency with other pages

Prompt hierarchy: "PHOTO = who the character IS. STYLE EXAMPLE = how to RENDER them. COVER = consistency."

---

## 3. Art Styles (8 total)

File: `src/lib/ai/prompts/style-references.ts`

| Key | Display Name | Style |
|---|---|---|
| watercolor | Watercolor Dreams | Modern watercolor on cold-pressed paper, Beatrix Potter feel |
| comic | Bold Comic | Multi-panel layout, POW/ZAP bubbles, halftone dots, Dog Man style |
| anime | Anime Fantasy | Studio Ghibli cel-shading, large expressive eyes, magical particles |
| claymation | Claymation | Bright plasticine clay, fingerprints, Aardman Animations style |
| minimalist | Minimalist Doodle | Pen-and-ink, 3-4 colors, massive white space, Mo Willems/Jon Klassen |
| storybook | Modern Picture Book | Gouache/acrylic, Caldecott winners, Sophie Blackall/Carson Ellis |
| pixar | Pixar Adventure | 3D CGI, subsurface scattering, cinematic lighting, Pixar style |
| vintage | Vintage Nostalgia | 1950s screen-print, 4-5 colors, Mary Blair/Little Golden Books |

Each style has:
- `stylePrompt` — detailed visual instruction for illustration model
- `storyTonePrompt` — narrative tone instruction for story generation (e.g., comic = punchy action, watercolor = gentle reflective)
- `previewDescription` — one-line tagline for the picker UI
- Preview PNG at `/public/images/styles/<key>.png`

---

## 4. Voice System (10 voices)

File: `src/lib/elevenlabs/voices.ts`

| Name | Gender | Accent | ElevenLabs ID |
|---|---|---|---|
| Sarah | female | american | EXAVITQu4vr4xnSDxMaL |
| Lily | female | british | pFZP5JQG7iQjIQuC4Bku |
| Matilda | female | american | XrExE9yKIg1WjnnlVkGX |
| Alice | female | british | Xb7hH8MSUJpSbSDYk0k2 |
| Charlotte | female | british | XB0fDUnXU5powFXDhCwa |
| George | male | british | JBFqnCBsd6RMkjVDRZzb |
| Bill | male | american | pqHfZKP75CvOlQylNhV4 |
| Brian | male | american | nPczCjzI2devNBz1zQrb |
| Liam | male | american | TX3LPaxmHKxFdv7VOQHJ |
| Daniel | male | british | onwK4e9ZLuTAKqWW03F9 |

Settings: `STORYMAGIC_VOICE_SETTINGS` — stability=0.65, similarity_boost=0.75, style=0.10, speed=0.90
Model: `eleven_multilingual_v2`
Default: Sarah (EXAVITQu4vr4xnSDxMaL)
Legacy voice IDs (warm-female, friendly-male, etc.) resolved via `resolveVoiceId()`

---

## 5. Character Consistency Pipeline

1. **Photo upload** — `/create/details` → Supabase Storage
2. **Photo validation** — `/api/analyze-photo-standalone` → Gemini 2.5 Flash yes/no person check
3. **Photo analysis** — same endpoint → Gemini 2.5 Flash Vision → detailed character description → stored in wizard as `photoDescription`
4. **Story generation** — `/api/generate-story` receives `photoDescription` → Claude Opus uses it verbatim in `character_bible` (no invented features)
5. **Book metadata** — `character_description` + `character_bible` both saved at book creation
6. **Photos DB** — `/create/stories` inserts uploaded photos into `photos` table with new `bookId`
7. **Cover generation** — reads `character_description` + `character_bible` from metadata, hard gender lock, photo + style preview as reference images
8. **Page generation** — same character description + 3 reference images (photo → style preview → cover), gender lock, character description repeated before scene

### Gender Lock
Every illustration prompt starts with: "THIS CHARACTER IS A GIRL/BOY — feminine/masculine face, features. NOT a boy/girl. The character is FEMALE/MALE."
Gender read from `metadata.child_profile.gender` (English flow) or `metadata.childGender` (Hebrew flow), normalized boy→male, girl→female.

### Anti-Text Rules
Shared `ANTI_TEXT_RULES` constant in illustration-generator.ts. Exhaustive list: no words, letters, numbers, signs, labels, speech bubbles, watermarks, calligraphy. Books/signs/paper must be blank. Context-aware extra reminder when scene involves text-related objects.

---

## 6. Database Schema (Supabase)

### Key Tables

**books** — `metadata` JSONB now stores:
- `language`, `story_template_id`, `child_profile` (name, age, gender, traits, interests)
- `character_description` (from photo analysis), `character_bible` (from story generation)
- `main_theme`, `key_message`, `style_key` (chosen art style)
- `narrator_voice_id`, `narrator_voice_name`, `selected_music_id`

**cover_options** — now 1 per book (single chosen style), auto-selected with `is_selected: true`

**photos** — `book_id`, `user_id`, `storage_path`, `label` (child|parent|sibling|pet)

---

## 7. DEV_MODE Configuration

| Flag | Env Var | Default | Effect |
|---|---|---|---|
| `isDevMode()` | `DEV_MODE=true` | off | Mock story (skips Gemini), silent narration, skip animation |
| `isDevNarration()` | `DEV_NARRATION=true` | off | Use real ElevenLabs even when DEV_MODE=true |
| `useFluxRenderer()` | `DEV_ILLUSTRATIONS=true` | off | Use FLUX.2 Pro instead of Gemini 3 Pro (dev only, prod always Gemini) |
| `getTestPageCount()` | `TEST_PAGE_COUNT=3` | null | Override page count (both HE and EN flows) |

**Current Vercel config:** `TEST_PAGE_COUNT=3` (3-spread books for iteration speed).

---

## 7b. Trigger.dev Background Jobs

**Status:** Foundation proven + cloud-deployed. Worker CAN build a full book (R78a). Finalize NOT yet switched (R78b).

**Project ref:** `proj_hjzuvdayyaauyebsqqyq`

**Architecture:**
- `trigger.config.ts` — Trigger.dev project config, maxDuration 300, tasks in `src/trigger/`
- `src/trigger/build-book.ts` — task `build-book` that calls `runFullBuild(bookId)` from `src/lib/ai/build-pipeline.ts`
- `src/lib/ai/build-pipeline.ts` — shared orchestration module: `runFullBuild` → `runCharacterSheet` → `runCoverGeneration` → `runIllustrations` + `runNarration` (parallel). Uses the SAME generation functions as the live API routes.

**Env vars (Trigger.dev Production environment):**
- `TRIGGER_SECRET_KEY` — from Trigger.dev dashboard
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — for DB/storage
- `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `FAL_KEY`, `ELEVENLABS_API_KEY` — for AI providers

**Admin test endpoint:** POST `/api/internal-test/test-trigger` with `{ "bookId": "<id>" }` (admin-only, isAdmin guard).

**Dev vs Prod:** TRIGGER_SECRET_KEY must be the PROD key in Vercel; worker env vars must be set in Trigger.dev's Production environment.

---

## 8. Landing Page

File: `src/app/page.tsx` (client component)

Structure:
1. **Header** — Spizzzy logo image (192px, centered) + Sign in / Get started buttons
2. **Hero** — "Create magical stories starring your child" + subtitle + CTA buttons
3. **3 feature cards** — Pick a story / Make it theirs / Read & listen (unique FLUX-generated images in `/public/images/landing/`)
4. **Video** — "How it works" heading + HTML5 video (`/videos/how-it-works.mp4`)
5. **Category strip** — "Worlds to explore" + 7 category cards (4-col desktop grid, horizontal scroll mobile)
6. **Footer** — © Spizzzy

---

## 9. Scripts

```bash
npm run dev                          # Start dev server (port 3000)
npm run build                        # Production build with TypeScript check
npm run lint                         # ESLint
npm run generate:style-previews      # Generate 8 style preview PNGs via FLUX Pro
```

One-time scripts in `/scripts/`:
- `generate-style-previews.ts` — 8 art style preview images
- `generate-category-tiles.ts` — 7 category tile images
- `generate-landing-illustrations.ts` — 3 landing page hero card images
- `generate-voice-previews.ts` — 10 voice preview MP3s (uploaded to Supabase)

---

## 10. Known Issues and Resolutions

| Issue | Root Cause | Fix |
|---|---|---|
| Style not matching chosen style | Cover generator was generating all 8 in parallel, first-to-finish won | Now generates ONE cover in chosen styleKey from metadata |
| Character gender flipping | Gender read from wrong metadata field (always defaulted to male) | Read from `child_profile.gender`, normalize boy→male/girl→female |
| Photo description empty | analyze-photo overwrote entire metadata | Metadata merge (read-then-write) preserves other fields |
| Photos not found by illustration route | Photos uploaded to Storage but never inserted in DB | Stories page inserts photos into DB after book creation |
| Text baked into illustrations | Insufficient anti-text prompt | Aggressive ANTI_TEXT_RULES constant + context-aware extra reminders |
| Cover missing on reveal | Reveal transitioned to 'done' before cover finished | Separate effect watches buildProgress + coverUrl; cover polled every 3s |

---

## 11. Code Conventions

- **Brand:** "Spizzzy" (with y) in all user-facing UI, `spizzzi.vercel.app` (with i) in URLs
- **File naming:** kebab-case for files, PascalCase for components
- **Imports:** `@/` alias for `src/`, group by: external → internal → types
- **Logging:** `[module-name]` prefix on all console logs
- **Supabase queries:** `.limit(1)` not `.single()`, always check `data?.[0]`
- **Metadata writes:** Always read existing metadata first, then spread-merge
- **React effects:** `useRef` guard on any effect that triggers API calls
- **Style selection:** Violet ring (`rgba(155,125,212,0.70)`) for selected state across all pickers

---

## Responsive Conventions (mobile/iPad — apply to ALL new UI)

iPad landscape is the PRIMARY target device; the app must also work on iPhone and iPad portrait. Every new feature, fix, or component is built mobile-ready BY DEFAULT using the rules below. Desktop (lg+) must never visually regress when responsive variants are added.

**Breakpoints (Tailwind 4 defaults):** sm 640 · md 768 · lg 1024 · xl 1280
**Test widths:** 360/390 (phone) · 820 (iPad portrait) · 1180 (iPad landscape, primary) · 1440 (desktop)

### Layout
- Card/content grids: 1 col phone → 2 col iPad portrait → existing count at lg+. Pattern: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-N`. A multi-column grid with NO breakpoint variants WILL overflow on phones — never ship one.
- Responsive spacing: `gap-3 sm:gap-4 lg:gap-6`, page padding `px-4 sm:px-6 lg:px-8`.
- No fixed px widths that can exceed the viewport. Cap with `w-[min(90vw,400px)]`-style values. Use `object-fit: cover` on images whose container width changes.
- Forms: single column on phone; side-by-side fields use `flex-col sm:flex-row` or `grid-cols-1 sm:grid-cols-2`.
- Primary buttons full-width on phone: `w-full sm:w-auto`.

### Touch
- Minimum tap target 44×44px (Apple HIG) — buttons, play buttons, chips, icons, nav.
- Inputs: font-size ≥ 16px (prevents iOS auto-zoom on focus), min-height ~48px.
- Chips/pills: min-height 44px; wrap (`flex-wrap`) or horizontal-scroll (`overflow-x-auto`) — never overflow.
- Add `active:` states alongside `hover:` (hover does not fire on touch).

### Safe-area (notched devices)
- `viewport-fit=cover` is set in the root layout `viewport` export.
- Utilities in globals.css: `pb-safe`, `pt-safe`, `pl-safe`, `pr-safe`, `pb-safe-3` (additive).
- Fixed BOTTOM elements: add `pb-safe` / `pb-safe-3` so they clear the home indicator.
- Fixed TOP elements: add `pt-safe`, AND make content clearance ADDITIVE: `calc(<barHeight> + env(safe-area-inset-top, 0px))` — never a flat px guess.
- WARNING: Chrome devtools reports `env(safe-area-inset-*)` as 0. Safe-area bugs are INVISIBLE there. Test anything touching safe-area on a real iPhone or the iOS Simulator.

### Established shell behavior (don't re-solve)
- Dashboard sidebar: fixed at lg+, collapses to a hamburger drawer below lg; content full-width below lg.
- Wizard stepper: full at sm+, compact "Step X of N" + progress bar below sm.
- Reader: image-over-text stacked below lg (`flex-col-reverse lg:flex-row`) with scrollable text; 50/50 spread at lg+.
- Floating overlays/panels must NOT overlap content below lg — relocate into the bottom bar, a sheet, or a toggle.

### Media inputs
- Photo file inputs use `accept="image/*"` (offers camera + library on mobile). Do NOT add `capture` (forces camera-only).

### Definition of done for ANY UI change
- Verify at 360/390, 820, 1180, 1440: no horizontal scroll, all tap targets ≥44px, no element wider than the viewport, desktop visually unchanged.
- For anything with fixed top/bottom bars, overlays, or full-screen surfaces: confirm on a real device / iOS Simulator, not just devtools.

---

## 12. Critical Warnings

- **Never commit `.env.local`** — it's in `.gitignore`
- **Vercel maxDuration:** All API routes capped at 300s (hobby plan limit). With 3 pages at ~30s each, illustration generation takes ~90s. Cover + narration run in parallel.
- **Illustration generation is awaited:** The route waits for all pages before responding.
- **Photos table:** Must be populated BEFORE illustrations run, otherwise photoPresent=false and character won't match the photo.
- **styleKey in metadata:** Must be `style_key` (snake_case). The illustrations route reads from metadata, not from cover_options.
- **Cover is single:** Only ONE cover generated per book in the chosen style. No picker — auto-selected on creation.

---

## Commands

```bash
cd /Users/yossicohen/Projects/storymagic
npm run dev      # Start dev server (port 3000)
npm run build    # Production build with TypeScript check
npm run lint     # ESLint
```

If dev server hangs: `rm -rf .next && npm run dev`
