import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCoverImage, PRIMARY_MODEL, FALLBACK_MODEL, ANTI_TEXT_RULES, type GenerationResult } from '@/lib/ai/illustration-generator';
import { generateImageWithFlux2Pro, type ReferenceImage } from '@/lib/ai/fal-client';
import { ART_STYLES, ART_STYLE_KEYS, type ArtStyleKey } from '@/lib/ai/prompts/style-references';
import { logGeneration } from '@/lib/ai/generation-logger';
import { extractVisualBible } from '@/lib/ai/visual-bible';
import { extractCharacterBoundingBoxes, cropAndUploadCharacters } from '@/lib/ai/character-cropper';
import { triggerFailureEmail } from '@/lib/email/book-completion-trigger';
import { uploadImage, getImageBase64 } from '@/lib/supabase/storage';
import * as fs from 'fs';
import * as path from 'path';

export const maxDuration = 300;

async function withRetry<T>(label: string, fn: () => Promise<T | null>, attempts = 3): Promise<T | null> {
  const backoff = [2000, 5000, 10000];
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      console.log(`[${label}] attempt ${i}/${attempts}`);
      const result = await fn();
      if (result !== null) return result;
      console.warn(`[${label}] attempt ${i} returned null`);
    } catch (err) {
      lastErr = err;
      console.warn(`[${label}] attempt ${i} failed:`, (err as Error).message);
    }
    if (i < attempts) await new Promise(r => setTimeout(r, backoff[i - 1]));
  }
  console.error(`[${label}] ALL ${attempts} attempts failed. Proceeding without.`, (lastErr as Error)?.message);
  return null;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookId } = await req.json();
    if (!bookId) return NextResponse.json({ error: 'bookId is required' }, { status: 400 });

    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .eq('user_id', user.id)
      .single();

    if (bookError || !book) {
      console.error('[generate-cover] Book fetch failed:', { bookId, bookError });
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const bookMeta = (book.metadata || {}) as Record<string, unknown>;

    // Resolve chosen style from metadata
    const rawStyleKey = (bookMeta.style_key as string) || (bookMeta.styleKey as string);
    const validKeys = ART_STYLE_KEYS as string[];
    const styleKey = (rawStyleKey && validKeys.includes(rawStyleKey) ? rawStyleKey : 'watercolor') as ArtStyleKey;
    if (rawStyleKey && !validKeys.includes(rawStyleKey)) {
      console.warn('[generate-cover] Invalid styleKey, defaulting to watercolor:', rawStyleKey);
    }
    console.log('[generate-cover] Generating single cover in style:', styleKey);

    // Build character description with gender lock
    const childProfile = (bookMeta.child_profile as Record<string, unknown>) || {};
    const profileGender = (childProfile.gender as string) || (bookMeta.childGender as string) || 'male';
    const childGender = profileGender === 'boy' ? 'male' : profileGender === 'girl' ? 'female' : profileGender;

    const photoDescription = (bookMeta.character_description as string) || '';
    const storyBible = (bookMeta.character_bible as string) || '';

    const genderLock = childGender === 'female'
      ? `THIS CHARACTER IS A GIRL — feminine face, feminine features. NOT a boy. The character is FEMALE. ${book.child_name} is a girl.`
      : childGender === 'male'
      ? `THIS CHARACTER IS A BOY — masculine face, masculine features. NOT a girl. The character is MALE. ${book.child_name} is a boy.`
      : `${book.child_name} is a child.`;

    const fallbackDescription = childGender === 'female'
      ? `A ${book.child_age}-year-old girl named ${book.child_name}. She is clearly female with feminine facial features, feminine hair, and feminine body proportions.`
      : childGender === 'male'
      ? `A ${book.child_age}-year-old boy named ${book.child_name}. He is clearly male with masculine facial features, short masculine hair, and masculine body proportions.`
      : `A ${book.child_age}-year-old child named ${book.child_name}.`;

    const characterDescription = [genderLock, photoDescription || fallbackDescription, storyBible].filter(Boolean).join('\n\n');

    const rawThemeDescription = (bookMeta.themeSlug as string) || 'adventure';
    const themeDescription = storyBible ? `${storyBible}\n\n${rawThemeDescription}` : rawThemeDescription;

    console.log('[generate-cover] GENDER LOCK:', {
      bookId, gender: childGender,
      photoDescLength: photoDescription.length,
      storyBibleLength: storyBible.length,
    });

    // Load child photo
    let childPhotoBase64: string | undefined;
    const { data: photos } = await supabase
      .from('photos')
      .select('storage_path')
      .eq('book_id', bookId)
      .eq('label', 'child')
      .limit(1);

    if (photos?.[0]) {
      try {
        childPhotoBase64 = await getImageBase64('photos', photos[0].storage_path);
        console.log('[generate-cover] Child photo loaded, length:', childPhotoBase64.length);
      } catch (err) {
        console.warn('[generate-cover] Could not load child photo:', err);
      }
    }

    // Load style preview PNG
    let stylePreviewBase64: string | undefined;
    try {
      const previewPath = path.join(process.cwd(), 'public', 'images', 'styles', `${styleKey}.png`);
      if (fs.existsSync(previewPath)) {
        const buffer = fs.readFileSync(previewPath);
        stylePreviewBase64 = buffer.toString('base64');
        console.log('[generate-cover] Style preview loaded:', { styleKey, sizeKB: Math.round(buffer.length / 1024) });
      } else {
        console.warn('[generate-cover] Style preview not found:', previewPath);
      }
    } catch (err) {
      console.warn('[generate-cover] Failed to load style preview:', err);
    }

    // Generate ONE cover — Tier 1: Gemini, Tier 2: FLUX.2 Pro fallback
    const refsInfo = {
      photo: { present: !!childPhotoBase64, sizeKB: childPhotoBase64 ? Math.round(childPhotoBase64.length * 3 / 4 / 1024) : 0 },
      stylePreview: { present: !!stylePreviewBase64, sizeKB: stylePreviewBase64 ? Math.round(stylePreviewBase64.length * 3 / 4 / 1024) : 0 },
    };

    function isRetryable(err: unknown): boolean {
      if (!(err instanceof Error)) return false;
      const msg = err.message.toLowerCase();
      return ['503','429','500','502','504','529','timeout','unavailable','overload','high demand','econnreset','etimedout','fetch failed'].some(s => msg.includes(s));
    }

    let coverResult: GenerationResult | null = null;
    let chosenModel: 'gemini' | 'flux' = 'gemini';
    let lastCoverError: Error | null = null;

    // --- Tier 1: Gemini (2 short attempts) ---
    const GEMINI_ATTEMPTS = 2;
    const GEMINI_BACKOFF = [3000, 8000];
    for (let attempt = 1; attempt <= GEMINI_ATTEMPTS; attempt++) {
      const attemptStart = Date.now();
      try {
        console.log(`[generate-cover] Gemini attempt ${attempt}/${GEMINI_ATTEMPTS}`);
        coverResult = await generateCoverImage({ styleKey, bookTitle: book.title, characterDescription, themeDescription, childPhotoBase64, stylePreviewBase64 });
        chosenModel = 'gemini';
        await logGeneration({ bookId, imageType: 'cover', styleKey, modelAttempted: PRIMARY_MODEL, modelUsed: coverResult.modelUsed, fallbackTriggered: false, referencesAttached: refsInfo, promptLength: characterDescription.length, durationMs: Date.now() - attemptStart, retryCount: attempt - 1, success: true });
        console.log(`[generate-cover] Gemini attempt ${attempt} succeeded`);
        break;
      } catch (err) {
        lastCoverError = err instanceof Error ? err : new Error(String(err));
        await logGeneration({ bookId, imageType: 'cover', styleKey, modelAttempted: PRIMARY_MODEL, modelUsed: 'none', fallbackTriggered: false, referencesAttached: refsInfo, promptLength: characterDescription.length, durationMs: Date.now() - attemptStart, retryCount: attempt - 1, success: false, errorMessage: lastCoverError.message });
        console.warn(`[generate-cover] Gemini attempt ${attempt} failed: ${lastCoverError.message} (retryable: ${isRetryable(err)})`);
        if (!isRetryable(err) || attempt === GEMINI_ATTEMPTS) break;
        await new Promise(r => setTimeout(r, GEMINI_BACKOFF[attempt - 1]));
      }
    }

    // --- Tier 2: FLUX.2 Pro fallback (off-Google) ---
    if (!coverResult) {
      console.warn('[generate-cover] Gemini exhausted. Falling back to FLUX.2 Pro.');
      const FLUX_ATTEMPTS = 2;
      for (let attempt = 1; attempt <= FLUX_ATTEMPTS; attempt++) {
        const attemptStart = Date.now();
        try {
          console.log(`[generate-cover] FLUX attempt ${attempt}/${FLUX_ATTEMPTS}`);
          const fluxRefs: ReferenceImage[] = [];
          if (childPhotoBase64) fluxRefs.push({ base64: childPhotoBase64, mimeType: 'image/jpeg', role: 'photo' });
          if (stylePreviewBase64) fluxRefs.push({ base64: stylePreviewBase64, role: 'style_preview' });
          const style = ART_STYLES[styleKey];
          const fluxPrompt = `${characterDescription}\n\nSCENE: A magical, warm cover scene for: ${themeDescription}\n\nART STYLE: ${style.stylePrompt}\n\n${ANTI_TEXT_RULES}`;
          const fb = await generateImageWithFlux2Pro(fluxPrompt, { aspectRatio: 'portrait_4_3', referenceImages: fluxRefs });
          coverResult = { buffer: fb, modelUsed: FALLBACK_MODEL };
          chosenModel = 'flux';
          await logGeneration({ bookId, imageType: 'cover', styleKey, modelAttempted: FALLBACK_MODEL, modelUsed: FALLBACK_MODEL, fallbackTriggered: true, fallbackReason: 'Gemini exhausted', referencesAttached: refsInfo, promptLength: fluxPrompt.length, durationMs: Date.now() - attemptStart, retryCount: attempt - 1, success: true });
          console.log(`[generate-cover] FLUX attempt ${attempt} succeeded`);
          break;
        } catch (err) {
          lastCoverError = err instanceof Error ? err : new Error(String(err));
          await logGeneration({ bookId, imageType: 'cover', styleKey, modelAttempted: FALLBACK_MODEL, modelUsed: 'none', fallbackTriggered: true, referencesAttached: refsInfo, promptLength: 0, durationMs: Date.now() - attemptStart, retryCount: attempt - 1, success: false, errorMessage: lastCoverError.message });
          console.warn(`[generate-cover] FLUX attempt ${attempt} failed: ${lastCoverError.message}`);
          if (attempt < FLUX_ATTEMPTS) await new Promise(r => setTimeout(r, 5000));
        }
      }
    }

    // --- Both tiers failed → fallback_exhausted ---
    if (!coverResult) {
      console.error('[generate-cover] BOTH Gemini and FLUX failed. fallback_exhausted.');
      const { data: metaRead } = await supabase.from('books').select('metadata').eq('id', bookId).limit(1);
      await supabase.from('books').update({
        status: 'failed',
        metadata: { ...((metaRead?.[0]?.metadata as Record<string, unknown>) || {}), failure_reason: 'fallback_exhausted', failure_stage: 'cover', failure_detail: lastCoverError?.message || 'unknown' },
      }).eq('id', bookId);
      try { await triggerFailureEmail(bookId); } catch { /* non-fatal */ }
      return NextResponse.json({ error: 'Cover generation failed on all models', bookFailed: true }, { status: 500 });
    }

    // --- Persist model lock so pages use the same model ---
    const { data: lockRead } = await supabase.from('books').select('metadata').eq('id', bookId).limit(1);
    await supabase.from('books').update({
      metadata: { ...((lockRead?.[0]?.metadata as Record<string, unknown>) || {}), illustration_model: chosenModel },
    }).eq('id', bookId);
    console.log(`[generate-cover] Book locked to model: ${chosenModel}`);

    const storagePath = `${bookId}/cover-${styleKey}.png`;
    const imageUrl = await uploadImage('covers', storagePath, coverResult.buffer);

    const { data: cover, error: coverError } = await supabase
      .from('cover_options')
      .insert({
        book_id: bookId,
        style_name: styleKey,
        image_url: imageUrl,
        style_prompt: ART_STYLES[styleKey].stylePrompt,
        is_selected: true,
      })
      .select()
      .single();

    if (coverError) {
      console.error('[generate-cover] Failed to save cover:', coverError);
      return NextResponse.json({ error: 'Failed to save cover' }, { status: 500 });
    }

    console.log('[generate-cover] Single cover generated and auto-selected:', { coverId: cover.id, styleKey });

    // Extract Visual Bible from cover (non-blocking — book still generates if this fails)
    try {
      const { data: pages } = await supabase
        .from('pages')
        .select('text_content')
        .eq('book_id', bookId)
        .order('page_number');

      const storyText = pages?.map(p => p.text_content).join(' ') || '';

      // Extract supporting character names from the character_bible text
      const supportingCharacters: string[] = [];
      if (storyBible) {
        const nameMatches = storyBible.match(/(?:^|\.\s+)([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+is\b/g);
        if (nameMatches) {
          for (const m of nameMatches) {
            const name = m.replace(/^\.\s*/, '').replace(/\s+is$/, '').trim();
            if (name !== book.child_name) supportingCharacters.push(name);
          }
        }
      }

      const coverBase64 = coverResult.buffer.toString('base64');
      const visualBible = await withRetry('visual-bible', () => extractVisualBible(coverBase64, {
        protagonistName: book.child_name,
        supportingCharacters,
        storyText,
      }));

      if (visualBible) {
        const { data: currentBook } = await supabase
          .from('books')
          .select('metadata')
          .eq('id', bookId)
          .single();
        const existingMeta = (currentBook?.metadata as Record<string, unknown>) || {};
        await supabase
          .from('books')
          .update({ metadata: { ...existingMeta, visual_bible: visualBible } })
          .eq('id', bookId);
        console.log('[generate-cover] Visual Bible saved to metadata');
      } else {
        console.warn('[generate-cover] Visual Bible extraction returned null, continuing without');
      }
    } catch (bibleErr) {
      console.error('[generate-cover] Visual Bible extraction error (non-fatal):', bibleErr);
    }

    // Extract character crops from cover (non-blocking)
    try {
      // Re-read metadata to get the visual_bible we just saved
      const { data: updatedBook } = await supabase
        .from('books')
        .select('metadata')
        .eq('id', bookId)
        .single();
      const updatedMeta = (updatedBook?.metadata as Record<string, unknown>) || {};
      const vb = updatedMeta.visual_bible as { protagonist?: { name?: string }; supportingCharacters?: Array<{ name: string; hair?: string }> } | undefined;

      const characterList = [book.child_name];
      if (vb?.supportingCharacters) {
        for (const sc of vb.supportingCharacters) {
          if (sc.name && sc.hair !== 'not visible on cover') {
            characterList.push(sc.name);
          }
        }
      }

      const coverBase64ForCrop = coverResult.buffer.toString('base64');
      const boxes = await withRetry('bounding-boxes', () => extractCharacterBoundingBoxes(coverBase64ForCrop, characterList));
      const crops = boxes ? await cropAndUploadCharacters(coverResult.buffer, boxes, bookId) : [];

      if (crops.length > 0) {
        const cropMeta = crops.map(c => ({ name: c.name, storagePath: c.storagePath, publicUrl: c.publicUrl }));
        const { data: metaBook } = await supabase.from('books').select('metadata').eq('id', bookId).single();
        const existMeta = (metaBook?.metadata as Record<string, unknown>) || {};
        await supabase.from('books').update({ metadata: { ...existMeta, character_crops: cropMeta } }).eq('id', bookId);
        console.log('[generate-cover] Character crops saved:', crops.length);
      }
    } catch (cropErr) {
      console.error('[generate-cover] Character cropping error (non-fatal):', cropErr);
    }

    return NextResponse.json({ covers: [cover] });
  } catch (err) {
    console.error('[generate-cover] Unhandled error:', err);
    return NextResponse.json({ error: 'Failed to generate cover' }, { status: 500 });
  }
}
