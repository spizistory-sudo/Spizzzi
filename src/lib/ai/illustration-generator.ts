import { getGeminiClient } from './gemini';
import { ART_STYLES, type ArtStyleKey } from './prompts/style-references';
import { generateWithRateLimit } from './rate-limit';
import type { Part } from '@google/genai';
import { isDevMode } from '@/lib/dev/config';
import { generateImageWithFlux } from './fal-client';

const PRIMARY_MODEL = 'gemini-3-pro-image-preview';
const FALLBACK_MODEL = 'imagen-4.0-generate-001';

interface GenerateCoverParams {
  styleKey: ArtStyleKey;
  bookTitle: string;
  characterDescription: string;
  themeDescription: string;
  childPhotoBase64?: string;
}

interface GeneratePageIllustrationParams {
  styleKey: ArtStyleKey;
  characterDescription: string;
  illustrationPrompt: string;
  mood: string;
  pageNumber: number;
  childPhotoBase64?: string;
  coverImageBase64?: string;
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
): Promise<Buffer> {
  const { styleKey, characterDescription, themeDescription, childPhotoBase64 } = params;
  const style = ART_STYLES[styleKey];

  if (!characterDescription || characterDescription.length < 50) {
    console.warn('[illustration] WARNING: Cover character description is too short or missing:', characterDescription);
  }

  const promptText = `MAIN CHARACTER (must appear in this illustration, looking EXACTLY as described):
${characterDescription}
This character MUST be recognizable — same face shape, same hair color and style, same eye color, same skin tone. Do not change the character's appearance.

SCENE TO ILLUSTRATE:
A magical, warm, and inviting cover scene that captures the essence of this story theme: ${themeDescription}

ART STYLE:
${style.stylePrompt}

RULES:
- The main character must look identical to the description above
- Generate ONLY the scene as a flat digital painting
- Do NOT draw a book, book pages, page edges, binding, spine, or any book frame
- Do NOT add any border, frame, vignette, or edge effects
- Do NOT make it look like a photo of a printed page or physical book
- The illustration must fill the ENTIRE image canvas edge to edge
- No white borders, no margins, no book-related visual elements whatsoever
- Think of this as a movie poster or a painting on a wall — NOT a page in a book
- CRITICAL: Do NOT include any text, title, words, letters, numbers, or writing ANYWHERE in the image. Generate ONLY the illustration with NO text whatsoever. We will add the title separately with CSS.`;

  // Dev mode: FLUX.2 Pro via fal.ai — high quality, ~$0.03/image
  if (isDevMode()) {
    console.log(`[DEV_MODE] Using FLUX.2 Pro for cover (${styleKey})`);
    return generateWithRateLimit(() =>
      generateImageWithFlux(promptText, { aspectRatio: 'portrait_4_3' })
    );
  }

  // Production: Nano Banana Pro with reference images, fallback to Imagen 4
  const fullPrompt = childPhotoBase64
    ? `${promptText}\nGenerate in PORTRAIT orientation (2:3 aspect ratio, taller than wide).\nThink step by step about the character's appearance before generating. The main character must look EXACTLY like the child in the reference photo.`
    : `${promptText}\nGenerate in PORTRAIT orientation (2:3 aspect ratio, taller than wide).`;

  console.log(`[illustration-generator] generateCoverImage: ${styleKey}, model: ${PRIMARY_MODEL}`);

  return generateWithRateLimit(async () => {
    const ai = getGeminiClient();

    try {
      const parts: Part[] = [];
      if (childPhotoBase64) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: childPhotoBase64 } });
      }
      parts.push({ text: fullPrompt });

      const response = await ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents: [{ role: 'user', parts }],
        config: { responseModalities: ['image', 'text'] },
      });

      const imageBuffer = extractImageFromResponse(response);
      if (!imageBuffer) {
        console.warn(`[illustration-generator] ${PRIMARY_MODEL} returned no image, trying fallback`);
        return await generateWithImagen(FALLBACK_MODEL, fullPrompt, `cover-${styleKey}`, '2:3');
      }

      console.log(`[illustration-generator] Cover generated via ${PRIMARY_MODEL}, ${imageBuffer.length} bytes`);
      return imageBuffer;
    } catch (err) {
      console.error(`[illustration-generator] ${PRIMARY_MODEL} cover FAILED, trying fallback:`, {
        message: err instanceof Error ? err.message : String(err),
      });
      return await generateWithImagen(FALLBACK_MODEL, fullPrompt, `cover-${styleKey}`, '2:3');
    }
  });
}

export async function generatePageIllustration(
  params: GeneratePageIllustrationParams
): Promise<Buffer> {
  const {
    styleKey,
    characterDescription,
    illustrationPrompt,
    mood,
    pageNumber,
    childPhotoBase64,
    coverImageBase64,
  } = params;
  const style = ART_STYLES[styleKey];

  console.log('[illustration-generator] Character description:', characterDescription?.substring(0, 100));
  if (!characterDescription || characterDescription.length < 50) {
    console.warn('[illustration] WARNING: Character description is too short or missing:', characterDescription);
  }

  const promptText = `MAIN CHARACTER (must appear in EVERY illustration, looking EXACTLY the same):
${characterDescription}
This character MUST be recognizable across all pages — same face shape, same hair color and style, same eye color, same skin tone, same clothing. Do not change the character's appearance.

SCENE TO ILLUSTRATE:
${illustrationPrompt}

ART STYLE:
${style.stylePrompt}

RULES:
- The main character must look identical to the description above
- Generate ONLY the scene as a flat digital painting
- Do NOT draw a book, book pages, page edges, binding, spine, or any book frame
- Do NOT add any border, frame, vignette, or edge effects
- Do NOT make it look like a photo of a printed page
- Fill the entire canvas edge to edge — no white borders, no margins, no frames
- Think of this as a movie frame or a painting on a wall — NOT a page in a book
- Do NOT include any text, title, words, letters, numbers, or writing in the image
- Mood: ${mood}`;

  console.log(`[PROMPT DEBUG] Full page illustration prompt:\n${promptText}`);

  // Dev mode: FLUX.2 Pro via fal.ai — high quality, ~$0.03/image
  if (isDevMode()) {
    console.log(`[DEV_MODE] Using FLUX.2 Pro for page ${pageNumber}`);
    return generateWithRateLimit(() =>
      generateImageWithFlux(promptText, { aspectRatio: 'portrait_4_3' })
    );
  }

  // Production: Nano Banana Pro with reference images
  const fullPrompt = childPhotoBase64
    ? `${promptText}\nGenerate in PORTRAIT orientation (3:4 aspect ratio, taller than wide).\nThink step by step about the character's appearance. The main character must look EXACTLY like the child in the reference photo.`
    : `${promptText}\nGenerate in PORTRAIT orientation (3:4 aspect ratio, taller than wide).`;

  return generateWithRateLimit(async () => {
    const ai = getGeminiClient();

    try {
      const parts: Part[] = [];
      if (childPhotoBase64) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: childPhotoBase64 } });
      }
      if (coverImageBase64) {
        parts.push({ inlineData: { mimeType: 'image/png', data: coverImageBase64 } });
      }
      parts.push({ text: fullPrompt });

      const response = await ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents: [{ role: 'user', parts }],
        config: { responseModalities: ['image', 'text'] },
      });

      const imageBuffer = extractImageFromResponse(response);
      if (!imageBuffer) {
        console.warn(`[illustration-generator] ${PRIMARY_MODEL} returned no image for page ${pageNumber}, trying fallback`);
        return await generateWithImagen(FALLBACK_MODEL, fullPrompt, `page-${pageNumber}`, '3:4');
      }

      return imageBuffer;
    } catch (err) {
      console.error(`[illustration-generator] ${PRIMARY_MODEL} page ${pageNumber} FAILED, trying fallback:`, {
        message: err instanceof Error ? err.message : String(err),
      });
      return await generateWithImagen(FALLBACK_MODEL, fullPrompt, `page-${pageNumber}`, '3:4');
    }
  });
}
