# Responsive Audit — 2026-06-07

## Summary
- **Viewport meta:** Not explicitly set in layout.tsx — Next.js provides a default (`width=device-width, initial-scale=1`) but no `viewport-fit=cover` for notched devices.
- **Tailwind breakpoints:** Default Tailwind 4 (`sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px`). No custom breakpoints.
- **Global container/padding:** No shared container wrapper. Each page manages its own `max-w-*` and padding.
- **100vh usage:** None found — avoids the mobile Safari pitfall.
- **Safe-area handling:** None. No `env(safe-area-inset-*)` anywhere in the codebase.

### Highest-risk surfaces (ranked)
1. **Dashboard sidebar** — 240px fixed, never hidden on mobile. On a 360px phone, content area is only 120px wide.
2. **Book reader** — two-panel 50/50 layout with fixed 3rem padding. Text unreadable on phone. No stacking for portrait.
3. **Wizard stepper** — 6 steps × (36px circle + 32-56px connector) ≈ 550-650px minimum. Labels hidden below sm: but circles + connectors still overflow below ~400px.
4. **Finalize voice/music picker** — tap targets at 32-36px, hover-only selection feedback.
5. **Landing page header** — 180px spacer + logo + buttons may overflow on narrow phones.

---

## Per-screen findings

### Landing page (`src/app/page.tsx`)
- **Fixed dimensions:** `w-[180px]` left spacer (line 43), `height: 280` feature cards (line 128), `height: 220` category cards (line 230)
- **Grids:** `grid-cols-1 md:grid-cols-3` feature cards (good), `repeat(4, 1fr)` desktop categories (hidden on mobile, horizontal scroll replaces — good)
- **Hover-only:** Feature cards + category cards use `hover:scale-[1.02] hover:brightness-110` — visual-only, cards still clickable on touch (OK)
- **Tap targets:** All buttons ≥ 44px (OK)
- **Overflow risks:** Header 3-zone layout (`w-[180px]` spacer + centered logo + buttons) may overflow on 360px screens
- **Verdict:** Needs minor work (header spacer, fixed card heights)

### Dashboard sidebar (`src/app/(dashboard)/layout.tsx`)
- **Fixed dimensions:** `width: 240` sidebar, `flexShrink: 0` — NEVER hidden on mobile
- **Grids:** Sidebar is a fixed-width flex column, main content fills remainder
- **Hover-only:** Sign-out button hover effect only
- **Tap targets:** Nav items have adequate padding (~48px height each)
- **Overflow risks:** CRITICAL — on 360px phone, sidebar takes 240px leaving only 120px for content
- **Verdict:** Needs significant work — sidebar must collapse/hide below md:

### Create chooser (`src/app/(dashboard)/create/page.tsx`)
- **Fixed dimensions:** `minHeight: 280` cards
- **Grids:** `grid-cols-1 sm:grid-cols-2` (good)
- **Hover-only:** `onMouseEnter`/`onMouseLeave` for scale + border — no touch fallback, but cards are still clickable
- **Verdict:** OK at all sizes (if sidebar is fixed)

### Style picker (`src/app/(dashboard)/create/style/page.tsx`)
- **Fixed dimensions:** None significant — uses aspect-ratio
- **Grids:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` (good responsive chain)
- **Hover-only:** `onMouseEnter`/`onMouseLeave` for scale + borderColor — visual-only
- **Verdict:** OK at all sizes

### Details (`src/app/(dashboard)/create/details/page.tsx`)
- **Fixed dimensions:** `minWidth: 44` age pills (good touch target)
- **Grids:** Flex-wrap for pills (responsive naturally)
- **Hover-only:** Input focus/blur styling (keyboard-accessible, OK)
- **Verdict:** OK at all sizes

### Categories (`src/app/(dashboard)/create/categories/page.tsx`)
- **Fixed dimensions:** `minHeight: 140` category cards, `padding: 24px`
- **Grids:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` (good)
- **Hover-only:** `onMouseEnter`/`onMouseLeave` for scale + border — visual-only
- **Verdict:** OK at all sizes

### Stories (`src/app/(dashboard)/create/stories/page.tsx`)
- **Fixed dimensions:** `padding: 24px` cards
- **Grids:** `grid-cols-1 sm:grid-cols-2` (good)
- **Hover-only:** Card hover effects — visual-only
- **Tap targets:** Cards are large enough (OK)
- **Verdict:** OK at all sizes

### Finalize (`src/app/(dashboard)/create/finalize/page.tsx`)
- **Fixed dimensions:** Voice avatar `36×36px` (below 44px), play button `32×32px` (below 44px), building UI `w-[280px] md:w-[360px]`
- **Grids:** Voice `sm:grid-cols-2 lg:grid-cols-3`, music same (good)
- **Hover-only:** Voice/music card `onMouseEnter`/`onMouseLeave` for border — visual-only
- **Tap targets:** Voice play button 32×32 (below 44px minimum), voice avatar 36×36 (below 44px)
- **Overflow risks:** Music category pills with `overflowX: auto` and `whiteSpace: nowrap` — may cause horizontal scroll indicator
- **Verdict:** Needs minor work (tap targets, building UI width)

### Library (`src/app/(dashboard)/library/page.tsx`)
- **Grids:** `grid sm:grid-cols-2 lg:grid-cols-3` (good)
- **Verdict:** OK at all sizes (sidebar issue aside)

### Login/Signup (`src/app/(auth)/login/page.tsx`, `signup/page.tsx`)
- **Fixed dimensions:** `max-w-md` (good constraint), glass container with fixed padding
- **Verdict:** OK at all sizes

### Wizard stepper (`src/components/wizard/WizardProgress.tsx`)
- **Structure:** 6 steps, each: circle (`w-9 h-9` = 36px) + connector (`w-8 md:w-14` = 32-56px) + label (hidden below sm:)
- **Minimum width:** 6 circles × 36px + 5 connectors × 32px = 376px minimum (circles + connectors only)
- **Labels:** `hidden sm:inline` — text labels disappear below 640px (good)
- **Overflow risk:** At 376px minimum, fits on 390px iPhone barely. At 360px it's tight but doesn't overflow because connectors are flex items
- **Verdict:** Needs minor work (connectors could shrink further below 400px)

---

## Reader deep-dive

### Container chain
```
BookReader (flex-1 flex-col)
  → Book area (flex-1 flex-col items-center justify-center px-4 md:px-[5vw] py-14)
    → Book shell (relative overflow-hidden max-w-[1200px] max-h-[75vh])
      → renderSpread(view)
        → Spread root (width:100% height:100% display:flex)
          → Left panel: text (width:50% height:100% position:relative overflow:hidden)
            → Title bar (absolute top:2rem)
            → Scroll area (absolute top:4rem bottom:3rem left:3rem right:3rem overflowY:auto)
              → <p> story text (fontSize:20px lineHeight:1.8)
            → Page number (absolute bottom:1.5rem)
          → Right panel: illustration (width:50% height:100%)
            → <img> (object-cover)
```

### Panel sizing
- Two-panel side-by-side: `width: 50%` each, hardcoded in inline styles
- **No stacking for portrait/phone.** On a 360px phone, each panel is 180px wide. Text at 20px with 3rem (48px) padding on each side = 180 - 96 = 84px text area. Approximately 4 characters per line — completely unreadable.
- The text panel needs to stack ABOVE the illustration on narrow screens, not sit beside it.

### Page-turn mechanism
- **Touch:** `onTouchStart`/`onTouchEnd` with 50px swipe threshold — works on mobile
- **Click:** Previous/next buttons in ReaderControls at the bottom
- **No click zones** on the spread itself (only swipe)
- 3D CSS page-flip animation (`transform: rotateY`, `perspective: 2000px`)

### Narration controls
- `ReaderControls.tsx` — fixed bottom bar (`fixed bottom-0 left-0 right-0 z-50`)
- Contains: back button, prev, progress dots, next, play/pause, auto-play
- Progress dots: `w-2 h-2` (8×8px) — too small for touch, but tapping them isn't the primary interaction
- Prev/next buttons: `px-3 py-2` (~36×32px) — borderline small for touch

### Fixed heights
- Book shell: `max-h-[75vh]` — responsive viewport unit (good)
- No fixed pixel heights on the reader container

### iOS considerations
- No `100vh` — uses `75vh` for book shell and flex-1 for the wrapper (good)
- No `env(safe-area-inset-*)` — bottom controls may be obscured by iPhone home indicator
- No `viewport-fit=cover` in viewport meta

### Reader panel (right side tools)
- `ReaderPanel.tsx` — positioned `fixed` at `right: 20px`, `top: 50%`
- Panel buttons: `minWidth: 52px` with `padding: 10px 14px`
- On narrow screens, panel overlaps the book content
- No responsive hiding or repositioning

---

## Cross-cutting issues

### Hover-only patterns
26 instances of `onMouseEnter`/`onMouseLeave` across the app. All are VISUAL FEEDBACK only (scale, border color, opacity changes) — the underlying click/tap handler works regardless. Low severity for function, medium for polish (touch users get no visual feedback on press).

### 100vh usage
None found. The app avoids this pitfall entirely.

### Safe-area handling
Zero usage of `env(safe-area-inset-*)`. Impact:
- Reader bottom controls may overlap iPhone home indicator
- Reader right panel may overlap notch on landscape
- No content cut-off expected on standard phones

### Stepper below 700px
Labels hidden below 640px (`hidden sm:inline`). Circles (36px each) + connectors (32px each) = ~376px minimum. Fits on 390px iPhone with ~14px to spare. At 360px it's borderline — may need smaller circles or hidden connectors.

---

## Recommended fix order

1. **Sidebar collapse** — highest impact. Hide sidebar below md: (768px), add a hamburger menu. Everything downstream benefits.
2. **Reader stacking** — make text panel stack above illustration on phones (below md:). Critical for readability.
3. **Reader bottom safe-area** — add `pb-[env(safe-area-inset-bottom)]` to bottom controls for iPhone.
4. **Tap target sizing** — increase voice play button (32→44px), voice avatar (36→44px), reader nav buttons.
5. **Reader panel repositioning** — move from fixed-right to bottom bar or collapsible on phones.
6. **Stepper shrink** — reduce circle size and hide connectors below ~400px.
7. **Landing header** — replace 3-zone spacer layout with simpler flex on mobile.
8. **Touch feedback** — add `:active` styles alongside hover effects for press feedback on touch devices.
9. **Viewport meta** — add `viewport-fit=cover` for notched device support.
