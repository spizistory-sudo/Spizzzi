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
            text: `You convert a children's book page into a MOTION prompt for an image-to-video AI model. The model receives a finished illustration and your prompt tells it HOW to animate that image.

RULES:
1. Describe MOTION only — what moves, how it moves, the direction and speed. NOT a description of the static scene (the model already sees it in the image).
2. Draw the motion from THIS page's story moment. What are the characters DOING? Reaching, walking, turning, laughing, handing something, looking up? Translate that action into gentle movement.
3. Keep motion subtle and looping-friendly — soft sway, gentle reach, slow turn, drifting particles. Children's book pace.
4. Do NOT describe things not visible in the illustration (off-page events, internal thoughts, dialogue).
5. Include environmental motion: leaves rustling, water rippling, light shifting, clouds drifting — whatever fits the scene.
6. End with this exact clause: "${artStyle} style, preserve original art style and colors exactly, no photorealism, no style change"
7. Maximum 35 words before the style clause.
8. Output ONLY the prompt, nothing else.

EXAMPLES:
Story: "Tani climbed the tallest oak tree, reaching for a golden star"
→ "Child reaches upward, fingers stretching toward glowing star, leaves flutter around, golden sparkles drift slowly down. ${artStyle} style, preserve original art style and colors exactly, no photorealism, no style change"

Story: "Inés hands Tani a piece of sweet bread; both smile"
→ "Girl extends arm offering bread, boy reaches to accept, both faces brighten with smiles, warm light glows softly around them. ${artStyle} style, preserve original art style and colors exactly, no photorealism, no style change"

Story text:
"${pageText}"`,
          }],
        }],
      });

      const text = result.text?.trim() || '';
      if (text.length < 10) throw new Error('Empty response');
      return text;
    }, { callName: 'animation-prompt', retries: 2 });

    console.log(`[animate] motion prompt: ${prompt.substring(0, 100)}...`);
    return prompt;
  } catch (err) {
    console.error('[animate] Prompt generation failed, using fallback:', err instanceof Error ? err.message : err);
    const artStyle = styleHint || 'illustrated children\'s book';
    return `Gentle character movement, soft environmental motion, warm light shifts slowly. ${artStyle} style, preserve original art style and colors exactly, no photorealism, no style change`;
  }
}
