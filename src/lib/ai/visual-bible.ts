import { getGeminiClient } from './gemini';

export type VisualBible = {
  protagonist: {
    name: string;
    hair: string;
    skin: string;
    face: string;
    body: string;
    outfit: string;
  };
  supportingCharacters: Array<{
    name: string;
    hair: string;
    skin: string;
    face: string;
    outfit: string;
    distinguishingFeatures: string;
  }>;
  setting: {
    palette: string;
    lighting: string;
    lineQuality: string;
    texture: string;
    dimensionality: string;
  };
  styleNotes: string;
};

export async function extractVisualBible(
  coverImageBase64: string,
  storyContext: {
    protagonistName: string;
    supportingCharacters: string[];
    storyText: string;
  },
): Promise<VisualBible | null> {
  try {
    const ai = getGeminiClient();
    console.log('[visual-bible] Extracting from cover for:', storyContext.protagonistName);

    const prompt = `You are a visual continuity director for a children's book. The attached image is the cover of a book. Analyze it and produce a structured "Visual Bible" describing every character and the world. This will be used to ensure all subsequent pages match this cover.

The book's protagonist is: ${storyContext.protagonistName}
Supporting characters that appear in the story: ${storyContext.supportingCharacters.join(', ') || 'none specified'}
Story context: ${storyContext.storyText.slice(0, 500)}...

Examine the cover image carefully and return ONLY valid JSON in this exact shape, no other text:

{
  "protagonist": {
    "name": "${storyContext.protagonistName}",
    "hair": "<exact visual description from cover>",
    "skin": "<exact visual description from cover>",
    "face": "<exact visual description from cover>",
    "body": "<exact visual description from cover>",
    "outfit": "<exact visual description from cover>"
  },
  "supportingCharacters": [
    {
      "name": "<character name>",
      "hair": "<exact from cover, or 'not visible on cover' if absent>",
      "skin": "<exact or 'not visible on cover'>",
      "face": "<exact or 'not visible on cover'>",
      "outfit": "<exact or 'not visible on cover'>",
      "distinguishingFeatures": "<exact or 'not visible on cover'>"
    }
  ],
  "setting": {
    "palette": "<dominant colors visible>",
    "lighting": "<direction, warmth, mood>",
    "lineQuality": "<hard/soft/painterly/screen-print/etc>",
    "texture": "<paper grain/halftone/smooth/etc>",
    "dimensionality": "<flat/dimensional/cinematic/etc>"
  },
  "styleNotes": "<2-3 sentences capturing the overall aesthetic of this cover>"
}

Be concrete and specific. Do not invent details not visible in the image. If a supporting character is mentioned in the story but does not appear on the cover, mark their visual fields as 'not visible on cover' — do NOT make up an appearance.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/png', data: coverImageBase64 } },
          { text: prompt },
        ],
      }],
    });

    const text = (response.text || '').trim();
    const cleaned = text.replace(/```json\n?|```\n?/g, '').trim();

    const parsed = JSON.parse(cleaned) as VisualBible;
    console.log('[visual-bible] Extracted successfully:', {
      protagonist: parsed.protagonist?.name,
      supportingCount: parsed.supportingCharacters?.length || 0,
      styleNotesLength: parsed.styleNotes?.length || 0,
    });

    return parsed;
  } catch (err) {
    console.error('[visual-bible] Extraction failed:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

export function visualBibleToPromptBlock(bible: VisualBible): string {
  const supportingBlock = bible.supportingCharacters
    .map(c => `${c.name.toUpperCase()}:\n- Hair: ${c.hair}\n- Skin: ${c.skin}\n- Face: ${c.face}\n- Outfit: ${c.outfit}\n- Distinguishing features: ${c.distinguishingFeatures}`)
    .join('\n\n');

  return `=== VISUAL BIBLE — MUST MATCH ON THIS PAGE ===

PROTAGONIST (${bible.protagonist.name}):
- Hair: ${bible.protagonist.hair}
- Skin: ${bible.protagonist.skin}
- Face: ${bible.protagonist.face}
- Body: ${bible.protagonist.body}
- Outfit: ${bible.protagonist.outfit}

${supportingBlock ? `SUPPORTING CHARACTERS:\n${supportingBlock}\n` : ''}
WORLD & STYLE:
- Color palette: ${bible.setting.palette}
- Lighting: ${bible.setting.lighting}
- Line quality: ${bible.setting.lineQuality}
- Texture: ${bible.setting.texture}
- Dimensionality: ${bible.setting.dimensionality}
- Overall: ${bible.styleNotes}

CRITICAL RULES:
- Every character on this page MUST match the descriptions above exactly. Hair color, skin tone, outfit, face shape — all must match.
- The rendering style MUST match the world & style description above.
- If a character appears differently from the bible on this page, the image is WRONG.
- Do NOT soften, smooth, or shift toward a generic illustration style. Stay locked to the bible.

=== END VISUAL BIBLE ===

`;
}
