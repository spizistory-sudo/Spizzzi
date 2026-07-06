import { task } from "@trigger.dev/sdk/v3";
import { runStage } from "@/lib/studio/stage-runner";

export const writeStory = task({
  id: "write-story",
  maxDuration: 600,
  run: async (payload: { bookId: string }) => {
    console.log(`[trigger:write-story] ========== TASK STARTED for ${payload.bookId} ==========`);
    console.log(`[trigger:write-story] Environment check: ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY ? 'set' : 'MISSING'}, SUPABASE_URL=${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'MISSING'}, SERVICE_KEY=${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING'}`);

    const book = await runStage({
      bookId: payload.bookId,
      fromStatus: 'idea_ready',
      activeStatus: 'writing',
      successStatus: 'checking',
      model: 'claude-opus-4-7',
      maxTokens: 12000,
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
        return JSON.stringify(brief, null, 2);
      },
    });

    console.log(`[trigger:write-story] ========== TASK COMPLETE: ${book.status} ==========`);
    return { success: true, bookId: payload.bookId, status: book.status };
  },
});
