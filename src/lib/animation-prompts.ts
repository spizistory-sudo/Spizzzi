import { getGeminiClient } from './ai/gemini';
import { withGeminiRetry } from './ai/gemini-retry';

export async function generateAnimationPrompt(pageText: string, styleHint?: string): Promise<string> {
  try {
    const artStyle = styleHint || 'illustrated children\'s book';

    const prompt = await withGeminiRetry(async () => {
      const ai = getGeminiClient();
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{
          role: 'user',
          parts: [{
            text: `You convert a children's book page into a MOTION prompt for a 10-second image-to-video AI model. The model receives a finished illustration and your prompt tells it HOW to animate that image across the full 10 seconds.

RULES:
1. Describe MOTION only — what moves, how it moves, direction and speed. NOT a description of the static scene (the model already sees it).
2. Structure the motion as a DEVELOPING SEQUENCE with three gentle beats: an opening movement, a middle action that builds on it, and a soft settling or reaction. This is a 10-second clip, not a 2-second loop — give it a small arc.
3. Draw the motion from THIS page's story moment. What are the characters DOING? Translate their action into a gentle progression: the reach begins → fingers close around the object → character's expression softens. Or: wind picks up → leaves swirl higher → they drift back down.
4. Keep the pace gentle and child-appropriate — "developing" means a soft natural progression, NOT fast action, dramatic camera moves, or abrupt transitions. Think picture-book animation, not action film.
5. Do NOT describe things not visible in the illustration (off-page events, internal thoughts, dialogue).
6. Include environmental motion that develops alongside the character motion: breeze strengthens then calms, light shifts from cool to warm, particles gather then scatter.
7. End with this exact clause: "${artStyle} style, preserve original art style and colors exactly, no photorealism, no style change"
8. Maximum 60 words before the style clause.
9. Output ONLY the prompt, nothing else.

EXAMPLES:
Story: "Tani climbed the tallest oak tree, reaching for a golden star"
→ "Child begins climbing upward, arms stretching toward glowing star above, golden sparkles drift down around them, leaves flutter loose from branches, fingers reach closer as light intensifies, wind gently sways the treetop, sparkles settle softly on shoulders. ${artStyle} style, preserve original art style and colors exactly, no photorealism, no style change"

Story: "Inés hands Tani a piece of sweet bread; both smile"
→ "Girl lifts arm offering bread forward, boy leans in and reaches to accept, their faces gradually brighten into warm smiles, soft golden light grows around their hands, a gentle breeze stirs hair and nearby flowers sway then settle. ${artStyle} style, preserve original art style and colors exactly, no photorealism, no style change"

Story text:
"${pageText}"`,
          }],
        }],
      });

      const text = result.text?.trim() || '';
      if (text.length < 10) throw new Error('Empty response');
      return text;
    }, { callName: 'animation-prompt', retries: 2 });

    console.log(`[animate] motion prompt: ${prompt.substring(0, 120)}...`);
    return prompt;
  } catch (err) {
    console.error('[animate] Prompt generation failed, using fallback:', err instanceof Error ? err.message : err);
    const artStyle = styleHint || 'illustrated children\'s book';
    return `Character begins gentle movement, action develops gradually, expression softens, surrounding elements drift and settle into calm. ${artStyle} style, preserve original art style and colors exactly, no photorealism, no style change`;
  }
}
