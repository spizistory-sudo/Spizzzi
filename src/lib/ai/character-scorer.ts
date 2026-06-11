import { getGeminiClient } from './gemini';

export interface CharacterMatchResult {
  score: number;
  mismatches: string[];
}

export async function scoreCharacterMatch(
  imageBase64: string,
  referenceBase64: string,
  imageMimeType: string = 'image/png',
  referenceMimeType: string = 'image/png',
): Promise<CharacterMatchResult> {
  try {
    const ai = getGeminiClient();
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: referenceMimeType, data: referenceBase64 } },
          { inlineData: { mimeType: imageMimeType, data: imageBase64 } },
          { text: `Image 1 is a CHARACTER REFERENCE SHEET — the canonical appearance of a children's book protagonist.
Image 2 is an illustrated page from that book.

Score how well the character in Image 2 matches the reference in Image 1 on these traits:
- Skin tone (0-20)
- Hair color and style (0-20)
- Face shape and features (0-20)
- Eye color/shape (0-15)
- Body build and proportions (0-10)
- Clothing/outfit consistency (0-15)

Return ONLY valid JSON (no markdown, no backticks):
{"score": <total 0-100>, "mismatches": ["trait: brief description", ...]}

If all traits match well, return {"score": 90, "mismatches": []}.
Be strict but fair — art style variation is OK, identity drift is not.` },
        ],
      }],
    });

    const text = (res.text || '').trim().replace(/```json\n?|```\n?/g, '').trim();
    const parsed = JSON.parse(text) as CharacterMatchResult;
    parsed.score = Math.max(0, Math.min(100, parsed.score || 0));
    parsed.mismatches = parsed.mismatches || [];
    return parsed;
  } catch (err) {
    console.warn('[character-scorer] Scoring failed, returning pass-by-default:', err instanceof Error ? err.message : err);
    return { score: 80, mismatches: [] };
  }
}
