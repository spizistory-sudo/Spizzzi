import { getGeminiClient } from './gemini';
import { getAnthropicClient } from '@/lib/anthropic/client';
import { isDevMode, isDevPhotoAnalysis } from '@/lib/dev/config';
import { MOCK_CHARACTER_DESCRIPTION } from '@/lib/dev/mock-data';

const PHOTO_ANALYSIS_PROMPT = `Analyze this photo of a child and provide an extremely detailed visual description that an AI image generator can use to consistently recreate this character across multiple illustrated scenes.

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
"A 5-year-old girl with long curly dark brown hair that falls past her shoulders with side-swept bangs. She has large round brown eyes with thick eyelashes, a small button nose, full rosy cheeks with light freckles across the bridge of her nose, and a wide dimpled smile. She has warm light olive skin. She is petite for her age. She wears a bright yellow sundress with small white polka dots and white sandals."`;

async function analyzeWithGemini(photoBase64: string, maxRetries = 3): Promise<string> {
  const ai = getGeminiClient();
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'image/jpeg', data: photoBase64 } },
              { text: PHOTO_ANALYSIS_PROMPT },
            ],
          },
        ],
      });

      const text = response.text;
      if (!text) throw new Error('Failed to analyze photo — empty response');
      console.log('[photo-analyzer] Gemini description:', text.substring(0, 150));
      return text;
    } catch (err: unknown) {
      lastError = err;
      const status = (err as { status?: number; statusCode?: number })?.status ||
                     (err as { status?: number; statusCode?: number })?.statusCode;

      if ((status === 500 || status === 503 || status === 429) && attempt < maxRetries) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        console.log(`[photo-analyzer] Gemini attempt ${attempt} failed with ${status}, retrying in ${delayMs}ms`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}

async function analyzeWithClaude(photoBase64: string): Promise<string> {
  console.log('[photo-analyzer] Calling Claude Haiku 4.5 vision for photo analysis');
  const anthropic = getAnthropicClient();

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: photoBase64 },
          },
          { type: 'text', text: PHOTO_ANALYSIS_PROMPT },
        ],
      },
    ],
  });

  const textBlocks = response.content.filter((block) => block.type === 'text');
  const text = textBlocks
    .map((block) => 'text' in block ? block.text : '')
    .join('\n')
    .trim();

  if (!text) throw new Error('Claude Haiku returned empty response');
  console.log('[photo-analyzer] Claude Haiku description:', text.substring(0, 150));
  return text;
}

export async function analyzeChildPhoto(photoBase64: string): Promise<string> {
  if (isDevMode() && !isDevPhotoAnalysis()) {
    console.log('[DEV_MODE] Returning mock character description');
    return MOCK_CHARACTER_DESCRIPTION;
  }

  try {
    return await analyzeWithGemini(photoBase64);
  } catch (geminiErr) {
    console.warn('[photo-analyzer] Gemini failed after retries, falling back to Claude Haiku:', geminiErr instanceof Error ? geminiErr.message : geminiErr);
    try {
      return await analyzeWithClaude(photoBase64);
    } catch (claudeErr) {
      console.error('[photo-analyzer] Claude Haiku fallback also failed:', claudeErr instanceof Error ? `${claudeErr.message}\n${claudeErr.stack}` : claudeErr);
      throw claudeErr;
    }
  }
}
