import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCoverImage, PRIMARY_MODEL, type GenerationResult } from '@/lib/ai/illustration-generator';
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

    // Load all child photos
    let childPhotoBase64: string | undefined;
    const childPhotosBase64: string[] = [];
    const { data: photos } = await supabase
      .from('photos')
      .select('storage_path')
      .eq('book_id', bookId)
      .eq('label', 'child')
      .order('created_at', { ascending: true });

    for (const photo of photos || []) {
      try {
        const b64 = await getImageBase64('photos', photo.storage_path);
        childPhotosBase64.push(b64);
      } catch (err) {
        console.warn('[generate-cover] Could not load child photo:', err);
      }
    }
    childPhotoBase64 = childPhotosBase64[0];
    console.log(`[generate-cover] Loaded ${childPhotosBase64.length} child photo(s)`);

    // Load character sheet (generated before cover)
    let characterSheetBase64: string | undefined;
    try {
      characterSheetBase64 = await getImageBase64('covers', `character-sheets/${bookId}/sheet.png`);
      console.log('[generate-cover] Character sheet loaded');
    } catch {
      console.log('[generate-cover] No character sheet found, continuing without');
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

    // generateCoverImage handles the full 3-tier chain (Gemini → GPT Image 2 → FLUX)
    // with internal per-tier timeouts (90s / 75s / 75s = 240s worst case < 300s maxDuration)
    let coverResult: GenerationResult;
    const coverStart = Date.now();
    try {
      coverResult = await generateCoverImage({ styleKey, bookTitle: book.title, characterDescription, themeDescription, childPhotoBase64, childPhotosBase64, characterSheetBase64, stylePreviewBase64 });
      await logGeneration({ bookId, imageType: 'cover', styleKey, modelAttempted: PRIMARY_MODEL, modelUsed: coverResult.modelUsed, fallbackTriggered: coverResult.modelUsed !== PRIMARY_MODEL, referencesAttached: refsInfo, promptLength: characterDescription.length, durationMs: Date.now() - coverStart, retryCount: 0, success: true });
      console.log(`[generate-cover] Cover generated via ${coverResult.modelUsed}`);
    } catch (err) {
      const coverError = err instanceof Error ? err : new Error(String(err));
      console.error('[generate-cover] ALL tiers failed (Gemini/GPT Image 2/FLUX). fallback_exhausted:', coverError.message);
      await logGeneration({ bookId, imageType: 'cover', styleKey, modelAttempted: PRIMARY_MODEL, modelUsed: 'none', fallbackTriggered: true, referencesAttached: refsInfo, promptLength: characterDescription.length, durationMs: Date.now() - coverStart, retryCount: 0, success: false, errorMessage: coverError.message });
      const { data: metaRead } = await supabase.from('books').select('metadata').eq('id', bookId).limit(1);
      await supabase.from('books').update({
        status: 'failed',
        metadata: { ...((metaRead?.[0]?.metadata as Record<string, unknown>) || {}), failure_reason: 'fallback_exhausted', failure_stage: 'cover', failure_detail: coverError.message },
      }).eq('id', bookId);
      try { await triggerFailureEmail(bookId); } catch { /* non-fatal */ }
      return NextResponse.json({ error: 'Cover generation failed on all models', bookFailed: true }, { status: 500 });
    }

    // --- Persist model lock so pages use the same model ---
    const { data: lockRead } = await supabase.from('books').select('metadata').eq('id', bookId).limit(1);
    await supabase.from('books').update({
      metadata: { ...((lockRead?.[0]?.metadata as Record<string, unknown>) || {}), illustration_model: coverResult.modelUsed },
    }).eq('id', bookId);
    console.log(`[generate-cover] Book locked to model: ${coverResult.modelUsed}`);

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

      // Build character list for crops (protagonist + supporting from story bible)
      const characterList = [book.child_name];
      if (storyBible) {
        const nameMatches2 = storyBible.match(/(?:^|\.\s+)([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+is\b/g);
        if (nameMatches2) {
          for (const m of nameMatches2) {
            const name = m.replace(/^\.\s*/, '').replace(/\s+is$/, '').trim();
            if (name !== book.child_name && !characterList.includes(name)) characterList.push(name);
          }
        }
      }

      // Run bible + crops in PARALLEL (independent, each with retry)
      const bibleStart = Date.now();
      const cropsStart = Date.now();

      const [bibleResult, cropsResult] = await Promise.allSettled([
        withRetry('visual-bible', () => extractVisualBible(coverBase64, {
          protagonistName: book.child_name,
          supportingCharacters,
          storyText,
        })),
        withRetry('bounding-boxes', () => extractCharacterBoundingBoxes(coverBase64, characterList))
          .then(async (boxes) => {
            if (!boxes) return [];
            return cropAndUploadCharacters(coverResult.buffer, boxes, bookId);
          }),
      ]);

      // Log bible outcome
      const bibleSuccess = bibleResult.status === 'fulfilled' && bibleResult.value !== null;
      await logGeneration({
        bookId, imageType: 'cover' as const, styleKey,
        modelAttempted: 'gemini-2.5-flash', modelUsed: 'gemini-2.5-flash',
        fallbackTriggered: false, referencesAttached: {},
        durationMs: Date.now() - bibleStart, retryCount: 0,
        success: bibleSuccess,
        errorMessage: !bibleSuccess ? (bibleResult.status === 'rejected' ? (bibleResult.reason as Error)?.message : 'returned null') : undefined,
      });

      // Save bible to metadata if successful
      const visualBible = bibleResult.status === 'fulfilled' ? bibleResult.value : null;
      if (visualBible) {
        const { data: bMeta } = await supabase.from('books').select('metadata').eq('id', bookId).single();
        await supabase.from('books').update({
          metadata: { ...((bMeta?.metadata as Record<string, unknown>) || {}), visual_bible: visualBible },
        }).eq('id', bookId);
        console.log('[generate-cover] Visual Bible saved to metadata');
      } else {
        console.error('[generate-cover] Visual Bible MISSING after all retries — pages will skip verification');
      }

      // Log crops outcome
      const crops = cropsResult.status === 'fulfilled' ? (cropsResult.value as Awaited<ReturnType<typeof cropAndUploadCharacters>>) : [];
      await logGeneration({
        bookId, imageType: 'cover' as const, styleKey,
        modelAttempted: 'gemini-2.5-flash', modelUsed: 'gemini-2.5-flash',
        fallbackTriggered: false, referencesAttached: {},
        durationMs: Date.now() - cropsStart, retryCount: 0,
        success: crops.length > 0,
        errorMessage: crops.length === 0 ? (cropsResult.status === 'rejected' ? (cropsResult.reason as Error)?.message : 'no crops produced') : undefined,
      });

      // Save crops to metadata if successful
      if (crops.length > 0) {
        const cropMeta = crops.map((c: { name: string; storagePath: string; publicUrl: string }) => ({ name: c.name, storagePath: c.storagePath, publicUrl: c.publicUrl }));
        const { data: cMeta } = await supabase.from('books').select('metadata').eq('id', bookId).single();
        await supabase.from('books').update({
          metadata: { ...((cMeta?.metadata as Record<string, unknown>) || {}), character_crops: cropMeta },
        }).eq('id', bookId);
        console.log('[generate-cover] Character crops saved:', crops.length);
      } else {
        console.error('[generate-cover] Character crops MISSING after all retries');
      }
    } catch (extractErr) {
      console.error('[generate-cover] Bible/crops extraction error (non-fatal):', extractErr);
    }

    return NextResponse.json({ covers: [cover] });
  } catch (err) {
    console.error('[generate-cover] Unhandled error:', err);
    return NextResponse.json({ error: 'Failed to generate cover' }, { status: 500 });
  }
}
