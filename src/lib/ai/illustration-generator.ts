import { getGeminiClient } from './gemini';
import { ART_STYLES, type ArtStyleKey } from './prompts/style-references';
import { generateWithRateLimit } from './rate-limit';
import type { Part } from '@google/genai';
import { isDevIllustrations } from '@/lib/dev/config';
import { generateImageWithFlux2Pro, type ReferenceImage } from './fal-client';

export const PRIMARY_MODEL = 'gemini-3-pro-image-preview';
export const FALLBACK_MODEL = 'flux-2-pro';

export type GenerationResult = { buffer: Buffer; modelUsed: string };

export const ANTI_TEXT_RULES = `CRITICAL ANTI-TEXT RULE — READ CAREFULLY:
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
  childPhotosBase64?: string[];
  characterSheetBase64?: string;
  stylePreviewBase64?: string;
}

interface GeneratePageIllustrationParams {
  styleKey: ArtStyleKey;
  characterDescription: string;
  illustrationPrompt: string;
  mood: string;
  pageNumber: number;
  childPhotoBase64?: string;
  childPhotosBase64?: string[];
  characterSheetBase64?: string;
  coverImageBase64?: string;
  stylePreviewBase64?: string;
  visualBibleBlock?: string;
  characterCrops?: Array<{ name: string; base64: string }>;
  previousPageBase64?: string;
  useFluxDirectly?: boolean;
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

interface GenerateCharacterSheetParams {
  styleKey: ArtStyleKey;
  characterDescription: string;
  childPhotosBase64?: string[];
  stylePreviewBase64?: string;
}

export async function generateCharacterSheet(
  params: GenerateCharacterSheetParams
): Promise<GenerationResult> {
  const { styleKey, characterDescription, childPhotosBase64, stylePreviewBase64 } = params;
  const style = ART_STYLES[styleKey];
  const allPhotos = childPhotosBase64 || [];

  const promptText = `PURE IMAGE OUTPUT — NO TEXT WHATSOEVER.

CHARACTER REFERENCE SHEET — Generate a clean, front-facing character portrait.

CHARACTER (must match the reference photos EXACTLY):
${characterDescription}

REQUIREMENTS:
- Front-facing view, neutral friendly expression, eyes looking at camera
- Simple plain solid-color background (no scene, no props, no other characters)
- Clear full face visible: eyes, nose, mouth, hair all fully shown
- Character fills most of the frame (head and shoulders, or head to waist)
- Consistent character design suitable for reproducing across many illustrations

ART STYLE:
${style.stylePrompt}

${ANTI_TEXT_RULES}

This is a CHARACTER REFERENCE — it will be used as the identity anchor for all illustrations in this book. Accuracy to the photo is critical.`;

  const refDescriptions = allPhotos.length > 0
    ? `The FIRST ${allPhotos.length > 1 ? `${allPhotos.length} images are PHOTOS` : 'image is a PHOTO'} of the REAL CHILD. Match their appearance EXACTLY.${stylePreviewBase64 ? ' The NEXT image is the art STYLE to render in.' : ''}`
    : stylePreviewBase64 ? 'The attached image is the art STYLE to render in.' : '';

  const fullPrompt = `${promptText}\n\nREFERENCE IMAGES:\n${refDescriptions}\nGenerate in PORTRAIT orientation (3:4 aspect ratio).`;

  if (isDevIllustrations()) {
    console.log(`[character-sheet] Using FLUX 2 Pro (DEV_ILLUSTRATIONS)`);
    const buffer = await generateWithRateLimit(() =>
      buildFlux2ProRequest(fullPrompt, { childPhotoBase64: allPhotos[0], stylePreviewBase64 })
    );
    return { buffer, modelUsed: FALLBACK_MODEL };
  }

  return generateWithRateLimit(async () => {
    const ai = getGeminiClient();
    try {
      const parts: Part[] = [];
      for (const photo of allPhotos) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: photo } });
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
      if (!imageBuffer) throw new Error('No image in character sheet response');

      console.log(`[character-sheet] Generated via ${PRIMARY_MODEL}, ${imageBuffer.length} bytes`);
      return { buffer: imageBuffer, modelUsed: PRIMARY_MODEL };
    } catch (err) {
      console.warn(`[character-sheet] ${PRIMARY_MODEL} failed, trying FLUX 2 Pro:`, err instanceof Error ? err.message : err);
      const fb = await buildFlux2ProRequest(fullPrompt, { childPhotoBase64: allPhotos[0], stylePreviewBase64 });
      return { buffer: fb, modelUsed: FALLBACK_MODEL };
    }
  });
}

export async function generateCoverImage(
  params: GenerateCoverParams
): Promise<GenerationResult> {
  const { styleKey, characterDescription, themeDescription, childPhotoBase64, childPhotosBase64, characterSheetBase64, stylePreviewBase64 } = params;
  const allChildPhotos = childPhotosBase64?.length ? childPhotosBase64 : childPhotoBase64 ? [childPhotoBase64] : [];
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
    console.log(`[DEV_ILLUSTRATIONS] Using FLUX 2 Pro for cover (${styleKey})`);
    const buffer = await generateWithRateLimit(() =>
      buildFlux2ProRequest(promptText, { childPhotoBase64: allChildPhotos[0], characterSheetBase64, stylePreviewBase64 })
    );
    return { buffer, modelUsed: FALLBACK_MODEL };
  }

  const referenceBlock = (allChildPhotos.length > 0 || stylePreviewBase64) ? `
REFERENCE IMAGES — READ CAREFULLY:

${allChildPhotos.length > 0 ? `The FIRST ${allChildPhotos.length > 1 ? `${allChildPhotos.length} attached images are PHOTOS` : 'attached image is a PHOTO'} of the REAL CHILD this book is about. The protagonist on the cover MUST look like this child — match the face shape, hair color and texture, eye color and shape, skin tone, and overall proportions exactly.${allChildPhotos.length > 1 ? ' Multiple angles are provided for better identity matching.' : ''}` : ''}

${stylePreviewBase64 ? `The ${allChildPhotos.length > 0 ? 'NEXT' : 'FIRST'} attached image is a STYLE EXAMPLE showing the EXACT art style this cover must be rendered in. This is the MOST IMPORTANT visual instruction. The cover MUST look like it could come from the same book or art collection as this style example. Match every aspect of this style:
- The medium (oil paint vs. ink vs. clay vs. 3D render vs. watercolor vs. screen-print, etc.)
- The color palette and saturation
- The line work — thick black outlines vs. no outlines vs. soft edges
- The texture — paper grain, halftone dots, brushstrokes, clay fingerprints, smooth 3D rendering, etc.
- The lighting approach
- The level of detail and stylization

If you do not faithfully reproduce the style shown in this image, you have failed.` : ''}

PHOTO = who the character IS. CHARACTER SHEET = the locked character design in this art style — match it exactly. STYLE EXAMPLE = how to RENDER. Never confuse these roles. If the photo's child does not match the style example's character, IGNORE the style example's character — only use the style example for art style and medium reference.
` : '';

  const fullPrompt = `${promptText}\n${referenceBlock}\nGenerate in PORTRAIT orientation (3:4 aspect ratio, taller than wide).${allChildPhotos.length > 0 ? '\nThink step by step about the character\'s appearance before generating. The main character must look EXACTLY like the child in the reference photo(s).' : ''}`;

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
        for (const photo of allChildPhotos) {
          parts.push({ inlineData: { mimeType: 'image/jpeg', data: photo } });
        }
        if (characterSheetBase64) {
          parts.push({ inlineData: { mimeType: 'image/png', data: characterSheetBase64 } });
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
    childPhotosBase64,
    characterSheetBase64,
    coverImageBase64,
    stylePreviewBase64,
    visualBibleBlock,
    characterCrops,
    previousPageBase64,
    useFluxDirectly,
  } = params;
  const style = ART_STYLES[styleKey];
  const allChildPhotos = childPhotosBase64?.length ? childPhotosBase64 : childPhotoBase64 ? [childPhotoBase64] : [];

  if (!characterDescription || characterDescription.length < 50) {
    console.warn('[illustration] WARNING: Character description is too short or missing:', characterDescription);
  }

  // Parse illustration brief if embedded in the prompt
  let brief: { setting?: string; characters_in_frame?: Array<{ name: string; role: string; appearance: string }>; action?: string } | null = null;
  let rawIllustrationPrompt = illustrationPrompt;
  const briefMatch = illustrationPrompt.match(/<!--BRIEF:([\s\S]*?):BRIEF-->\n?/);
  if (briefMatch) {
    try {
      brief = JSON.parse(briefMatch[1]);
      rawIllustrationPrompt = illustrationPrompt.replace(briefMatch[0], '').trim();
    } catch { /* parsing failed, use raw prompt */ }
  }

  const sceneInvolvesText = /\b(read|reading|book|sign|letter|note|paper|write|writing|page|library|chalkboard|menu)\b/i.test(rawIllustrationPrompt);
  const extraAntiText = sceneInvolvesText
    ? `\nSPECIAL NOTE: This scene involves objects that typically contain text. ALL such objects MUST be visually blank — no text, no letters, no markings. Books must be closed or have blank pages. Signs must be blank.`
    : '';

  const protagonistName = characterDescription.match(/\b[A-Z][a-z]+\b/)?.[0] || 'the child';

  // Build reference image descriptions
  const refDescriptions: string[] = [];
  let refIdx = 1;
  const protagonistCrop = characterCrops?.find(c => c.name === protagonistName) || characterCrops?.[0];
  if (protagonistCrop) refDescriptions.push(`- Image ${refIdx++}: ${protagonistCrop.name}'s portrait from the cover — the PROTAGONIST. Match exactly.`);
  const otherCrops = characterCrops?.filter(c => c !== protagonistCrop) || [];
  for (const crop of otherCrops) {
    if (refIdx > 8) break;
    refDescriptions.push(`- Image ${refIdx++}: ${crop.name}'s portrait — must match this appearance.`);
  }
  if (characterSheetBase64) refDescriptions.push(`- Image ${refIdx++}: Character sheet — the LOCKED protagonist design. Match exactly.`);
  if (previousPageBase64) refDescriptions.push(`- Image ${refIdx++}: Previous page — for visual continuity.`);
  if (coverImageBase64) refDescriptions.push(`- Image ${refIdx++}: Cover — scene/style reference.`);
  if (childPhotoBase64) refDescriptions.push(`- Image ${refIdx++}: Child's photo — identity backup for PROTAGONIST only.`);
  if (stylePreviewBase64) refDescriptions.push(`- Image ${refIdx++}: Style swatch — rendering technique ONLY.`);
  refDescriptions.push(`\nREFERENCES DEFINE THE PROTAGONIST ONLY. Other characters in the scene are NOT in the references — render them fresh from their descriptions below.`);

  // Build scene-first prompt
  let sceneBlock: string;
  let charactersBlock: string;

  if (brief) {
    const protagonistChars = (brief.characters_in_frame || []).filter(c => c.role === 'protagonist');
    const secondaryChars = (brief.characters_in_frame || []).filter(c => c.role === 'secondary');
    const totalChars = protagonistChars.length + secondaryChars.length;
    const isMultiChar = secondaryChars.length > 0;
    const allNames = [...protagonistChars, ...secondaryChars].map(c => c.name).join(' and ');

    sceneBlock = `=== SCENE — THIS IS THE MOST IMPORTANT SECTION ===

${isMultiChar ? `⚠️ THIS IS A ${totalChars}-CHARACTER SCENE. You MUST draw ALL ${totalChars} characters listed below: ${allNames}. A scene with only the protagonist is WRONG.\n` : ''}SETTING: ${brief.setting}

ACTION: ${brief.action}

Illustrate this EXACT moment in this EXACT place. ${isMultiChar ? `BOTH/ALL characters must be visibly present and interacting as described in the action. Do NOT omit any character.` : ''} The setting must be unmistakable — specific architecture, landscape, objects, colors, and lighting as described.

=== END SCENE ===`;

    const charLines: string[] = [];
    for (const c of protagonistChars) {
      charLines.push(`- ${c.name} (PROTAGONIST): Match the character sheet / reference photos for face, hair, skin tone, build. ${characterDescription.substring(0, 100)}`);
    }
    for (const c of secondaryChars) {
      charLines.push(`- ${c.name} (SECONDARY — MUST BE DRAWN, do NOT omit): ${c.appearance}. This is a DIFFERENT person from ${protagonistName} — different face, different hair, different skin tone, different outfit. Draw them clearly visible and interacting with the protagonist.`);
    }

    charactersBlock = `=== CHARACTERS IN THIS SCENE — ALL MUST APPEAR ===
${charLines.join('\n')}

${isMultiChar ? `CRITICAL: This illustration MUST show ${totalChars} distinct characters. If you only draw ${protagonistName} alone, the image is WRONG. ${secondaryChars.map(c => c.name).join(', ')} must be clearly visible in the frame.\n` : ''}IDENTITY FIREWALL: Reference images define ONLY ${protagonistName}. Secondary characters are DISTINCT individuals with their OWN appearance. Do NOT clone ${protagonistName}'s features onto anyone else.
=== END CHARACTERS ===`;
  } else {
    sceneBlock = `=== SCENE TO ILLUSTRATE ===
${rawIllustrationPrompt}
=== END SCENE ===`;

    charactersBlock = `=== PROTAGONIST ===
${protagonistName} must match the character sheet and reference photos exactly — same face, hair, skin tone, build, outfit.
${characterDescription.substring(0, 200)}
=== END PROTAGONIST ===`;
  }

  const hasSecondaryChars = brief && (brief.characters_in_frame || []).some(c => c.role === 'secondary');

  const promptText = `PURE IMAGE OUTPUT — NO TEXT WHATSOEVER.

${sceneBlock}

${charactersBlock}

=== PROTAGONIST IDENTITY (face/hair/skin only) ===
${protagonistName}: ${characterDescription.substring(0, 150)}
Keep ${protagonistName}'s face, hair, and skin tone consistent with the character sheet.${hasSecondaryChars ? ` Other characters in this scene have their OWN distinct appearance as described above.` : ''}
=== END PROTAGONIST IDENTITY ===

${visualBibleBlock || ''}
=== REFERENCE IMAGES ===
${refDescriptions.join('\n')}
=== END REFERENCES ===

ART STYLE:
${style.stylePrompt}

TECHNICAL RULES:
- Generate ONLY the scene as a flat digital painting
- Do NOT draw a book, book pages, page edges, binding, spine, or any book frame
- Do NOT add any border, frame, vignette, or edge effects
- Fill the entire canvas edge to edge — no white borders, no margins, no frames
- EVERY person must have a complete, clearly drawn face with visible eyes, nose, and mouth
${hasSecondaryChars ? `- ALL listed characters must appear — do NOT draw the protagonist alone` : `- The protagonist appears ONCE — not duplicated, not mirrored`}
${ANTI_TEXT_RULES}${extraAntiText}
- Mood: ${mood}

=== FINAL CHECK ===
Before generating, verify: (1) Does the SCENE match the setting and action? ${hasSecondaryChars ? '(2) Are ALL listed characters visible in the frame? (3) Is each character visually DISTINCT?' : '(2) Is the protagonist\'s identity correct?'} If any fails, regenerate.
=== END FINAL CHECK ===`;

  if (isDevIllustrations()) {
    console.log(`[DEV_ILLUSTRATIONS] Using FLUX 2 Pro for page ${pageNumber}`);
    const buffer = await generateWithRateLimit(() =>
      buildFlux2ProRequest(promptText, { characterCrops, characterSheetBase64, coverImageBase64, childPhotoBase64, stylePreviewBase64 })
    );
    return { buffer, modelUsed: FALLBACK_MODEL };
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
    useFluxDirectly: !!useFluxDirectly,
  });

  // If model is locked to FLUX, skip Gemini entirely
  if (useFluxDirectly) {
    console.log(`[illustration-generator] FLUX-direct mode for page ${pageNumber} (model locked)`);
    const fb = await buildFlux2ProRequest(fullPrompt, { characterCrops, characterSheetBase64, coverImageBase64, childPhotoBase64, stylePreviewBase64 });
    return { buffer: fb, modelUsed: FALLBACK_MODEL };
  }

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
      if (characterSheetBase64 && imgCount < 10) {
        parts.push({ inlineData: { mimeType: 'image/png', data: characterSheetBase64 } });
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
      for (const photo of allChildPhotos) {
        if (imgCount >= 10) break;
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: photo } });
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
        const fb = await buildFlux2ProRequest(fullPrompt, { characterCrops, characterSheetBase64, coverImageBase64, childPhotoBase64, stylePreviewBase64 });
        return { buffer: fb, modelUsed: FALLBACK_MODEL };
      }

      return { buffer: imageBuffer, modelUsed: PRIMARY_MODEL };
    } catch (err) {
      console.error(`[illustration-generator] ${PRIMARY_MODEL} page ${pageNumber} FAILED, trying FLUX.2 Pro fallback:`, {
        message: err instanceof Error ? err.message : String(err),
      });
      const fb = await buildFlux2ProRequest(fullPrompt, { characterCrops, characterSheetBase64, coverImageBase64, childPhotoBase64, stylePreviewBase64 });
      return { buffer: fb, modelUsed: FALLBACK_MODEL };
    }
  });
}

async function buildFlux2ProRequest(
  prompt: string,
  refs: {
    characterCrops?: Array<{ name: string; base64: string }>;
    characterSheetBase64?: string;
    coverImageBase64?: string;
    childPhotoBase64?: string;
    stylePreviewBase64?: string;
  },
): Promise<Buffer> {
  const referenceImages: ReferenceImage[] = [];

  // Character sheet first (strongest identity anchor when available)
  if (refs.characterSheetBase64 && referenceImages.length < 8) {
    referenceImages.push({ base64: refs.characterSheetBase64, role: 'protagonist' });
  }
  // Protagonist crop
  if (refs.characterCrops?.[0] && referenceImages.length < 8) {
    referenceImages.push({ base64: refs.characterCrops[0].base64, role: referenceImages.length === 0 ? 'protagonist' : 'supporting_character' });
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
