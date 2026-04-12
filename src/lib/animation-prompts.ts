import { getGeminiClient } from './ai/gemini';

// MiniMax Hailuo camera commands: [Push in] [Pull back] [Pan left] [Pan right]
// [Tilt up] [Tilt down] [Zoom in] [Zoom out] [Truck left] [Truck right] [Orbit left] [Orbit right]

export async function generateAnimationPrompt(pageText: string): Promise<string> {
  try {
    const ai = getGeminiClient();

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [{
          text: `You are a children's book animation director. Given a page of story text, create a short video motion prompt for MiniMax Hailuo AI to animate a watercolor illustration.

RULES:
1. Describe what characters and objects are DOING in the scene — act out the story
2. Include ONE camera movement command in square brackets from: [Push in], [Pull back], [Pan left], [Pan right], [Tilt up], [Tilt down], [Zoom in], [Zoom out], [Orbit left]
3. Keep motion gentle and magical — this is a children's storybook
4. ALWAYS end with: "watercolor illustration style, soft dreamy colors, no photorealism, preserve original art style"
5. Maximum 40 words total
6. Output ONLY the prompt, nothing else

EXAMPLES:
Story: "Tani climbed the tallest oak tree, reaching for a golden star"
Output: "Child climbs upward through tree branches, arm reaching toward glowing star above, magical sparkles trail behind. [Tilt up] watercolor illustration style, soft dreamy colors, no photorealism, preserve original art style"

Story: "The dragon flew over the village breathing colorful rainbow fire"
Output: "Dragon soars over rooftops, rainbow fire streams from mouth, villagers wave below. [Pull back] watercolor illustration style, soft dreamy colors, no photorealism, preserve original art style"

Story: "Everyone cheered as Tani fixed the bridge, faces beaming with joy"
Output: "Crowd cheers with raised hands and beaming smiles, warm golden light washes over celebration scene. [Push in] watercolor illustration style, soft dreamy colors, no photorealism, preserve original art style"

Story text: "${pageText}"`,
        }],
      }],
    });

    const prompt = result.text?.trim() || '';
    if (prompt.length > 10) {
      console.log(`[animation-prompt] Generated: ${prompt.substring(0, 80)}...`);
      return prompt;
    }
    throw new Error('Empty response');
  } catch (err) {
    console.error('[animation-prompt] Gemini failed, using fallback:', err);
    return 'Gentle magical scene with soft character movement and environmental life. [Push in] watercolor illustration style, soft dreamy colors, no photorealism, preserve original art style';
  }
}
