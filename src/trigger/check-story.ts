import { task, tasks } from "@trigger.dev/sdk/v3";
import { runStage } from "@/lib/studio/stage-runner";
import { getBook, updateBookStatus } from "@/lib/studio/db";
import type { writeStory } from "./write-story";

const MAX_REVISIONS = 3;

export const checkStory = task({
  id: "check-story",
  maxDuration: 300,
  run: async (payload: { bookId: string }) => {
    console.log(`[trigger:check-story] ========== TASK STARTED for ${payload.bookId} ==========`);

    const book = await runStage({
      bookId: payload.bookId,
      fromStatus: 'checking',
      activeStatus: 'checking',
      successStatus: 'checking',
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 8192,
      resultField: 'checker_report',
      buildSystemPrompt: (knowledge) => `${knowledge}

You are the Checker for the Spizzzy Library. You grade every Writer draft against the bible's rubric (§10). You are independent from the Writer — your job is quality control.

Grade the story using the rubric below. Return a single JSON object.

## Hard Gates (each must pass — any failure bounces the book back)

1. **Length** — 400–750 words for 4–6 band. Count the words in all page texts combined.
2. **Form** — clean prose, or (if rhymed) strict meter check; never mixed prose/rhyme.
3. **Value shown, not stated** — no moral tag anywhere, including titles. No line that explains the lesson.
4. **One problem, resolved by the protagonist's own action** — not rescued by an adult or luck.
5. **Read-aloud** — no sentence over ~15 words that doesn't flow; no tongue-twisters; no stacked adverbs or clause pile-ups; dialogue speakable as written. Cite any stumble line.
6. **Age & safety** — vocabulary and themes fit the band; warm/hopeful landing; nothing frightening unresolved; inclusive; protagonist age follows read-up rule (protagonist ~6–7 for 4–6 band).
7. **Coherence** — names/details consistent; ending resolves the opening; 12–16 spreads; every spread has text + illustration note.
8. **Character sheet completeness** — locked signature features (2–3) and palette present and specific. No vague sheets ("a girl with brown hair").
9. **Concrete language** — sensory and specific, not abstract.

## Scored Dimensions (0–5 each)

1. **Emotional arc** — is the change real and earned?
2. **Humor & delight** — does it earn a laugh or a gasp? Would a child say "again!"?
3. **Read-aloud music** — rhythm and cadence beyond mere correctness.
4. **Character appeal** — likable, small, resourceful, drives the resolution.
5. **Specificity & freshness** — its own book, not a generic template.
6. **Page turns & pacing** — do spread endings pull? Does the middle escalate?
7. **Dual-audience layer** — rewards the adult; re-read value.
8. **Illustration partnership** — text leaves real room; visual beats are strong and varied.

## Threshold

All hard gates pass AND average score ≥ 3.5 AND no single score below 3.

## Output Format

Return ONLY this JSON object:

{
  "hard_gates": [
    { "gate": "Length", "pass": true, "note": "612 words, within 400–750 range" },
    ...for all 9 gates
  ],
  "scores": [
    { "dimension": "Emotional arc", "score": 4, "note": "..." },
    ...for all 8 dimensions
  ],
  "all_gates_pass": true,
  "average_score": 3.8,
  "min_score": 3,
  "verdict": "pass" or "revise",
  "revision_guidance": "Only if verdict=revise. Specific, actionable notes for the Writer: what exactly to fix and why. Reference specific spreads/lines. Do NOT rewrite — guide.",
  "summary": "2–3 sentence overall assessment."
}

Be rigorous but fair. A good-enough book that meets threshold passes. Only fail what genuinely fails. When you fail a gate or score low, cite the specific problem with spread numbers or quoted text.`,
      buildUserMessage: (book) => {
        return JSON.stringify(book.story, null, 2);
      },
    });

    const updatedBook = await getBook(payload.bookId);
    if (!updatedBook) throw new Error('Book not found after check');

    const report = updatedBook.checker_report as {
      verdict?: string;
      revision_guidance?: string;
    } | null;

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
