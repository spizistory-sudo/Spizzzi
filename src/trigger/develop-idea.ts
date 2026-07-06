import { task } from "@trigger.dev/sdk/v3";
import { runStage } from "@/lib/studio/stage-runner";

export const developIdea = task({
  id: "develop-idea",
  maxDuration: 300,
  run: async (payload: { bookId: string }) => {
    console.log(`[trigger:develop-idea] ========== TASK STARTED for ${payload.bookId} ==========`);
    console.log(`[trigger:develop-idea] Environment check: ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY ? 'set' : 'MISSING'}, SUPABASE_URL=${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'MISSING'}, SERVICE_KEY=${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING'}`);

    const book = await runStage({
      bookId: payload.bookId,
      fromStatus: 'spark',
      activeStatus: 'developing_idea',
      successStatus: 'idea_ready',
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 4000,
      resultField: 'brief',
      buildSystemPrompt: (knowledge) => `${knowledge}

You are the Idea Developer for the Spizzzy Library. Take the founder's spark and develop it into ONE strong, specific story brief that follows the bible. Sharpen the premise, find the fresh angle, define the protagonist (human by default, age per the read-up rule), the age-true problem, the emotional arc, and where the humor lives. Do NOT write the story.

Return a single JSON object with exactly these fields:
{
  "working_title": "string",
  "age_band": "2-4" | "4-6" | "6-8",
  "category": "string (one of the six categories)",
  "value_primary": "string",
  "value_secondary": "string or null",
  "protagonist": { "name": "string", "age": number, "traits": "string" },
  "problem": "string — the real, age-true wobble",
  "setting": "string",
  "logline": "string — one sentence capturing the whole book",
  "form": "prose" | "rhyme",
  "tone": "string (e.g. romp, warm, comfort, balanced)",
  "humor_angle": "string — where the laughs live",
  "arc_summary": "string — the emotional arc in 2-3 sentences",
  "fresh_angle": "string — what makes this book different from the obvious version",
  "notes": "string or null — constraints or suggestions for the Writer"
}

Return ONLY the JSON object. No prose, no code fences.`,
      buildUserMessage: (book) => JSON.stringify(book.spark, null, 2),
    });

    console.log(`[trigger:develop-idea] ========== TASK COMPLETE: ${book.status} ==========`);
    return { success: true, bookId: payload.bookId, status: book.status };
  },
});
