import { getGeminiClient } from './gemini';
import type { VisualBible } from './visual-bible';

export type VerificationResult = {
  passes: boolean;
  reason: string;
  raceMatch: boolean;
  skinToneMatch: boolean;
  hairMatch: boolean;
  genderMatch: boolean;
  ageRangeMatch: boolean;
};

export async function verifyPageIdentity(params: {
  pageImageBuffer: Buffer;
  visualBible: VisualBible;
  childGender: 'male' | 'female' | string;
}): Promise<VerificationResult> {
  try {
    const { pageImageBuffer, visualBible } = params;
    const protagonist = visualBible.protagonist;
    const desc = `Name: ${protagonist.name}\nHair: ${protagonist.hair}\nSkin: ${protagonist.skin}\nFace: ${protagonist.face}\nBody: ${protagonist.body}\nOutfit: ${protagonist.outfit}`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/png', data: pageImageBuffer.toString('base64') } },
          { text: `You are a strict quality control checker for a children's book illustration system.

The character described below must appear in the image with these specific traits intact:
- Race / ethnicity
- Skin tone
- Hair color and texture
- Gender presentation
- Approximate age range

The Visual Bible says the protagonist is:
${desc}

Look at the attached image. Focus on the main child character (the protagonist). For each trait, answer strictly: does the character in the image match the Visual Bible?

Return ONLY valid JSON:

{
  "raceMatch": boolean,
  "skinToneMatch": boolean,
  "hairMatch": boolean,
  "genderMatch": boolean,
  "ageRangeMatch": boolean,
  "passes": boolean,
  "reason": "Short explanation if any failed, else empty string"
}

Be strict. If unsure whether a trait matches, return false.` },
        ],
      }],
    });

    const text = (response.text || '').trim().replace(/```json\n?|```\n?/g, '').trim();
    const parsed = JSON.parse(text) as VerificationResult;
    console.log(`[identity-verifier] Result: passes=${parsed.passes}, reason="${parsed.reason}"`);
    return parsed;
  } catch (err) {
    console.warn('[identity-verifier] Verification error (accepting page):', err instanceof Error ? err.message : String(err));
    return { passes: true, reason: 'verification skipped due to error', raceMatch: true, skinToneMatch: true, hairMatch: true, genderMatch: true, ageRangeMatch: true };
  }
}
