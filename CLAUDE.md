@AGENTS.md

# Spizzzy (StoryMagic) — Master Reference

## 1. Project Overview

AI-powered personalized children's book platform. Parents pick a theme (or write a custom story concept), enter their child's name/age/traits, upload a photo, and the platform generates a complete illustrated storybook with AI-generated text, illustrations matching the child's appearance, voice narration, background music, and an interactive reader with page-flip animations.

**Current status:** Israeli Hebrew pilot (spizzzi.vercel.app). All UI is in Hebrew RTL. English generation still works at the API level but the UI is Hebrew-only.

**Brand:** "Spizzzy" (Latin letters, with y). Vercel URL: `spizzzi.vercel.app` (with i).

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.1 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS 4.2.2 + inline styles |
| State | Zustand (client wizard state, no persistence) |
| Database/Auth/Storage | Supabase (PostgreSQL + Auth + Storage + RLS) |
| Story generation | Google Gemini 2.5 Flash (JSON mode) |
| Photo analysis | Google Gemini 2.5 Flash Vision |
| Illustrations (prod) | Gemini 3 Pro Image Preview → Imagen 4 fallback |
| Illustrations (dev) | FLUX.2 Pro via fal.ai (~$0.03/image) |
| Animation | MiniMax Hailuo-02 via fal.ai → Kling v1.6 fallback |
| Narration (Hebrew) | ElevenLabs eleven_v3, Liam voice |
| Narration (English) | ElevenLabs eleven_multilingual_v2, user-selected voice |
| PDF export | @react-pdf/renderer |
| Deployment | Vercel (hobby plan, maxDuration=300) |
| Fonts | Heebo + Rubik (Hebrew-first, Google Fonts) |

---

## 2. Architecture

### Directory Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root: lang="he" dir="rtl", Heebo/Rubik fonts
│   ├── page.tsx                      # Landing page (Hebrew)
│   ├── (auth)/login|signup           # Auth pages (glassmorphism dark theme)
│   ├── auth/callback/route.ts        # OAuth callback
│   ├── (dashboard)/
│   │   ├── layout.tsx                # Sidebar layout (Hebrew labels, RTL)
│   │   ├── library/page.tsx          # Book library (server, force-dynamic)
│   │   └── create/
│   │       ├── page.tsx              # Choose: theme or custom
│   │       ├── theme/                # Step 1: Theme picker (10 themes, Hebrew names)
│   │       ├── custom/               # Alt Step 1: Free text / guided / educational
│   │       ├── details/              # Step 2: Name, age, traits+interests with follow-ups
│   │       ├── photos/               # Step 3: Photo upload + labels
│   │       ├── preview/              # Step 4: Story gen + cover style selection
│   │       └── finalize/             # Step 5: Voice + music + building screen
│   ├── (admin)/admin/                # Admin panel
│   ├── reader/[bookId]/              # Book reader (server → client)
│   ├── share/[slug]/                 # Public share page
│   └── api/
│       ├── generate-story/           # Gemini story generation
│       ├── generate-cover/           # 3 cover style options
│       ├── generate-illustrations/   # Per-page illustration (awaited, not fire-and-forget)
│       ├── generate-narration/       # ElevenLabs TTS per page
│       ├── animate-book/             # fal.ai video submission (MiniMax → Kling fallback)
│       ├── animate-page/status/      # Poll fal.ai queue + download + reupload to Supabase
│       ├── analyze-photo/            # Gemini Vision character description (with retry)
│       ├── preview-voice/            # ElevenLabs quick preview
│       ├── book-status/              # Polling endpoint for generation progress
│       ├── export-pdf/               # PDF generation
│       ├── generate-educational-concept/ # Educational tab concept generation
│       └── books/[bookId]/           # Delete, share toggle, edit pages, mark-prompted
├── components/
│   ├── reader/
│   │   ├── BookReader.tsx            # Main reader: spreads, page-flip, edit mode, animation
│   │   ├── ReaderPanel.tsx           # Right-side control panel (edit/animate/share/settings)
│   │   ├── ReaderControls.tsx        # Bottom bar (prev/next/auto/play) — dir="ltr"
│   │   ├── ReaderSettings.tsx        # Music/voice settings panel
│   │   ├── AudioController.tsx       # Narration + music hook
│   │   ├── CoverImage.tsx            # Shared cover with title overlay
│   │   ├── AnimatePromptModal.tsx    # "להחיות את הספר?" modal
│   │   └── AnimationProgress.tsx     # Progress pill with 5-min timeout + retry
│   ├── share/ShareModal.tsx          # Share + PDF modal (solid dark bg, Hebrew)
│   ├── library/BookCard.tsx          # Library card (Hebrew status badges)
│   ├── create/EducationalTab.tsx     # Educational concept generator
│   ├── wizard/WizardProgress.tsx     # 5-step indicator (Hebrew labels)
│   └── ui/
│       ├── NightSkyBackground.tsx    # Fixed dark gradient + fireflies
│       ├── MagicReaderBackground.tsx # Reader-specific dark purple + stars
│       └── VideoBackground.tsx       # 7-video crossfade (Supabase Storage URLs)
├── lib/
│   ├── supabase/ (client.ts, server.ts, middleware.ts, storage.ts)
│   ├── ai/
│   │   ├── gemini.ts                 # Client singleton
│   │   ├── fal-client.ts            # FLUX.2 Pro wrapper
│   │   ├── story-generator.ts       # Story gen (mock in dev, Gemini in prod)
│   │   ├── illustration-generator.ts # Gemini 3 Pro / Imagen 4 / FLUX.2
│   │   ├── photo-analyzer.ts        # Gemini Vision with 503 retry
│   │   ├── video-generator.ts       # Dead code (Seedance stub)
│   │   ├── rate-limit.ts            # Exponential backoff wrapper
│   │   └── prompts/ (story-system.ts, story-themes.ts, style-references.ts, motion-prompts.ts)
│   ├── elevenlabs/ (client.ts, voices.ts)
│   ├── music/tracks.ts              # 6 tracks with Hebrew names
│   ├── dev/ (config.ts, mock-data.ts)
│   ├── animation-prompts.ts          # Gemini → MiniMax motion prompt
│   └── utils/ (validators.ts, share.ts)
├── stores/creation-wizard.ts         # Zustand store
├── types/ (book.ts, ai.ts, theme.ts)
└── middleware.ts                     # Supabase session refresh
```

### Data Flow: User Input → Final Book

1. **Theme selection** → `selectedThemeSlug` stored in Zustand
2. **Child details** → name, age, traits (with interest follow-ups), language='he' hardcoded
3. **Photo upload** → Supabase Storage → `/api/analyze-photo` → Gemini Vision → character description
4. **Story generation** → `/api/generate-story` → Gemini 2.5 Flash → JSON with pages + illustration prompts
5. **Cover generation** → `/api/generate-cover` → 3 styles via Gemini 3 Pro → user picks one
6. **Finalize** → user selects voice + music → "Create My Book" triggers:
   - `/api/generate-illustrations` (awaited, sequential with 1s delay)
   - `/api/generate-narration` (fire-and-forget, parallel with illustrations)
7. **Building screen** → polls `/api/book-status` every 3s until all illustrations + narrations complete
8. **Reader** → loads book + pages from Supabase, renders spread layout with audio
9. **Animation** (optional) → `/api/animate-book` submits to fal.ai → polls via `/api/animate-page/status`

---

## 3. Database Schema (Supabase)

### Tables

**profiles** — extends `auth.users`
- `id` UUID PK (FK → auth.users), `display_name`, `avatar_url`
- `subscription_tier` (free|basic|premium), `monthly_credits`, `credits_used_this_month`
- `stripe_customer_id`, `created_at`, `updated_at`

**books** — core entity
- `id` UUID PK, `user_id` FK, `theme_id` FK (nullable)
- `title`, `child_name`, `child_age`, `child_traits[]`, `creation_mode` (template|custom), `custom_prompt`
- `cover_style`, `status` (draft|generating|review|complete|error)
- `is_public`, `share_slug` (unique), `metadata` JSONB (stores: language, themeSlug, narrator_voice_id, narrator_voice_name, selected_music_id, character_description, animation_prompted, animation_status, story_template_id, child_profile, main_theme, key_message, categoryId, topicId, dynamicKnobs, ageRules, validationIssues)
- `created_at`, `updated_at`

**pages**
- `id` UUID PK, `book_id` FK, `page_number`, `text_content`, `illustration_prompt`
- `illustration_url`, `illustration_status` (pending|generating|complete|error)
- `video_url` (format: `fal:minimax:{requestId}` or `fal:kling:{requestId}`), `video_status` (none|generating|complete|error)
- `narration_url`, `narration_duration_ms`, `mood`

**cover_options** — 3 per book
- `id`, `book_id` FK, `style_name` (watercolor|cartoon|storybook), `image_url`, `is_selected`

**photos** — uploaded child/parent/sibling/pet photos
- `id`, `book_id` FK, `user_id` FK, `storage_path`, `label`

### RLS Policies
- Users can only CRUD their own books, pages, photos, covers
- Public books/pages viewable by all via `is_public` flag
- Themes viewable by all

### Critical Query Rules
- **NEVER** use `.single()` for queries that might return 0 rows — it throws. Use `.limit(1)` + `data?.[0]`.

---

## 4. External Integrations

### Anthropic (Claude)
- **Client:** `@anthropic-ai/sdk` → `src/lib/anthropic/client.ts` (lazy singleton)
- **English story generation:** `claude-opus-4-7` — structured story generation via `src/lib/ai/story-generation-en.ts`
- **English curation:** `claude-haiku-4-5` — story recommendations via `src/lib/ai/curation-en.ts`
- **Hebrew story generation:** `claude-sonnet-4-5-20250929` — structured Hebrew stories via `src/lib/ai/story-generator.ts`
- **Auth:** `ANTHROPIC_API_KEY` env var
- **Cost:** ~$0.10/story (Opus), ~$0.005/curation (Haiku)

### Google Gemini
- **Client:** `@google/genai` → `src/lib/ai/gemini.ts`
- **Legacy story gen (English themes):** `gemini-2.5-flash`, JSON mode, temp=0.9, maxOutputTokens=8192
- **Photo analysis:** `gemini-2.5-flash` with vision, retry on 503/429 (3 attempts, exponential backoff)
- **Illustrations:** `gemini-3-pro-image-preview` (primary), `imagen-4.0-generate-001` (fallback)
- **Animation prompts:** `gemini-2.5-flash` for motion prompt generation
- **Auth:** `GEMINI_API_KEY` env var

### ElevenLabs
- **Client:** `@elevenlabs/elevenlabs-js` → `src/lib/elevenlabs/client.ts`
- **Hebrew:** Model `eleven_v3`, voice Liam (`TX3LPaxmHKxFdv7VOQHJ`), stability=0.80, style=0.30
- **English:** Model `eleven_multilingual_v2`, user-selected voice, stability=0.50, style=0.50
- **Hebrew text preprocessing:** strips emoji, adds sentence pauses
- **Voice validation skipped for Hebrew** (Liam ID not in app voice list)
- **Auth:** `ELEVENLABS_API_KEY` env var
- **5 voices:** Rachel, Drew, Bella, Antoni, Emily

### fal.ai (Animation)
- **Client:** `@fal-ai/client` with queue-based async
- **Primary:** `fal-ai/minimax/hailuo-02/standard/image-to-video` (duration='6', resolution='768P', prompt_optimizer=true)
- **Fallback:** `fal-ai/kling-video/v1.6/standard/image-to-video` (duration='5')
- **Submission-time fallback:** if MiniMax submit throws, retry with Kling
- **Model stored in DB:** `video_url = fal:minimax:{requestId}` or `fal:kling:{requestId}`
- **Status route parses model from video_url** to call correct fal.queue.status/result
- **5-minute client + server timeout** on animation polling
- **Auth:** `FAL_KEY` env var
- **Dev FLUX.2 Pro:** Also via fal.ai, `fal-ai/flux-pro` for cheap illustration dev

### Supabase
- **Auth:** Email/password + Google OAuth
- **Storage buckets:** `photos`, `covers`, `illustrations`, `audio`, `videos`
- **Server client:** uses `SUPABASE_SERVICE_ROLE_KEY` for storage uploads
- **Client:** uses `NEXT_PUBLIC_SUPABASE_*` for browser queries

---

## 5. All LLM Prompts

### Story Generation
- **File:** `src/lib/ai/prompts/story-system.ts`
- **English system prompt:** `STORY_SYSTEM_PROMPT` — rules for age-appropriate writing, arc structure, no violence
- **Hebrew system prompt:** `STORY_SYSTEM_PROMPT_HE` — colloquial Israeli Hebrew, speech patterns (בא לו, יאללה, סבבה), present-tense storytelling
- **User prompt:** Built in `src/lib/ai/story-generator.ts` — includes languageInstruction, child details, theme template or custom prompt
- **Output:** JSON with `title`, `pages[{page_number, text, illustration_prompt, mood}]`
- **Hebrew title rule:** "The book title must be entirely in Hebrew — no English words at all"
- **Illustration prompt rule:** Each page's `illustration_prompt` must re-describe every character's full visual appearance

### Illustration Generation
- **File:** `src/lib/ai/illustration-generator.ts`
- **Cover prompt:** Character-first (MAIN CHARACTER section), then scene, then art style, then rules
- **Page prompt:** Same structure, with CHARACTER CONSISTENCY RULES and TECHNICAL RULES sections
- **Critical rules in prompt:** character appears EXACTLY ONCE, all faces must be complete/friendly, no book frames, fill entire canvas
- **Reference images:** Child photo + cover image passed as `inlineData` parts to Gemini

### Photo Analysis
- **File:** `src/lib/ai/photo-analyzer.ts`
- **Prompt:** Extremely detailed visual description — hair, eyes, skin tone, face shape, clothing, expression
- **Output:** Single paragraph character description usable by image generators

### Animation Motion Prompts
- **File:** `src/lib/animation-prompts.ts`
- **Prompt:** Children's book animation director, max 40 words, one camera command in brackets
- **Camera commands:** `[Push in]`, `[Pull back]`, `[Pan left/right]`, `[Tilt up/down]`, `[Zoom in/out]`, `[Orbit left/right]`
- **Suffix:** Always ends with "watercolor illustration style, soft dreamy colors, no photorealism, preserve original art style"

### English Structured Story Generation (Claude Opus)
- **File:** `src/lib/ai/story-generation-en.ts`
- **System prompt:** `STORY_SYSTEM_PROMPT_EN` — master writer's voice inspired by Mo Willems, Kevin Henkes, Kate DiCamillo
- **User prompt:** Built from child profile + story template (required beats, things to avoid) + age rules
- **Output:** JSON with `title`, `spreads[{spread_number, text, illustration_prompt}]`, `metadata{word_count_total, spread_count, main_theme, key_message}`
- **Validation:** Checks spread count vs age rules, non-empty text/prompts, child name presence, forbidden clichés

### English Story Curation (Claude Haiku)
- **File:** `src/lib/ai/curation-en.ts`
- **System prompt:** `CURATION_SYSTEM_PROMPT` — children's librarian persona that scores all 72 stories 0-100 for fit
- **Scoring factors:** Age fit (heaviest), trait resonance, interest alignment, gender fit, emotional appropriateness
- **Output:** `CurationResult` with `top_picks` (top 8), `by_category` (grouped with fit labels), `all_stories_ranked`
- **Fallback:** Deterministic rule-based scorer if Haiku call fails

### Educational Concept
- **File:** `src/app/api/generate-educational-concept/route.ts`
- **Purpose:** Transform real-world topics into age-appropriate story concepts with metaphors

### English Structured Story System

The English flow uses a curation-driven catalog with 72 story templates:

- **Catalog:** `src/lib/ai/prompts/en/story-catalog.ts` — 72 stories across 7 categories (Big Adventures, Animal Friends, All My Feelings, I Can Do It!, Family & Friends, Wonders of the World, Cozy & Calm)
- **Personality traits:** `src/lib/personality-traits-en.ts` — 17 traits with `prompt_instruction` (tells Claude HOW to express each trait)
- **Interests:** `src/lib/interests-en.ts` — 24 interests in 5 groups (animals, world, creative, imagination, activity)
- **Age rules:** `src/lib/ai/prompts/en/age-rules.ts` — 4 buckets (3-5, 6-7, 8-9, 10-12) with spread counts, word counts, vocabulary, complexity
- **Curation:** `src/lib/ai/curation-en.ts` — Haiku-driven recommendations with deterministic fallback
- **Generation:** `src/lib/ai/story-generation-en.ts` — Opus-driven story creation with validation
- **API routes:** `/api/curate-stories` (Haiku curation), `/api/generate-story` with `storyId` trigger (Opus generation)

**Wizard flow:** Details (name + age + gender + traits + interests) → Recommendations (top 8 + see all 72) → Photos → Preview → Finalize → Reader

**Books created through this flow** have `creation_mode = 'custom'` and `metadata.story_template_id` pointing to the catalog entry. Distinguished from legacy custom books by the presence of `story_template_id` in metadata.

---

## 6. DEV_MODE Configuration

| Flag | Env Var | Default | Effect |
|---|---|---|---|
| `isDevMode()` | `DEV_MODE=true` | off | Mock story (skips Gemini), silent narration, skip animation |
| `isDevNarration()` | `DEV_NARRATION=true` | off | Use real ElevenLabs even when DEV_MODE=true |
| `isDevPhotoAnalysis()` | `DEV_PHOTO_ANALYSIS=true` | off | Use real Gemini Vision even when DEV_MODE=true |
| `isDevIllustrations()` | `DEV_ILLUSTRATIONS=true` | off | Use FLUX.2 Pro ($0.03/img) instead of Gemini 3 Pro |
| `getTestPageCount()` | `TEST_PAGE_COUNT=3` | null | Override page count |

**Current Vercel config:** `DEV_MODE=true`, `DEV_NARRATION=true`, `TEST_PAGE_COUNT=3`, `DEV_ILLUSTRATIONS` not set.

This means: 3-page mock stories, real ElevenLabs narration, real Gemini 3 Pro illustrations, real photo analysis skipped (mock description).

---

## 7. Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL         # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY    # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY        # Supabase service role (server-side storage)
GEMINI_API_KEY                   # Google Gemini API key
ELEVENLABS_API_KEY               # ElevenLabs TTS API key
FAL_KEY                          # fal.ai API key (FLUX + MiniMax + Kling)
NEXT_PUBLIC_APP_URL              # Production URL (https://spizzzi.vercel.app)
DEV_MODE                         # true = mock story + skip animation
DEV_NARRATION                    # true = real ElevenLabs in dev mode
DEV_PHOTO_ANALYSIS               # true = real Gemini Vision in dev mode
DEV_ILLUSTRATIONS                # true = FLUX.2 Pro instead of Gemini 3 Pro
TEST_PAGE_COUNT                  # Override page count (e.g., 3)
```

---

## 8. Known Issues and Resolutions

| Issue | Root Cause | Fix | File |
|---|---|---|---|
| Supabase `.single()` throwing on 0 rows | `.single()` throws when no rows returned | Use `.limit(1)` + `data?.[0]` everywhere | Multiple files |
| React Strict Mode double book creation | `useEffect` ran twice, created 2 books | `useRef` guard (`storyGenRef`) on every API-calling effect | `preview/page.tsx` |
| Cover image not loading | `.single()` + double book creation | `.limit(1)` + fallback to any cover | `BookReader.tsx`, server page |
| Book-inside-a-book illustrations | AI rendering book pages/binding in illustrations | "Do NOT draw a book" in all illustration prompts | `illustration-generator.ts` |
| Hydration mismatch in MagicReaderBackground | `<style jsx>` className hash mismatch | `dangerouslySetInnerHTML` for keyframes + `mounted` guard | `MagicReaderBackground.tsx` |
| Animation stuck on "Animating..." | Model string mismatch between submit/status/result | Exact model string matching + stale detection | `animate-book/route.ts`, `animate-page/status/route.ts` |
| Audio autoplay blocked | Browser blocks autoplay without user gesture | `audioUnlocked` state, only feed URLs after "Start Reading" click | `BookReader.tsx` |
| Empty src attribute errors | Setting `audio.src = ''` triggers error | `isValidUrl()` guard before setting src | `AudioController.tsx` |
| iCloud sync causing Turbopack hang | Desktop is iCloud-synced, file provider interferes | Moved project to `~/Projects/storymagic` (non-iCloud) | Project location |
| PostCSS config causing Turbopack deadlock | Turbopack's PostCSS worker times out on iCloud | Removed PostCSS config; Turbopack handles `@import "tailwindcss"` natively, BUT PostCSS config IS needed for proper Tailwind utility generation | `postcss.config.mjs` |
| Gemini 503 on photo analysis | Server overloaded | 3-attempt retry with exponential backoff, graceful fallback | `photo-analyzer.ts`, `analyze-photo/route.ts` |
| MiniMax 504 timeout | fal.ai queue congestion | Kling fallback + 5-minute client/server timeout | `animate-book/route.ts`, `AnimationProgress.tsx` |
| Illustrations awaited vs fire-and-forget | Vercel kills serverless function after response | Changed to `await generateAllIllustrations()` | `generate-illustrations/route.ts` |

---

## 9. Code Conventions

- **File naming:** kebab-case for files, PascalCase for components
- **Imports:** `@/` alias for `src/`, group by: external → internal → types
- **Components:** `'use client'` directive on all interactive components; server components for data fetching
- **Error handling:** try/catch with `console.error('[module]', err)` logging pattern
- **Logging:** `[module-name]` prefix on all console logs (e.g., `[narration]`, `[illustration-generator]`)
- **Supabase queries:** `.limit(1)` not `.single()`, always check `data?.[0]`
- **React effects:** `useRef` guard on any effect that triggers API calls
- **Audio:** Never set `src = ''`, always validate URLs first
- **RTL:** `<html dir="rtl" lang="he">`, inputs with email/URLs get `dir="ltr"`, reader controls get `dir="ltr"` wrapper
- **Brand:** "Spizzzy" (with y) in UI, `spizzzi.vercel.app` (with i) in URLs

---

## 10. Critical Business Logic

### Book Status Flow
`draft` → `generating` (illustrations started) → `review` (if any errors) → `complete`

### Illustration Status per Page
`pending` → `generating` → `complete` | `error`

### Animation Status per Page
`none` → `generating` (with `video_url = fal:{model}:{requestId}`) → `complete` (with Supabase Storage URL) | `error`

### Animation Status per Book
Not set → `generating` (when `/api/animate-book` called) → `complete` (when all pages done)

### Narration Generation
- Finalize page fires narration + illustrations in parallel
- Language detected from: request body first, then `book.metadata.language`, fallback to 'en'
- Hebrew: auto-selects Liam voice, `eleven_v3` model, higher stability
- Voice validation skipped for Hebrew (Liam's ID not in app's voice list)

### Building Screen Polling
- Polls `/api/book-status` every 3 seconds
- Counts `illustrationsComplete` + `narrationsComplete`
- Total steps = `pageCount * 2`
- Transitions to "done" when both reach pageCount

---

## 11. UI / Design System

### Premium Night Sky Glassmorphism

**Background:** Dark gradient `#0A1128 → #1E5A70` with cloud blobs + 24 firefly particles

**Glass surfaces:**
- `rgba(255,255,255,0.06)` with `backdrop-filter: blur(12px) saturate(150%)`
- Border: `1px solid rgba(255,255,255,0.10)`
- Inner glow: `inset 0 0 20px rgba(255,255,255,0.04)`

**Design tokens (CSS variables):**
```css
--gold: #F5C842;        --gold-glow: rgba(245,200,66,0.30);
--cyan: #7EC8E3;        --cyan-glow: rgba(126,200,227,0.25);
--purple: #9B7DD4;      --purple-glow: rgba(155,125,212,0.25);
--text-primary: rgba(255,255,255,0.95);
--text-secondary: rgba(255,255,255,0.65);
--text-faint: rgba(255,255,255,0.35);
--font-display: 'Rubik', 'Heebo', system-ui, sans-serif;
--font-body: 'Heebo', 'Rubik', system-ui, sans-serif;
--radius-sm: 1rem; --radius-md: 1.5rem; --radius-lg: 2rem; --radius-pill: 9999px;
```

**Button classes:** `.btn-primary` (purple→cyan gradient), `.btn-secondary` (glass pill), `.btn-ghost`
**Selection:** `.selection-card`, `.is-selected` (gold border + glow)
**Input:** `.input-field` (glass input with focus cyan glow)
**Animations:** `fadeUp`, `gentleFloat`, `glowPulse`, `shimmer`, `spin`, `tooltipFadeIn`

### Reader Layout
- Two-page spread: left (text on cream `#faf8f4`) + right (illustration, full bleed)
- CSS 3D page-flip animation (700ms cubic-bezier)
- Right panel: vertical icon buttons (Edit/Animate/Share/Settings) with left-positioned tooltips
- Bottom bar: `dir="ltr"` wrapper for consistent prev/next/dots layout

---

## 12. Development Workflow

### Local Dev Setup
```bash
cd /Users/yossicohen/Projects/storymagic  # NOT Desktop (iCloud-synced)
npm run dev                                 # next dev --port 3000
```

### Important
- Project lives at `~/Projects/storymagic` — moved off Desktop to avoid iCloud sync interference
- Old copy at `~/Desktop/StoryMagic/storymagic` is stale — do NOT use it
- If dev server hangs on "Compiling", run `rm -rf .next && npm run dev`
- PostCSS config (`postcss.config.mjs`) is required for Tailwind utility generation

### Deployment
- Push to `main` branch → Vercel auto-deploys
- Git remote: `https://github.com/spizistory-sudo/Spizzzi.git`
- Git credentials: `spizistory-sudo` user (per-repo credential store)

### Build
```bash
npm run build   # TypeScript check + production build
npm run lint    # ESLint
```

---

## 13. Roadmap

### Near-term
- Stripe payment integration (Phase 5, stubbed)
- Character consistency improvements (reference image propagation)
- Mobile/iPad optimization
- Additional Hebrew voices when available
- Admin panel polish

### Decided NOT to build (for now)
- i18n library (next-intl) — hardcoded Hebrew is simpler for pilot
- Server-side state persistence — Zustand client-only is sufficient
- Custom domain — using Vercel subdomain for pilot
- Real-time collaboration — single-user flow only

---

## 14. Critical Warnings

- **API keys:** The fal.ai key was previously exposed in chat. Rotate if not already done.
- **Never commit `.env.local`** — it's in `.gitignore`
- **Vercel maxDuration:** All API routes capped at 300s (hobby plan limit)
- **Illustration generation is awaited:** The `/api/generate-illustrations` route waits for all pages before responding. With 3 pages at ~30s each, this is ~90s. With 10 pages, it could hit the 300s limit.
- **Double execution:** React Strict Mode in dev runs effects twice. All API-calling effects MUST have `useRef` guards.
- **Supabase `.single()`:** Will throw on 0 rows. Use `.limit(1)` always.
- **iCloud Desktop:** If the project is on Desktop, Turbopack will hang due to file provider interference. Work from `~/Projects/storymagic`.
- **PostCSS config:** Required for Tailwind CSS utility generation. Without it, only custom CSS works but no Tailwind classes like `flex`, `px-6`, etc.

---

## 15. Hebrew Pilot Specifics

### RTL Layout
- `<html lang="he" dir="rtl">` set in root layout
- Global CSS: `[dir="rtl"] input, textarea, select { direction: rtl; text-align: right; }`
- Explicit `dir="ltr"` on: email/password inputs, share URL field, reader bottom controls
- Sidebar appears on the right (natural RTL flex behavior)
- Active sidebar indicator uses `borderRight` (visual right = logical start in RTL)
- Sign-out icon mirrored with `scaleX(-1)`
- Toggle switches wrapped in `direction: ltr` container

### Hebrew Typography
- **Display font:** Rubik (Google Fonts, Hebrew subset)
- **Body font:** Heebo (Google Fonts, Hebrew subset)
- No Niqqud (vowel marks) — modern Israeli Hebrew doesn't use them in children's books
- `dir="auto"` on user-generated text (book titles, story text)

### Hebrew TTS
- **Voice:** Liam (`TX3LPaxmHKxFdv7VOQHJ`) — auto-selected, no user choice
- **Model:** `eleven_v3` (not multilingual_v2 which produces poor Hebrew)
- **Settings:** stability=0.80, similarityBoost=0.75, style=0.30, useSpeakerBoost=true
- **Text preprocessing:** `processText()` strips emoji, adds double-space after sentence-ending punctuation
- **Voice validation skipped:** Liam's ID not in the app's voice list, so `getVoiceById()` returns null — `isHebrewRequest` check bypasses this

### Hebrew Story Generation
- System prompt (`STORY_SYSTEM_PROMPT_HE`) enforces colloquial Israeli Hebrew
- Speech patterns required: בא לו, יאללה, סבבה, כיף, ממש, בדיוק
- Terms of endearment: מותק, נשמה, גיבור שלי
- Exclamations: וואו!, אחלה!, מדהים! (not נפלא מאוד!)
- Title must be pure Hebrew — no English words
- Illustration prompts stay in English (for image generators)

### Hebrew UI Copy
All UI strings are hardcoded Hebrew. Key translations:
- "Create New Book" → "ספר חדש"
- "My Library" → "הספרייה שלי"
- "Start Reading" → "מתחילים לקרוא"
- "The End" → "הסוף"
- Loading states: "רגע אחד...", "מציירים את הסיפור שלכם..."

### Personality Traits (Hebrew)
Two sections in the details page:
1. **תכונות אופי** (18 traits): חברותי, רגיש, שקט, מנהיג, טוב לב, אמיץ, רגוע, אנרגטי, עקשן, חולמני, סקרן, יצירתי, חכם, חוקר, שובב, אחראי, עצמאי, משתף פעולה
2. **תחומי עניין** (5 with conditional follow-up text inputs): אוהב חיות, אוהב מוזיקה, אוהב ספורט, אוהב יצירה ואומנות, אוהב לקרוא

Interest details are persisted in Zustand (`traitDetails`) and flow through to the Gemini prompt as enriched traits like "אוהב חיות (כלבים וחתולים)".

---

## Commands

```bash
cd /Users/yossicohen/Projects/storymagic
npm run dev      # Start dev server (port 3000)
npm run build    # Production build with TypeScript check
npm run lint     # ESLint
```

If dev server hangs: `rm -rf .next && npm run dev`
