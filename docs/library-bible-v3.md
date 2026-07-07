# Spizzzy Writing Bible v3 — The Library (Ages 2–8)

*The operational reference the Writer and Checker run on. v3 adds the fully-specified 6–8
early chapter book band — its spec AND its own Checker rubric — and makes rubric selection
band-aware. Supersedes v2.*

**What changed in v3 (read this):** The Checker must select the rubric that matches the
book's `age_band`. There is no longer one rubric for all books. Grading a 6–8 chapter book
against the 4–6 picture-book gates is a spec error, not a book failure. The 6–8 band is now
fully specified below (§12 spec + §12R rubric) and is LIVE.

---

## 0. Scope — the three Spizzzy bands

Spizzzy makes illustrated, narratable storybooks for ages 2–8. Three formats, one pipeline:

| Band | Format | Form | Length | Status |
|---|---|---|---|---|
| **2–4** | Board / rhyme book | Read-aloud, rhyme-forward | ~50–400 words | Skeleton (§11) |
| **4–6** | Picture book | Read-aloud prose, 12–16 spreads | 400–750 words | **Live — fully specified** |
| **6–8** | Early chapter book | Independent reading, short illustrated chapters | ~2,500–10,000 words | **Live — fully specified (v3)** |

Middle grade (8–12) is out of scope by decision. Comics/graphic-novel is a possible future track.

**Rubric selection (critical):** the Checker reads the book's `age_band` and applies THAT
band's rubric only — 4–6 → §10R, 6–8 → §12R, 2–4 → §11R (when live). It never applies one
band's gates to another band's book. If a book's band has only a skeleton spec, the Checker
does not hard-fail it on format; it escalates to human review with a note.

**A rule that spans all bands — kids read up:** the protagonist's age sits at or slightly
above the top of the band (4–6 → ~6–7; 6–8 → ~8–9).

---

## 1. The house promise — what a Spizzzy book is

A Spizzzy book delivers a value through a story so good the child never notices being taught —
and funny or delightful enough that they ask for it again.

Six non-negotiables (all bands):

- **The value is the soul, never the lesson.** It lives in what the character wants, fears,
  and chooses — never in a stated moral. If a line explains the lesson, cut it. (Note: a
  value stated in the *protagonist's own hard-won voice*, earned across the story, is not a
  moral tag — it's character. Marco's "score the game, not the person" in his own notebook is
  earned insight, not authorial preaching.)
- **It must sound good read aloud** — even independent-reader books get narrated.
- **Laugh AND feel.** The two things parents most want. Humor is a first-class ingredient.
- **A small, resourceful character with a real problem**, resolved through their own action.
- **Every word earns its place.**
- **It rewards the hundredth reading** — for the child and the adult.

---

## 2. The 4–6 picture book — band spec

*(unchanged from v2)*

| Element | Spec |
|---|---|
| Reader | Pre-independent; adult reads aloud |
| Protagonist age | ~6–7 |
| Form | Prose (default); rhyme only if virtuoso, never mixed |
| Length | 400–750 words (sweet spot ~600) |
| Architecture | 12–16 spreads, one illustration + ~1–3 sentences each |
| Arc | One problem, one emotional arc, resolved by the protagonist |
| Ending | Warm and earned |

Rhyme belongs in 2–4 and pure-delight romps only; for value-carrying 4–6 books, default to prose.

---

## 3–7. Shared craft (all bands)

Character rules (human protagonist by default; small and resourceful; real age-true problem;
child drives resolution), the five-beat story spine (ordinary world → wobble → try & struggle →
turn → landing), voice do/don't (concrete nouns, active verbs, sensory language, humor, no
moral tags, no business-memo sentences), title craft (intriguing not descriptive; never name
the value; 3 options per draft), and the values & themes map all carry over from v2 unchanged
and apply across bands, scaled to the reader. The page turn is the unit of suspense in picture
books; the chapter ending is its equivalent in chapter books.

---

## 8–9. Brief & Writer output

*(as v2, with band-appropriate `pages` shape)* — for 2–4 and 4–6, `pages` is 12–16 spreads of
`{n, text, illustration_note, page_turn?}`; for 6–8, `pages` is chapters of
`{n, title, text, illustration_note, chapter_end_pull}`. The brief's `series` field is
standalone by default for picture books and a named series for 6–8.

---

## 10R. The 4–6 Checker rubric

*(unchanged from v2 — the picture-book rubric: length 400–750, 12–16 spreads, one image per
spread, prose/meter gate, value-shown, single problem resolved by protagonist, read-aloud,
age & safety, coherence, character-sheet completeness, concrete language; scored on emotional
arc, humor, read-aloud music, character appeal, specificity, page turns, dual-audience,
illustration partnership; threshold: all gates pass, avg ≥ 3.5, no score < 3.)*

---

## 11. Skeleton — the 2–4 board/rhyme book *(spec before launch)*

Rhyme-forward; ~50–400 words; one feeling → tiny journey → comfort; heavy repetition and a
finishable refrain; fully rhymed or not at all with an absolute meter gate; safe soothed
landing. **11R rubric:** to be written before the 2–4 band goes live. Until then, the Checker
escalates 2–4 books to human review rather than grading them.

---

## 12. The 6–8 early chapter book — band spec *(LIVE, v3)*

**Series-first: the band's defining strategy.** Nearly all books for newly independent readers
are series — children want to work through a set, collect what they love, and reunite with
characters they know. Spizzzy 6–8 books are designed as series from book one: a recurring cast,
a home world, an episodic problem-per-book structure. Book one must open a world and a cast
that can plausibly return.

| Element | Spec |
|---|---|
| Reader | Newly independent; reads it themselves (and it may also be narrated) |
| Protagonist age | ~8–9 (read-up rule) |
| Form | Prose, in chapters |
| Length | **2,500–10,000 words** |
| Structure | **4–10 short chapters** (~400–1,200 words each); each chapter ends on a pull |
| Illustration | **One strong anchor illustration per chapter** (at the chapter's peak visual/emotional beat) + optional small spot art. NOT one image per screen |
| Voice | Voice-forward; strong narrative personality; humor-forward |
| Plot | One clear single plot, no subplots; three-tries escalation works well |
| Reading | Vocabulary calibrated for the child's own eyes, not only a parent's read-aloud |
| Themes | Friendship, school, being yourself, achieving goals, mystery, adventure |
| Ending | Warm, earned; a closing hook toward the next book in the series |

**How text becomes pages:** chapters are NOT pre-divided into screens. The reader (display
layer) flows each chapter's prose into comfortable screens automatically and reflows to the
device; the writer controls chapters, not screen breaks. The one anchor illustration per
chapter is placed at its marked beat and the text flows around it.

**The illustration beat:** the writer nominates, per chapter, the single strongest visual
moment for that chapter's anchor image (in `illustration_note`), carrying the locked character
sheet so all chapters stay consistent.

---

## 12R. The 6–8 Checker rubric *(LIVE, v3)*

Apply this rubric — not §10R — to any book with `age_band: 6–8`.

**Hard gates (⛔ — must pass):**
- **Length** — 2,500–10,000 words.
- **Chapter structure** — 4–10 chapters; each chapter has a title, text, and a chapter-end
  pull; no chapter is wildly out of proportion.
- **Form** — clean prose (chapter books are not rhymed).
- **Value shown, not stated** — no authorial moral tag. (Protagonist's own earned insight in
  their voice is allowed and encouraged.)
- **One problem, resolved by the protagonist's own action** — adults may guide; the turn and
  the resolving action are the child's.
- **Read-aloud** — flows when spoken; no clunky/breath-breaking lines (concrete test as in
  §10R, applied per chapter sample).
- **Age & safety** — independent-reader vocabulary; themes age-appropriate; warm/hopeful
  landing; nothing frightening left unresolved; inclusive; protagonist follows read-up rule.
- **Series-opener integrity** — book one establishes a cast and world that can recur, and ends
  with a hook or open door toward more (not a hard cliffhanger, a warm "there's more").
- **Coherence** — names/facts consistent across all chapters; ending resolves the opening;
  every chapter has an illustration note (one anchor beat each).
- **Character sheet completeness** — locked signature features + palette for every recurring
  character (this matters more here — characters must stay consistent across a whole series).
- **Concrete language** — sensory and specific.

**Scored (0–5 each):**
- **Emotional arc** — real, earned change across the chapters.
- **Humor & delight** — genuinely funny; would a child ask for the next book?
- **Read-aloud music** — voice and rhythm.
- **Character appeal** — likable, specific, drives the resolution; a cast worth returning to.
- **Specificity & freshness** — its own world, not a template.
- **Chapter-end pulls & pacing** — do chapters end on a hook? Does the middle escalate?
- **Dual-audience layer** — rewards the adult; re-read value.
- **Illustration partnership** — does each chapter offer a strong, distinct anchor beat?

**Threshold:** all hard gates pass, average ≥ 3.5, no single score below 3. (Same bar as
4–6; the gates differ, the quality bar does not.)

---

## 13. Deliberately deferred

- Full 2–4 spec and rubric (§11 skeleton) — before that band goes live.
- Series/world design step for 6–8 — a light version runs inline for now; a full design step
  (cast bible, world, recurring format) before scaling the band.
- Hebrew — a fork once English works end to end.
- Comics/graphic-novel track — future.
- Final threshold numbers — calibrated on the first real batch per band.
