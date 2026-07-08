import { task, tasks } from "@trigger.dev/sdk/v3";
import { runStage } from "@/lib/studio/stage-runner";
import { getBook, updateBookStatus } from "@/lib/studio/db";
import type { writeStory } from "./write-story";

const MAX_REVISIONS = 3;

const SKELETON_BANDS = new Set<string>();

function buildRubricPrompt(ageBand: string): string {
  if (ageBand === '6-8') return RUBRIC_6_8;
  if (ageBand === '4-6') return RUBRIC_4_6;
  if (ageBand === '2-4') return RUBRIC_2_4;
  return '';
}

const RUBRIC_2_4 = `
## Rubric: §11R — 2–4 Board/Rhyme Book

**Hard Gates (⛔ — must pass):**
1. **Length** — ~50–350 words; very few words per spread (10–16 spreads).
2. **Form integrity** — fully rhymed OR clean repetitive prose; never mixed, never half-rhymed.
3. **METER & RHYME GATE (strictest gate)** — if rhymed: every rhyme is a true rhyme (matching final stressed sounds, not near-rhyme); meter is consistent across the whole book (scan every line — stress pattern must hold); no line padded or inverted to force a rhyme; reads aloud with an unbroken bounce. A single forced rhyme or metrical stumble fails this gate. When uncertain, fail and flag for human ear.
4. **Refrain / repetition** — there is a repeated, finishable line or pattern the child can join.
5. **Value/feeling shown, not stated** — no moral tag; at this age the "value" is usually a feeling or comfort, carried by the moment, not explained.
6. **Age & safety** — tiny vocabulary; concrete nameable things; nothing frightening; landing is safe and soothed.
7. **Coherence** — the moment/routine holds together start to finish; 10–16 spreads; each spread has text + illustration note.
8. **Character sheet completeness** — locked features + palette.
9. **Concrete language** — nameable, sensory, physical; no abstraction.

**Scored Dimensions (0–5 each):**
1. **Read-aloud music (weighted highest)** — bounce, rhythm, joy in the mouth. This is the whole game for 2–4.
2. **Comfort / warmth** — does the landing soothe? Is it a good bedtime book?
3. **Participation** — does the refrain invite the child to join and finish lines?
4. **Delight** — a giggle, a surprise, a sound to make together.
5. **Specificity & freshness** — its own book, not a generic template.
6. **Dual-audience layer** — does the adult enjoy the hundredth reading?
7. **Illustration partnership** — clear, warm, single-focus images a toddler can read.

**Threshold:** all hard gates pass (the meter gate especially), average ≥ 3.5, no single score below 3.

**Human-ear note:** 2–4 is the band where the Checker is least reliable — grading meter and true rhyme by model is genuinely hard. Treat a 2–4 "ready" as provisionally ready; the human review step should always read it aloud before approving. When uncertain about meter, escalate rather than pass.`;

const RUBRIC_4_6 = `
## Rubric: §10R — 4–6 Picture Book

**Hard Gates (⛔ — must pass):**
1. **Length** — 400–750 words. Count the words in all page texts combined.
2. **Form** — clean prose, or (if rhymed) strict meter check; never mixed prose/rhyme.
3. **Value shown, not stated** — no moral tag anywhere, including titles. No line that explains the lesson.
4. **One problem, resolved by the protagonist's own action** — not rescued by an adult or luck.
5. **Read-aloud** — no sentence that can't be spoken comfortably in one breath (~15 words ceiling, longer only if it flows); no tongue-twisters; no stacked adverbs or clause pile-ups; dialogue speakable as written. Cite any stumble line.
6. **Age & safety** — vocabulary and themes fit 4–6; warm/hopeful landing; nothing frightening unresolved; inclusive; protagonist age follows read-up rule (~6–7).
7. **Coherence** — names/details consistent; ending resolves the opening; 12–16 spreads; every spread has text + illustration note.
8. **Character sheet completeness** — locked signature features (2–3) and palette present and specific. No vague sheets.
9. **Concrete language** — sensory and specific, not abstract.

**Scored Dimensions (0–5 each):**
1. **Emotional arc** — is the change real and earned?
2. **Humor & delight** — does it earn a laugh or a gasp? Would a child say "again!"?
3. **Read-aloud music** — rhythm and cadence beyond mere correctness.
4. **Character appeal** — likable, small, resourceful, drives the resolution.
5. **Specificity & freshness** — its own book, not a generic template.
6. **Page turns & pacing** — do spread endings pull? Does the middle escalate?
7. **Dual-audience layer** — rewards the adult; re-read value.
8. **Illustration partnership** — text leaves real room; visual beats are strong and varied.

**Threshold:** all hard gates pass, average ≥ 3.5, no single score below 3.`;

const RUBRIC_6_8 = `
## Rubric: §12R — 6–8 Early Chapter Book

**Hard Gates (⛔ — must pass):**
1. **Length** — 2,500–10,000 words.
2. **Chapter structure** — 4–10 chapters; each chapter has a title, text, and a chapter-end pull; no chapter is wildly out of proportion.
3. **Form** — clean prose (chapter books are not rhymed).
4. **Value shown, not stated** — no authorial moral tag. A value stated in the protagonist's own hard-won voice, earned across the story, is allowed and encouraged — that is character, not preaching.
5. **One problem, resolved by the protagonist's own action** — adults may guide; the turn and resolving action are the child's.
6. **Read-aloud** — flows when spoken; no clunky or breath-breaking lines. Apply the concrete test per chapter sample.
7. **Age & safety** — independent-reader vocabulary; themes age-appropriate; warm/hopeful landing; nothing frightening left unresolved; inclusive; protagonist follows read-up rule (~8–9).
8. **Series-opener integrity** — book one establishes a cast and world that can recur, and ends with a hook or open door toward more (not a hard cliffhanger, a warm "there's more").
9. **Coherence** — names/facts consistent across all chapters; ending resolves the opening; every chapter has an illustration note (one anchor beat each).
10. **Character sheet completeness** — locked signature features + palette for every recurring character. This matters more here — characters must stay consistent across a whole series.
11. **Concrete language** — sensory and specific.

**Scored Dimensions (0–5 each):**
1. **Emotional arc** — real, earned change across the chapters.
2. **Humor & delight** — genuinely funny; would a child ask for the next book?
3. **Read-aloud music** — voice and rhythm.
4. **Character appeal** — likable, specific, drives the resolution; a cast worth returning to.
5. **Specificity & freshness** — its own world, not a template.
6. **Chapter-end pulls & pacing** — do chapters end on a hook? Does the middle escalate?
7. **Dual-audience layer** — rewards the adult; re-read value.
8. **Illustration partnership** — does each chapter offer a strong, distinct anchor beat?

**Threshold:** all hard gates pass, average ≥ 3.5, no single score below 3.`;

export const checkStory = task({
  id: "check-story",
  maxDuration: 300,
  run: async (payload: { bookId: string }) => {
    console.log(`[trigger:check-story] ========== TASK STARTED for ${payload.bookId} ==========`);

    const preBook = await getBook(payload.bookId);
    if (!preBook) throw new Error(`Book ${payload.bookId} not found`);

    const ageBand = (preBook.story as { metadata?: { age_band?: string } })?.metadata?.age_band
      || (preBook.brief as { age_band?: string })?.age_band
      || preBook.spark.age_band;

    console.log(`[trigger:check-story] Detected age_band: '${ageBand}'`);

    if (SKELETON_BANDS.has(ageBand)) {
      console.log(`[trigger:check-story] Band '${ageBand}' has skeleton spec only — escalating to human review`);
      await updateBookStatus(payload.bookId, 'ready', {
        checker_report: {
          rubric_applied: `${ageBand} (skeleton — no rubric yet)`,
          verdict: 'escalated',
          escalated_to_human: true,
          summary: `Band ${ageBand} has only a skeleton spec (no live rubric). Escalated to human review without grading.`,
          hard_gates: [],
          scores: [],
        },
      });
      return { success: true, bookId: payload.bookId, verdict: 'escalated', ageBand };
    }

    const rubricPrompt = buildRubricPrompt(ageBand);

    const book = await runStage({
      bookId: payload.bookId,
      fromStatus: 'checking',
      activeStatus: 'checking',
      successStatus: 'checking',
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 8192,
      resultField: 'checker_report',
      buildSystemPrompt: (knowledge) => `${knowledge}

You are the Checker for the Spizzzy Library. You grade every Writer draft against the bible's rubric. You are independent from the Writer — your job is quality control.

CRITICAL: This book's age_band is **${ageBand}**. You MUST apply ONLY the ${ageBand} rubric below. Do NOT apply another band's gates (e.g. do not apply 4–6 spread counts to a 6–8 chapter book, or 6–8 word counts to a 4–6 picture book).

${rubricPrompt}

## Output Format

Return ONLY this JSON object:

{
  "rubric_applied": "${ageBand === '2-4' ? '§11R (2–4 board/rhyme book)' : ageBand === '4-6' ? '§10R (4–6 picture book)' : '§12R (6–8 chapter book)'}",
  "hard_gates": [
    { "gate": "Length", "pass": true, "note": "..." },
    ...for ALL gates in the rubric above
  ],
  "scores": [
    { "dimension": "Emotional arc", "score": 4, "note": "..." },
    ...for ALL scored dimensions
  ],
  "all_gates_pass": true,
  "average_score": 3.8,
  "min_score": 3,
  "verdict": "pass" or "revise",
  "revision_guidance": "Only if verdict=revise. Specific, actionable notes for the Writer: what exactly to fix and why. Reference specific spreads/chapters/lines. Do NOT rewrite — guide.",
  "summary": "2–3 sentence overall assessment."
}

Be rigorous but fair. A good-enough book that meets threshold passes. Only fail what genuinely fails. When you fail a gate or score low, cite the specific problem with spread/chapter numbers or quoted text.`,
      buildUserMessage: (book) => {
        return JSON.stringify(book.story, null, 2);
      },
    });

    const updatedBook = await getBook(payload.bookId);
    if (!updatedBook) throw new Error('Book not found after check');

    const report = updatedBook.checker_report as {
      verdict?: string;
      revision_guidance?: string;
      rubric_applied?: string;
    } | null;

    console.log(`[trigger:check-story] Rubric applied: ${report?.rubric_applied || 'unknown'}`);

    if (!report?.verdict) {
      console.error(`[trigger:check-story] No verdict in checker report`);
      await updateBookStatus(payload.bookId, 'failed', { last_error: 'Checker produced no verdict' });
      return { success: false, bookId: payload.bookId };
    }

    if (report.verdict === 'pass') {
      console.log(`[trigger:check-story] PASSED — advancing to 'ready'`);
      await updateBookStatus(payload.bookId, 'ready');
      return { success: true, bookId: payload.bookId, verdict: 'pass' };
    }

    // verdict = 'revise'
    if (updatedBook.revision_count >= MAX_REVISIONS) {
      console.log(`[trigger:check-story] REVISE but revision_count=${updatedBook.revision_count} >= ${MAX_REVISIONS} — escalating to human review`);
      await updateBookStatus(payload.bookId, 'ready');
      return { success: true, bookId: payload.bookId, verdict: 'revise', escalated: true };
    }

    console.log(`[trigger:check-story] REVISE — bouncing back to writer (revision ${updatedBook.revision_count + 1}/${MAX_REVISIONS})`);
    await updateBookStatus(payload.bookId, 'needs_revision', {
      revision_count: updatedBook.revision_count + 1,
    });

    const handle = await tasks.trigger<typeof writeStory>('write-story', { bookId: payload.bookId });
    console.log(`[trigger:check-story] Auto-enqueued write-story revision, run: ${handle.id}`);

    return { success: true, bookId: payload.bookId, verdict: 'revise', revisionRun: handle.id };
  },
});
