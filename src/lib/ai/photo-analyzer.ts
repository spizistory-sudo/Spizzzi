import { getGeminiClient } from './gemini';
import { isDevMode, isDevPhotoAnalysis } from '@/lib/dev/config';
import { MOCK_CHARACTER_DESCRIPTION } from '@/lib/dev/mock-data';

export async function analyzeChildPhoto(photoBase64: string): Promise<string> {
  if (isDevMode() && !isDevPhotoAnalysis()) {
    console.log('[DEV_MODE] Returning mock character description');
    return MOCK_CHARACTER_DESCRIPTION;
  }

  const ai = getGeminiClient();

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: photoBase64,
            },
          },
          {
            text: `Analyze this photo of a child and provide an extremely detailed visual description that an AI image generator can use to consistently recreate this character across multiple illustrated scenes.

Be VERY specific about:
- Exact age (approximate)
- Hair: color, length, style, texture (straight/curly/wavy), how it falls (bangs, parting, etc.)
- Eyes: color, size, shape
- Skin tone: be specific (e.g., "light olive", "warm brown", "fair with pink undertones")
- Face shape and features: nose shape, lip shape, cheek shape, any dimples or freckles
- Body type: height relative to age, build
- Clothing: exact colors, patterns, style of what they're wearing
- Expression: default expression, energy level

Format as a single detailed paragraph. Do NOT include the child's name. The description must be detailed enough that an AI can draw the EXACT same child every time. Example:
"A 5-year-old girl with long curly dark brown hair that falls past her shoulders with side-swept bangs. She has large round brown eyes with thick eyelashes, a small button nose, full rosy cheeks with light freckles across the bridge of her nose, and a wide dimpled smile. She has warm light olive skin. She is petite for her age. She wears a bright yellow sundress with small white polka dots and white sandals."`,
          },
        ],
      },
    ],
  });

  const text = response.text;
  if (!text) {
    throw new Error('Failed to analyze photo');
  }
  console.log('[photo-analyzer] Character description:', text.substring(0, 150));
  return text;
}
