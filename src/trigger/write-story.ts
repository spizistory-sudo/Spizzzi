import { task, tasks } from "@trigger.dev/sdk/v3";
import { runStage } from "@/lib/studio/stage-runner";
import type { checkStory } from "./check-story";

export const writeStory = task({
  id: "write-story",
  maxDuration: 600,
  run: async (payload: { bookId: string }) => {
    console.log(`[trigger:write-story] ========== TASK STARTED for ${payload.bookId} ==========`);
    console.log(`[trigger:write-story] Environment check: ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY ? 'set' : 'MISSING'}, SUPABASE_URL=${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'MISSING'}, SERVICE_KEY=${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING'}`);

    const book = await runStage({
      bookId: payload.bookId,
      fromStatus: ['idea_ready', 'needs_revision'],
      activeStatus: 'writing',
      successStatus: 'checking',
      model: 'claude-opus-4-7',
      maxTokens: 32000,
      useStreaming: true,
      resultField: 'story',
      buildSystemPrompt: (knowledge) => `${knowledge}

You are the Writer for the Spizzzy Library. Write the complete book from this brief, following the bible exactly for this age band: form, length, structure, voice, page turns, character sheet with LOCKED features and palette, illustration notes per spread/chapter. The value must be shown through the story, never stated — no moral tag anywhere, including titles.

Return a single JSON object with exactly this structure:

{
  "title_options": [
    { "title": "string", "recommended": boolean }
  ],
  "metadata": {
    "age_band": "string",
    "category": "string",
    "value_primary": "string",
    "value_secondary": "string or null",
    "logline": "string",
    "word_count": number,
    "form": "prose" | "rhyme",
    "tone": "string",
    "series": "standalone" | "series name + entry"
  },
  "character_sheet": [
    {
      "name": "string",
      "age": number,
      "description": "string — physical description",
      "locked_features": ["2-3 specific signature features that never change"],
      "palette": ["color1", "color2", "color3"]
    }
  ],
  "style_anchor": "string — one line locking art direction for the whole book",
  "pages": [
    {
      "n": number,
      "text": "string — the spread/chapter text",
      "illustration_note": "string — what the picture shows",
      "page_turn": "string or null — the pull into the next spread"
    }
  ],
  "cover_concept": "string — one line for the cover"
}

For age band 2-4 and 4-6: "pages" are spreads (12-16 entries), each with ~1-3 sentences.
For age band 6-8: "pages" are chapters (4-10 entries), each with the full chapter text, plus a "title" field per chapter.

Provide exactly 3 title_options, with one flagged as recommended: true.

Return ONLY the JSON object. No prose, no code fences, no explanations.`,
      buildUserMessage: (book) => {
        const brief = book.brief || {};
        const parts: string[] = [];

        parts.push('## Brief\n' + JSON.stringify(brief, null, 2));

        if (book.checker_report && book.revision_count > 0) {
          const report = book.checker_report as {
            revision_guidance?: string;
            hard_gates?: Array<{ gate: string; pass: boolean; note: string }>;
            scores?: Array<{ dimension: string; score: number; note: string }>;
          };
          parts.push(`\n## REVISION ${book.revision_count} — Checker Feedback\n`);
          if (report.revision_guidance) {
            parts.push(`Guidance: ${report.revision_guidance}`);
          }
          if (report.hard_gates) {
            const failed = report.hard_gates.filter(g => !g.pass);
            if (failed.length > 0) {
              parts.push(`\nFailed hard gates:\n${failed.map(g => `- ${g.gate}: ${g.note}`).join('\n')}`);
            }
          }
          if (report.scores) {
            const low = report.scores.filter(s => s.score < 3);
            if (low.length > 0) {
              parts.push(`\nLow scores:\n${low.map(s => `- ${s.dimension} (${s.score}/5): ${s.note}`).join('\n')}`);
            }
          }
          parts.push(`\n## Previous Draft\n${JSON.stringify(book.story, null, 2)}`);
          parts.push(`\nFix the issues above. Keep what works, improve what doesn't. Return the complete revised book JSON.`);
        }

        return parts.join('\n');
      },
    });

    // Auto-chain: enqueue checker
    if (book.status === 'checking') {
      console.log(`[trigger:write-story] Auto-chaining to check-story...`);
      const handle = await tasks.trigger<typeof checkStory>('check-story', { bookId: payload.bookId });
      console.log(`[trigger:write-story] Enqueued check-story, run: ${handle.id}`);
    }

    console.log(`[trigger:write-story] ========== TASK COMPLETE: ${book.status} ==========`);
    return { success: true, bookId: payload.bookId, status: book.status };
  },
});
