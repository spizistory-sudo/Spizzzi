import { getGeminiClient } from './gemini';
import { ART_STYLES, type ArtStyleKey } from './prompts/style-references';
import { generateWithRateLimit } from './rate-limit';
import type { Part } from '@google/genai';
import { isDevIllustrations } from '@/lib/dev/config';
import { generateImageWithFlux, generateImageWithFlux2Pro, type ReferenceImage } from './fal-client';

export const PRIMARY_MODEL = 'gemini-3-pro-image-preview';
export const FALLBACK_MODEL = 'flux-2-pro';

export type GenerationResult = { buffer: Buffer; modelUsed: string };

const ANTI_TEXT_RULES = `CRITICAL ANTI-TEXT RULE — READ CAREFULLY:
The image MUST be pure visual art with absolutely no text of any kind. Specifically:
- NO words, NO letters, NO numbers, NO punctuation marks, NO symbols
- NO captions, NO labels, NO titles, NO signs, NO banners
- NO writing on books, papers, signs, walls, clothing, or any object
- NO speech bubbles, NO thought bubbles, NO sound effects ("zzz", "pow", etc.)
- NO watermarks, NO signatures, NO page numbers
- NO foreign characters, NO scribbles that look like text, NO calligraphy
If your illustration includes a book, the book MUST be closed or its pages MUST be BLANK with zero visible text. If your illustration includes a sign, the sign MUST be blank. If your illustration includes paper, the paper MUST be blank. NEVER render any character in the image as if they are reading words or looking at writing.
This is the single most important rule. Violating it makes the book unusable.
The illustration is PURE VISUAL STORYTELLING — express everything through faces, body language, colors, and scene composition, NEVER through written text.`;

interface GenerateCoverParams {
  styleKey: ArtStyleKey;
  bookTitle: string;
  characterDescription: string;
  themeDescription: string;
  childPhotoBase64?: string;
  stylePreviewBase64?: string;
}

interface GeneratePageIllustrationParams {
  styleKey: ArtStyleKey;
  characterDescription: string;
  illustrationPrompt: string;
  mood: string;
  pageNumber: number;
  childPhotoBase64?: string;
  coverImageBase64?: string;
  stylePreviewBase64?: string;
  visualBibleBlock?: string;
  characterCrops?: Array<{ name: string; base64: string }>;
  previousPageBase64?: string;
}

function extractStatusCode(err: Error): number | undefined {
  const asAny = err as Error & { status?: number; statusCode?: number };
  if (asAny.status) return asAny.status;
  if (asAny.statusCode) return asAny.statusCode;
  try {
    const parsed = JSON.parse(err.message);
    return parsed?.error?.code;
  } catch { /* not JSON */ }
  if (err.message.includes('503')) return 503;
  if (err.message.includes('429')) return 429;
  return undefined;
}

function extractImageFromResponse(response: { candidates?: Array<{ content?: { parts?: Part[] } }> }): Buffer | null {
  const imagePart = response.candidates?.[0]?.content?.parts?.find(
    (part: Part) => part.inlineData?.mimeType?.startsWith('image/')
  );
  if (!imagePart?.inlineData?.data) return null;
  return Buffer.from(imagePart.inlineData.data, 'base64');
}

async function generateWithImagen(
  model: string,
  prompt: string,
  context: string,
  aspectRatio: string
): Promise<Buffer> {
  console.log(`[illustration-generator] Calling ${model} for ${context} (aspect: ${aspectRatio})`);
  const ai = getGeminiClient();
  const response = await ai.models.generateImages({
    model,
    prompt,
    config: {
      numberOfImages: 1,
      aspectRatio,
    },
  });
  const generatedImage = response.generatedImages?.[0];
  if (!generatedImage?.image?.imageBytes) {
    throw new Error(`${model}: no image generated for ${context}`);
  }
  return Buffer.from(generatedImage.image.imageBytes, 'base64');
}

export async function generateCoverImage(
  params: GenerateCoverParams
): Promise<GenerationResult> {
  const { styleKey, characterDescription, themeDescription, childPhotoBase64, stylePreviewBase64 } = params;
  const style = ART_STYLES[styleKey];

  if (!characterDescription || characterDescription.length < 50) {
    console.warn('[illustration] WARNING: Cover character description is too short or missing:', characterDescription);
  }

  const promptText = `PURE IMAGE OUTPUT — NO TEXT WHATSOEVER. Do not render any words, letters, numbers, or written symbols anywhere in this image.

MAIN CHARACTER (must appear EXACTLY ONCE in this illustration, looking EXACTLY as described):
${characterDescription}
This character MUST be recognizable — same face shape, same hair color and style, same eye color, same skin tone. Do not change the character's appearance.
The main character appears EXACTLY ONCE — not duplicated, not mirrored.

SCENE TO ILLUSTRATE:
A magical, warm, and inviting cover scene that captures the essence of this story theme: ${themeDescription}

ART STYLE:
${style.stylePrompt}

CHARACTER RULES:
- The main character must look identical to the description above and appear ONCE
- EVERY person in the scene must have a complete, clearly drawn, friendly face with visible eyes, nose, and mouth
- NEVER draw faceless people, blurred faces, or featureless silhouettes

TECHNICAL RULES:
- Generate ONLY the scene as a flat digital painting
- Do NOT draw a book, book pages, page edges, binding, spine, or any book frame
- Do NOT add any border, frame, vignette, or edge effects
- Do NOT make it look like a photo of a printed page or physical book
- The illustration must fill the ENTIRE image canvas edge to edge
- No white borders, no margins, no book-related visual elements whatsoever
- Think of this as a movie poster or a painting on a wall — NOT a page in a book
${ANTI_TEXT_RULES}
We will add the title separately with CSS.`;

  if (isDevIllustrations()) {
    console.log(`[DEV_ILLUSTRATIONS] Using FLUX.2 Pro for cover (${styleKey})`);
    const buffer = await generateWithRateLimit(() =>
      generateImageWithFlux(promptText, { aspectRatio: 'portrait_4_3' })
    );
    return { buffer, modelUsed: 'flux-pro-v1.1' };
  }

  const referenceBlock = (childPhotoBase64 || stylePreviewBase64) ? `
REFERENCE IMAGES — READ CAREFULLY:

${childPhotoBase64 ? `The FIRST attached image is a PHOTO of the REAL CHILD this book is about. The protagonist on the cover MUST look like this child — match the face shape, hair color and texture, eye color and shape, skin tone, and overall proportions exactly.` : ''}

${stylePreviewBase64 ? `The ${childPhotoBase64 ? 'SECOND' : 'FIRST'} attached image is a STYLE EXAMPLE showing the EXACT art style this cover must be rendered in. This is the MOST IMPORTANT visual instruction. The cover MUST look like it could come from the same book or art collection as this style example. Match every aspect of this style:
- The medium (oil paint vs. ink vs. clay vs. 3D render vs. watercolor vs. screen-print, etc.)
- The color palette and saturation
- The line work — thick black outlines vs. no outlines vs. soft edges
- The texture — paper grain, halftone dots, brushstrokes, clay fingerprints, smooth 3D rendering, etc.
- The lighting approach
- The level of detail and stylization

If you do not faithfully reproduce the style shown in this image, you have failed.` : ''}

PHOTO = who the character IS. STYLE EXAMPLE = how to RENDER them. Never confuse these roles. If the photo's child does not match the style example's character, IGNORE the style example's character — only use the style example for art style and medium reference.
` : '';

  const fullPrompt = `${promptText}\n${referenceBlock}\nGenerate in PORTRAIT orientation (3:4 aspect ratio, taller than wide).${childPhotoBase64 ? '\nThink step by step about the character\'s appearance before generating. The main character must look EXACTLY like the child in the reference photo.' : ''}`;

  console.log('[illustration-generator] generateCoverImage references:', {
    styleKey,
    photoPresent: !!childPhotoBase64,
    stylePresent: !!stylePreviewBase64,
  });

  console.log(`[illustration-generator] generateCoverImage: ${styleKey}, model: ${PRIMARY_MODEL}`);

  return generateWithRateLimit(async () => {
    const ai = getGeminiClient();

    let geminiError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const parts: Part[] = [];
        if (childPhotoBase64) {
          parts.push({ inlineData: { mimeType: 'image/jpeg', data: childPhotoBase64 } });
        }
        if (stylePreviewBase64) {
          parts.push({ inlineData: { mimeType: 'image/png', data: stylePreviewBase64 } });
        }
        parts.push({ text: fullPrompt });

        const response = await ai.models.generateContent({
          model: PRIMARY_MODEL,
          contents: [{ role: 'user', parts }],
          config: { responseModalities: ['image', 'text'] },
        });

        const imageBuffer = extractImageFromResponse(response);
        if (!imageBuffer) {
          console.warn(`[illustration-generator] ${PRIMARY_MODEL} returned no image on attempt ${attempt}`);
          geminiError = new Error('No image in response');
          break;
        }

        console.log(`[illustration-generator] Cover generated via ${PRIMARY_MODEL} (attempt ${attempt}), ${imageBuffer.length} bytes`);
        return { buffer: imageBuffer, modelUsed: PRIMARY_MODEL };
      } catch (err) {
        geminiError = err instanceof Error ? err : new Error(String(err));
        const status = extractStatusCode(geminiError);
        if ((status === 503 || status === 429) && attempt < 3) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
          console.log(`[illustration-generator] ${PRIMARY_MODEL} cover attempt ${attempt} got ${status}, retrying in ${delayMs}ms`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
        break;
      }
    }

    console.error(`[illustration-generator] ${PRIMARY_MODEL} cover FAILED after retries — no fallback for covers:`, {
      message: geminiError?.message,
    });
    throw geminiError || new Error('Cover generation failed after all retries');
  });
}

export async function generatePageIllustration(
  params: GeneratePageIllustrationParams
): Promise<GenerationResult> {
  const {
    styleKey,
    characterDescription,
    illustrationPrompt,
    mood,
    pageNumber,
    childPhotoBase64,
    coverImageBase64,
    stylePreviewBase64,
    visualBibleBlock,
    characterCrops,
    previousPageBase64,
  } = params;
  const style = ART_STYLES[styleKey];

  if (!characterDescription || characterDescription.length < 50) {
    console.warn('[illustration] WARNING: Character description is too short or missing:', characterDescription);
  }

  const sceneInvolvesText = /\b(read|reading|book|sign|letter|note|paper|write|writing|page|library|chalkboard|menu)\b/i.test(illustrationPrompt);
  const extraAntiText = sceneInvolvesText
    ? `\nSPECIAL NOTE: This scene involves objects that typically contain text. ALL such objects MUST be visually blank — no text, no letters, no markings. Books must be closed or have blank pages. Signs must be blank.`
    : '';

  // Build reference image descriptions for the prompt
  const refDescriptions: string[] = [];
  let refIdx = 1;
  const protagonistCrop = characterCrops?.find(c => c.name === characterDescription.split('\n')[0]?.match(/\b[A-Z][a-z]+\b/)?.[0]) || characterCrops?.[0];
  if (protagonistCrop) refDescriptions.push(`- Image ${refIdx++}: ${protagonistCrop.name}'s portrait extracted from the cover. The character on this page MUST look like this portrait — same face, hair, skin tone, outfit.`);
  const otherCrops = characterCrops?.filter(c => c !== protagonistCrop) || [];
  for (const crop of otherCrops) {
    if (refIdx > 8) break;
    refDescriptions.push(`- Image ${refIdx++}: ${crop.name}'s portrait — must match this appearance on this page.`);
  }
  if (previousPageBase64) refDescriptions.push(`- Image ${refIdx++}: The previous page of this book — for visual continuity, world and style must match.`);
  if (coverImageBase64) refDescriptions.push(`- Image ${refIdx++}: The full cover — for overall scene/style reference.`);
  if (childPhotoBase64) refDescriptions.push(`- Image ${refIdx++}: The child's original photo — identity backup.`);
  if (stylePreviewBase64) refDescriptions.push(`- Image ${refIdx++}: Style swatch — rendering technique ONLY, not layout or character.`);

  const promptText = `=== ABSOLUTE IDENTITY LOCK — READ FIRST ===

The protagonist of this book is ${characterDescription.match(/\b[A-Z][a-z]+\b/)?.[0] || 'the child'}.
${characterDescription.substring(0, 200)}

These traits are FIXED and NON-NEGOTIABLE across every page of this book.
DO NOT change the protagonist's race based on the scene.
DO NOT change skin tone to match the background or setting.
DO NOT let the art style override the character's identity.
DO NOT draw a different-looking child even if the scene suggests one.

=== END IDENTITY LOCK ===

${visualBibleBlock || ''}PURE IMAGE OUTPUT — NO TEXT WHATSOEVER. Do not render any words, letters, numbers, or written symbols anywhere in this image.

=== REFERENCE IMAGES ATTACHED ===
${refDescriptions.join('\n')}
=== END REFERENCES ===

SCENE TO ILLUSTRATE:
${illustrationPrompt}

ART STYLE:
${style.stylePrompt}

CHARACTER CONSISTENCY RULES:
- The main character must look identical to the description above — same face, hair, eyes, skin, clothes on EVERY page
- The main character appears ONCE per illustration — not duplicated, not mirrored, not shown from two angles
- All side characters must remain visually identical to how they appeared on earlier pages
- EVERY person must have a complete, clearly drawn face with visible eyes, nose, and mouth

TECHNICAL RULES:
- Generate ONLY the scene as a flat digital painting
- Do NOT draw a book, book pages, page edges, binding, spine, or any book frame
- Do NOT add any border, frame, vignette, or edge effects
- Fill the entire canvas edge to edge — no white borders, no margins, no frames
${ANTI_TEXT_RULES}${extraAntiText}
- Mood: ${mood}

=== FINAL CHECK BEFORE GENERATING ===
Before generating, verify: Is the character's race, skin tone, hair color/style the same as the Identity Lock above and the portrait references? If not, the image is WRONG — regenerate with the correct identity.
=== END FINAL CHECK ===`;

  if (isDevIllustrations()) {
    console.log(`[DEV_ILLUSTRATIONS] Using FLUX.2 Pro for page ${pageNumber}`);
    const buffer = await generateWithRateLimit(() =>
      generateImageWithFlux(promptText, { aspectRatio: 'portrait_4_3' })
    );
    return { buffer, modelUsed: 'flux-pro-v1.1' };
  }

  const fullPrompt = `${promptText}\nGenerate in PORTRAIT orientation (3:4 aspect ratio, taller than wide).`;

  console.log('[illustration-generator] Page references:', {
    pageNumber,
    styleKey,
    cropCount: characterCrops?.length || 0,
    hasPreviousPage: !!previousPageBase64,
    coverPresent: !!coverImageBase64,
    photoPresent: !!childPhotoBase64,
    stylePresent: !!stylePreviewBase64,
  });

  return generateWithRateLimit(async () => {
    const ai = getGeminiClient();

    try {
      const parts: Part[] = [];
      // Order: character crops → previous page → cover → photo → style preview
      // Cap at 10 images total
      let imgCount = 0;
      if (protagonistCrop && imgCount < 10) {
        parts.push({ inlineData: { mimeType: 'image/png', data: protagonistCrop.base64 } });
        imgCount++;
      }
      for (const crop of otherCrops) {
        if (imgCount >= 10) break;
        parts.push({ inlineData: { mimeType: 'image/png', data: crop.base64 } });
        imgCount++;
      }
      if (previousPageBase64 && imgCount < 10) {
        parts.push({ inlineData: { mimeType: 'image/png', data: previousPageBase64 } });
        imgCount++;
      }
      if (coverImageBase64 && imgCount < 10) {
        parts.push({ inlineData: { mimeType: 'image/png', data: coverImageBase64 } });
        imgCount++;
      }
      if (childPhotoBase64 && imgCount < 10) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: childPhotoBase64 } });
        imgCount++;
      }
      if (stylePreviewBase64 && imgCount < 10) {
        parts.push({ inlineData: { mimeType: 'image/png', data: stylePreviewBase64 } });
        imgCount++;
      }
      parts.push({ text: fullPrompt });

      const response = await ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents: [{ role: 'user', parts }],
        config: { responseModalities: ['image', 'text'] },
      });

      const imageBuffer = extractImageFromResponse(response);
      if (!imageBuffer) {
        console.warn(`[illustration-generator] ${PRIMARY_MODEL} returned no image for page ${pageNumber}, trying FLUX.2 Pro fallback`);
        const fb = await generateFlux2Fallback(fullPrompt, { characterCrops, coverImageBase64, childPhotoBase64, stylePreviewBase64 });
        return { buffer: fb, modelUsed: FALLBACK_MODEL };
      }

      return { buffer: imageBuffer, modelUsed: PRIMARY_MODEL };
    } catch (err) {
      console.error(`[illustration-generator] ${PRIMARY_MODEL} page ${pageNumber} FAILED, trying FLUX.2 Pro fallback:`, {
        message: err instanceof Error ? err.message : String(err),
      });
      const fb = await generateFlux2Fallback(fullPrompt, { characterCrops, coverImageBase64, childPhotoBase64, stylePreviewBase64 });
      return { buffer: fb, modelUsed: FALLBACK_MODEL };
    }
  });
}

async function generateFlux2Fallback(
  prompt: string,
  refs: {
    characterCrops?: Array<{ name: string; base64: string }>;
    coverImageBase64?: string;
    childPhotoBase64?: string;
    stylePreviewBase64?: string;
  },
): Promise<Buffer> {
  const referenceImages: ReferenceImage[] = [];

  // Protagonist crop first (strongest identity anchor)
  if (refs.characterCrops?.[0]) {
    referenceImages.push({ base64: refs.characterCrops[0].base64, role: 'protagonist' });
  }
  // Supporting character crops
  for (const crop of (refs.characterCrops || []).slice(1)) {
    if (referenceImages.length >= 8) break;
    referenceImages.push({ base64: crop.base64, role: 'supporting_character' });
  }
  // Cover
  if (refs.coverImageBase64 && referenceImages.length < 8) {
    referenceImages.push({ base64: refs.coverImageBase64, role: 'cover' });
  }
  // Original photo
  if (refs.childPhotoBase64 && referenceImages.length < 8) {
    referenceImages.push({ base64: refs.childPhotoBase64, mimeType: 'image/jpeg', role: 'photo' });
  }
  // Style preview
  if (refs.stylePreviewBase64 && referenceImages.length < 8) {
    referenceImages.push({ base64: refs.stylePreviewBase64, role: 'style_preview' });
  }

  console.log(`[illustration-generator] FLUX.2 Pro fallback with ${referenceImages.length} reference images`);

  return generateImageWithFlux2Pro(prompt, {
    aspectRatio: 'portrait_4_3',
    referenceImages,
  });
}
