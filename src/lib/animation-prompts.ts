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
            text: `You convert a children's book page into a CINEMATIC MOTION prompt for a 10-second image-to-video AI model. The model receives a finished illustration and your prompt directs HOW to animate it as a living scene — a moment unfolding ONE WAY, never returning to its starting pose.

CORE PRINCIPLE: This is a SCENE, not a loop. Every movement progresses FORWARD through the clip. Nothing resets, cycles, or returns to start. The end of the clip is a different moment from the beginning — like a single breath of a Pixar or Ghibli film.

RULES:
1. Describe MOTION only — what moves, how, direction and speed. NOT a description of the static scene (the model already sees it).
2. Layer 3–4 SIMULTANEOUS motion channels that all progress forward together:
   • PRIMARY ACTION — the character's main movement drawn from the story moment (reaching, stepping, turning, offering). One continuous forward arc.
   • SECONDARY BODY MOTION — weight shifts, head tilts, a blink, breathing deepens, hair lifts, clothing drapes with the movement. These give the character life.
   • ENVIRONMENTAL MOTION — leaves tumble past, water ripples outward, dust motes travel through a light beam, petals carry on a breeze. Each element moves in its own direction, never circling back.
   • ATMOSPHERIC DEPTH — background light slowly warms or shifts, distant elements drift at a different pace than foreground ones, giving gentle depth and parallax feel to the scene.
3. Every layer moves FORWARD — avoid words like "return", "reset", "loop", "cycle", "sway back", "settle back". Motion can slow, ease, or arrive at a new position — but never reverse to its origin.
4. Keep the pace unhurried and child-appropriate — cinematic means GENTLE DEPTH, film-like presence, a living storybook moment. NOT fast action, dramatic camera moves, cuts, or abrupt changes.
5. Do NOT describe things not visible in the illustration (off-page events, internal thoughts, dialogue).
6. Do NOT request camera cuts, scene changes, or large camera moves — the model animates within one still frame. Subtle push or drift is fine.
7. End with this exact clause: "${artStyle} style, preserve original art style and colors exactly, no photorealism, no style change"
8. Maximum 80 words before the style clause.
9. Output ONLY the prompt, nothing else.

EXAMPLES:
Story: "Tani climbed the tallest oak tree, reaching for a golden star"
→ "Child pulls upward through branches, one hand stretching higher toward the glowing star, fingers opening wide, hair lifting in rising breeze, shirt rippling with the effort, golden sparkles drift slowly downward past the child's face, leaves release from branches and tumble away into deepening twilight, background sky subtly warms from blue to amber behind the star. ${artStyle} style, preserve original art style and colors exactly, no photorealism, no style change"

Story: "Inés hands Tani a piece of sweet bread; both smile"
→ "Girl extends her arm forward offering bread, weight shifting onto front foot, boy leans in reaching with both hands, their expressions gradually opening into warm smiles, soft golden light blooms outward from between their hands, a gentle breeze carries loose petals across the foreground, background foliage drifts at a slower pace adding gentle depth to the warm scene. ${artStyle} style, preserve original art style and colors exactly, no photorealism, no style change"

Story text:
"${pageText}"`,
          }],
        }],
      });

      const text = result.text?.trim() || '';
      if (text.length < 10) throw new Error('Empty response');
      return text;
    }, { callName: 'animation-prompt', retries: 2 });

    console.log(`[animate] motion prompt (${prompt.length} chars): ${prompt}`);
    return prompt;
  } catch (err) {
    console.error('[animate] Prompt generation failed, using fallback:', err instanceof Error ? err.message : err);
    const artStyle = styleHint || 'illustrated children\'s book';
    return `Character moves forward into action, weight shifting, hair and clothing responding, surrounding leaves drift past, light gradually warms across the scene adding gentle depth, a living storybook moment unfolding. ${artStyle} style, preserve original art style and colors exactly, no photorealism, no style change`;
  }
}
