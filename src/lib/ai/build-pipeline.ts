import { createClient } from '@supabase/supabase-js';
import { generateCharacterSheet, generateCoverImage, generatePageIllustration, PRIMARY_MODEL } from './illustration-generator';
import { scoreCharacterMatch } from './character-scorer';
import { uploadImage, getImageBase64, uploadAudio } from '@/lib/supabase/storage';
import { logGeneration } from './generation-logger';
import { extractVisualBible, visualBibleToPromptBlock, type VisualBible } from './visual-bible';
import { extractCharacterBoundingBoxes, cropAndUploadCharacters } from './character-cropper';
import { getElevenLabsClient } from '@/lib/elevenlabs/client';
import { resolveVoiceId, STORYMAGIC_VOICE_SETTINGS, STORYMAGIC_TTS_MODEL } from '@/lib/elevenlabs/voices';
import { checkBookFullyComplete, triggerSuccessEmail, triggerFailureEmail } from '@/lib/email/book-completion-trigger';
import { withTimeout } from './timeout';
import type { ArtStyleKey } from './prompts/style-references';
import * as fs from 'fs';
import * as path from 'path';

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function loadStylePreview(styleKey: string): Promise<string | undefined> {
  // Try filesystem first (works in Next.js API routes)
  try {
    const previewPath = path.join(process.cwd(), 'public', 'images', 'styles', `${styleKey}.png`);
    if (fs.existsSync(previewPath)) return fs.readFileSync(previewPath).toString('base64');
  } catch { /* skip */ }

  // Fallback: fetch from the public URL (works in Trigger.dev worker)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL;
  if (siteUrl) {
    try {
      const base = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
      const res = await fetch(`${base}/images/styles/${styleKey}.png`);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        console.log(`[build-pipeline] Style preview loaded from URL for ${styleKey}`);
        return buf.toString('base64');
      }
    } catch { /* skip */ }
  }

  console.warn(`[build-pipeline] Style preview not available for ${styleKey}`);
  return undefined;
}

function buildCharacterDescription(meta: Record<string, unknown>): string {
  const childProfile = (meta.child_profile as Record<string, unknown>) || {};
  const profileGender = (childProfile.gender as string) || 'male';
  const childGender = profileGender === 'boy' ? 'male' : profileGender === 'girl' ? 'female' : profileGender;
  const photoDescription = (meta.character_description as string) || '';
  const storyBible = (meta.character_bible as string) || '';
  const genderLock = childGender === 'female'
    ? 'THIS CHARACTER IS A GIRL — feminine face, feminine features. NOT a boy. The character is FEMALE.'
    : childGender === 'male'
    ? 'THIS CHARACTER IS A BOY — masculine face, masculine features. NOT a girl. The character is MALE.'
    : '';
  return [genderLock, photoDescription, storyBible].filter(Boolean).join('\n\n');
}

function normalizeGender(meta: Record<string, unknown>): string {
  const childProfile = (meta.child_profile as Record<string, unknown>) || {};
  const g = (childProfile.gender as string) || 'male';
  return g === 'boy' ? 'male' : g === 'girl' ? 'female' : g;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadChildPhotos(supabase: any, bookId: string): Promise<string[]> {
  const photos: string[] = [];
  const { data, error } = await supabase.from('photos').select('storage_path').eq('book_id', bookId).eq('label', 'child').order('created_at', { ascending: true });
  if (error) console.error(`[build-pipeline] Photo query error for ${bookId}:`, error.message);
  console.log(`[build-pipeline] Photo query for ${bookId}: ${(data || []).length} rows found`);
  for (const p of (data || []) as Array<{ storage_path: string }>) {
    try {
      photos.push(await getImageBase64('photos', p.storage_path));
    } catch (err) {
      console.warn(`[build-pipeline] Failed to load photo ${p.storage_path}:`, err instanceof Error ? err.message : err);
    }
  }
  return photos;
}

export interface BuildProgress {
  stage: string;
  detail?: string;
}

export async function runCharacterSheet(bookId: string, onProgress?: (p: BuildProgress) => void): Promise<string | null> {
  onProgress?.({ stage: 'character_sheet', detail: 'generating' });
  const supabase = getServiceSupabase();
  const { data: book } = await supabase.from('books').select('metadata').eq('id', bookId).limit(1);
  if (!book?.[0]) throw new Error('Book not found');

  const meta = (book[0].metadata || {}) as Record<string, unknown>;
  const styleKey = (meta.style_key as ArtStyleKey) || 'storybook';
  const characterDescription = buildCharacterDescription(meta);
  const childPhotosBase64 = await loadChildPhotos(supabase, bookId);
  const stylePreviewBase64 = await loadStylePreview(styleKey);

  console.log(`[build-pipeline:sheet] Generating for ${bookId}, style: ${styleKey}, photos: ${childPhotosBase64.length}`);

  let result;
  try {
    result = await generateCharacterSheet({ styleKey, characterDescription, childPhotosBase64, stylePreviewBase64 });
  } catch (err) {
    console.warn('[build-pipeline:sheet] Generation failed, skipping:', err instanceof Error ? err.message : err);
    return null;
  }

  if (childPhotosBase64.length > 0) {
    try {
      const match = await scoreCharacterMatch(result.buffer.toString('base64'), childPhotosBase64[0], 'image/png', 'image/jpeg');
      if (!match.scored || (match.score !== null && match.score < 60)) {
        console.log('[build-pipeline:sheet] Below threshold, regenerating once');
        try { result = await generateCharacterSheet({ styleKey, characterDescription, childPhotosBase64, stylePreviewBase64 }); } catch { /* keep first */ }
      }
    } catch { /* keep first */ }
  }

  const storagePath = `character-sheets/${bookId}/sheet.png`;
  await supabase.storage.from('covers').upload(storagePath, result.buffer, { contentType: 'image/png', upsert: true });
  const { data: urlData } = supabase.storage.from('covers').getPublicUrl(storagePath);
  const sheetUrl = urlData?.publicUrl || '';

  const { data: freshBook } = await supabase.from('books').select('metadata').eq('id', bookId).limit(1);
  const freshMeta = (freshBook?.[0]?.metadata || {}) as Record<string, unknown>;
  await supabase.from('books').update({ metadata: { ...freshMeta, character_sheet_url: sheetUrl, character_sheet_model: result.modelUsed } }).eq('id', bookId);

  console.log(`[build-pipeline:sheet] Done. URL: ${sheetUrl.substring(0, 60)}...`);
  return sheetUrl;
}

export async function runCoverGeneration(bookId: string, onProgress?: (p: BuildProgress) => void): Promise<void> {
  onProgress?.({ stage: 'cover', detail: 'generating' });
  const supabase = getServiceSupabase();
  const { data: bookData } = await supabase.from('books').select('*').eq('id', bookId).limit(1);
  if (!bookData?.[0]) throw new Error('Book not found');
  const book = bookData[0];
  const meta = (book.metadata || {}) as Record<string, unknown>;
  const styleKey = (meta.style_key as ArtStyleKey) || 'storybook';
  const characterDescription = buildCharacterDescription(meta);
  const childPhotosBase64 = await loadChildPhotos(supabase, bookId);
  const childPhotoBase64 = childPhotosBase64[0];
  const stylePreviewBase64 = await loadStylePreview(styleKey);

  let characterSheetBase64: string | undefined;
  try { characterSheetBase64 = await getImageBase64('covers', `character-sheets/${bookId}/sheet.png`); } catch { /* skip */ }

  const themeDescription = (meta.main_theme as string) || (meta.key_message as string) || book.title;

  console.log(`[build-pipeline:cover] Generating for ${bookId}, style: ${styleKey}, photos: ${childPhotosBase64.length}, sheet: ${!!characterSheetBase64}`);
  await supabase.from('books').update({ status: 'generating', cover_style: styleKey }).eq('id', bookId);

  const coverResult = await generateCoverImage({ styleKey, bookTitle: book.title, characterDescription, themeDescription, childPhotoBase64, childPhotosBase64, characterSheetBase64, stylePreviewBase64 });

  const storagePath = `${bookId}/cover-${styleKey}.png`;
  const imageUrl = await uploadImage('covers', storagePath, coverResult.buffer);

  // Clear any existing cover_options for this book before inserting (retry-safe)
  await supabase.from('cover_options').delete().eq('book_id', bookId);
  const { error: coverInsertError } = await supabase.from('cover_options').insert({ book_id: bookId, style_name: styleKey, image_url: imageUrl, is_selected: true });
  if (coverInsertError) console.error(`[build-pipeline:cover] Cover insert error:`, coverInsertError.message);
  else console.log(`[build-pipeline:cover] Cover saved, is_selected=true`);

  const lockMeta = ((await supabase.from('books').select('metadata').eq('id', bookId).limit(1)).data?.[0]?.metadata || {}) as Record<string, unknown>;
  await supabase.from('books').update({ metadata: { ...lockMeta, illustration_model: coverResult.modelUsed } }).eq('id', bookId);

  // Visual bible + character crops (parallel, non-fatal)
  const coverBase64 = coverResult.buffer.toString('base64');
  const childProfile = (meta.child_profile as Record<string, unknown>) || {};
  const protagonistName = (childProfile.name as string) || book.child_name || 'the child';
  const [vbResult, bbResult] = await Promise.allSettled([
    extractVisualBible(coverBase64, { protagonistName, supportingCharacters: [], storyText: '' }).catch(() => null),
    extractCharacterBoundingBoxes(coverBase64, [protagonistName]).catch(() => null),
  ]);

  const visualBible = vbResult.status === 'fulfilled' ? vbResult.value : null;
  const boundingBoxes = bbResult.status === 'fulfilled' ? bbResult.value : null;

  if (visualBible || boundingBoxes) {
    const vmeta = ((await supabase.from('books').select('metadata').eq('id', bookId).limit(1)).data?.[0]?.metadata || {}) as Record<string, unknown>;
    const updates: Record<string, unknown> = { ...vmeta };
    if (visualBible) updates.visual_bible = visualBible;
    if (boundingBoxes) {
      updates.character_bounding_boxes = boundingBoxes;
      try {
        const crops = await cropAndUploadCharacters(coverResult.buffer, boundingBoxes, bookId);
        if (crops.length > 0) updates.character_crops = crops.map(c => ({ name: c.name, storagePath: c.storagePath }));
      } catch { /* skip */ }
    }
    await supabase.from('books').update({ metadata: updates }).eq('id', bookId);
  }

  await logGeneration({ bookId, imageType: 'cover', styleKey, modelAttempted: PRIMARY_MODEL, modelUsed: coverResult.modelUsed, fallbackTriggered: coverResult.modelUsed !== PRIMARY_MODEL, referencesAttached: {}, promptLength: characterDescription.length, durationMs: 0, retryCount: 0, success: true });
  console.log(`[build-pipeline:cover] Done. Model: ${coverResult.modelUsed}`);
}

export async function runIllustrations(bookId: string, onProgress?: (p: BuildProgress) => void): Promise<void> {
  onProgress?.({ stage: 'illustrations', detail: 'generating' });
  const supabase = getServiceSupabase();
  const { data: bookData } = await supabase.from('books').select('*, pages(*)').eq('id', bookId).limit(1);
  if (!bookData?.[0]) throw new Error('Book not found');
  const book = bookData[0];
  const meta = (book.metadata || {}) as Record<string, unknown>;
  const styleKey = (meta.style_key as ArtStyleKey) || 'storybook';
  const characterDescription = buildCharacterDescription(meta);
  const characterBible = (meta.character_bible as string) || '';
  const childPhotosBase64 = await loadChildPhotos(supabase, bookId);
  const childPhotoBase64 = childPhotosBase64[0];
  const stylePreviewBase64 = await loadStylePreview(styleKey);
  const normalizedGender = normalizeGender(meta);

  let characterSheetBase64: string | undefined;
  try { characterSheetBase64 = await getImageBase64('covers', `character-sheets/${bookId}/sheet.png`); } catch { /* skip */ }

  const { data: selectedCover } = await supabase.from('cover_options').select('image_url').eq('book_id', bookId).eq('is_selected', true).limit(1);
  let coverImageBase64: string | undefined;
  if (selectedCover?.[0]?.image_url) {
    const coverPath = `${bookId}/cover-${styleKey}.png`;
    try {
      coverImageBase64 = await getImageBase64('covers', coverPath);
      console.log(`[build-pipeline:illustrations] Cover loaded from ${coverPath}`);
    } catch (err) {
      console.warn(`[build-pipeline:illustrations] Cover load failed for ${coverPath}:`, err instanceof Error ? err.message : err);
    }
  } else {
    console.warn(`[build-pipeline:illustrations] No selected cover found for ${bookId}`);
  }

  const visualBible = meta.visual_bible as VisualBible | undefined;
  const visualBibleBlock = visualBible ? visualBibleToPromptBlock(visualBible) : undefined;
  let characterCrops: Array<{ name: string; base64: string }> | undefined;
  const cropsMeta = meta.character_crops as Array<{ name: string; storagePath: string }> | undefined;
  if (cropsMeta) {
    characterCrops = [];
    for (const c of cropsMeta) {
      try { characterCrops.push({ name: c.name, base64: await getImageBase64('covers', c.storagePath) }); } catch { /* skip */ }
    }
  }

  const pages = ((book.pages || []) as Array<{ id: string; page_number: number; illustration_prompt: string | null; mood: string | null }>)
    .sort((a, b) => a.page_number - b.page_number);

  console.log(`[build-pipeline:illustrations] ${pages.length} pages for ${bookId}, refs: photo=${!!childPhotoBase64} photos=${childPhotosBase64.length} cover=${!!coverImageBase64} style=${!!stylePreviewBase64} sheet=${!!characterSheetBase64} crops=${characterCrops?.length || 0}`);

  const IDENTITY_MIN_SCORE = parseInt(process.env.IDENTITY_MIN_SCORE || '70', 10);
  const IDENTITY_MAX_RETRIES = parseInt(process.env.IDENTITY_MAX_RETRIES || '2', 10);

  let previousPageBase64: string | undefined;

  for (const page of pages) {
    await supabase.from('pages').update({ illustration_status: 'generating' }).eq('id', page.id);
    onProgress?.({ stage: 'illustrations', detail: `page ${page.page_number}/${pages.length}` });

    const rawPrompt = page.illustration_prompt || `Scene for page ${page.page_number}`;
    const illustrationPrompt = characterBible ? `${characterBible}\n\n${rawPrompt}` : rawPrompt;

    let bestResult: { buffer: Buffer; modelUsed: string; score: number } | null = null;
    let lastMismatches: string[] = [];

    for (let attempt = 0; attempt <= IDENTITY_MAX_RETRIES; attempt++) {
      const retryPrompt = attempt > 0 && lastMismatches.length > 0
        ? `${illustrationPrompt}\n\nIMPORTANT — Previous identity mismatches: ${lastMismatches.join('; ')}. Match the character sheet EXACTLY.`
        : illustrationPrompt;

      try {
        const genResult = await generatePageIllustration({
          styleKey, characterDescription, illustrationPrompt: retryPrompt, mood: page.mood || 'happy',
          pageNumber: page.page_number, childPhotoBase64, childPhotosBase64, characterSheetBase64,
          coverImageBase64, stylePreviewBase64, visualBibleBlock, characterCrops, previousPageBase64,
        });

        let score = 80;
        if (characterSheetBase64) {
          const match = await scoreCharacterMatch(genResult.buffer.toString('base64'), characterSheetBase64);
          score = match.score ?? 0;
          lastMismatches = match.mismatches;
        }
        if (!bestResult || score > bestResult.score) bestResult = { ...genResult, score };
        if (score >= IDENTITY_MIN_SCORE) break;
      } catch (err) {
        console.warn(`[build-pipeline:illustrations] Page ${page.page_number} attempt ${attempt + 1} failed:`, err instanceof Error ? err.message : err);
        if (attempt === IDENTITY_MAX_RETRIES) break;
      }
    }

    if (bestResult) {
      const storagePath = `${bookId}/page-${page.page_number}.png`;
      const imageUrl = await uploadImage('illustrations', storagePath, bestResult.buffer);
      await supabase.from('pages').update({ illustration_url: imageUrl, illustration_status: 'complete' }).eq('id', page.id);
      previousPageBase64 = bestResult.buffer.toString('base64');
      await logGeneration({ bookId, imageType: 'page', pageNumber: page.page_number, styleKey, modelAttempted: PRIMARY_MODEL, modelUsed: bestResult.modelUsed, fallbackTriggered: bestResult.modelUsed !== PRIMARY_MODEL, referencesAttached: {}, durationMs: 0, retryCount: 0, success: true });
    } else {
      await supabase.from('pages').update({ illustration_status: 'error' }).eq('id', page.id);
      console.error(`[build-pipeline:illustrations] Page ${page.page_number} failed all attempts`);
    }
  }

  console.log(`[build-pipeline:illustrations] Done for ${bookId}`);
}

export async function runNarration(bookId: string, onProgress?: (p: BuildProgress) => void): Promise<void> {
  onProgress?.({ stage: 'narration', detail: 'generating' });
  const supabase = getServiceSupabase();
  const { data: bookData } = await supabase.from('books').select('*, pages(*)').eq('id', bookId).limit(1);
  if (!bookData?.[0]) throw new Error('Book not found');
  const book = bookData[0];
  const meta = (book.metadata || {}) as Record<string, unknown>;
  const voiceId = (meta.narrator_voice_id as string) || undefined;
  const language = (meta.language as string) || 'en';

  const effectiveVoiceId = resolveVoiceId(voiceId || 'warm-female');
  const model = STORYMAGIC_TTS_MODEL;
  const voiceSettings = STORYMAGIC_VOICE_SETTINGS;

  const elevenlabs = getElevenLabsClient();

  const pages = ((book.pages || []) as Array<{ id: string; page_number: number; text_content: string }>)
    .sort((a, b) => a.page_number - b.page_number);

  console.log(`[build-pipeline:narration] ${pages.length} pages for ${bookId}, voice: ${effectiveVoiceId}`);

  for (const page of pages) {
    onProgress?.({ stage: 'narration', detail: `page ${page.page_number}/${pages.length}` });
    try {
      const textToNarrate = page.text_content;
      if (!textToNarrate?.trim()) continue;

      const chunks: Buffer[] = [];
      await withTimeout((async () => {
        const audioStream = await elevenlabs.textToSpeech.convert(effectiveVoiceId, { text: textToNarrate, modelId: model, voiceSettings });
        const reader = audioStream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(Buffer.from(value));
        }
      })(), 60_000, `ElevenLabs TTS page ${page.page_number}`);

      const audioBuffer = Buffer.concat(chunks);
      const durationMs = Math.round((audioBuffer.length / 16000) * 1000);
      const storagePath = `${bookId}/page-${page.page_number}-${Date.now()}.mp3`;
      const audioUrl = await uploadAudio('audio', storagePath, audioBuffer);
      await supabase.from('pages').update({ narration_url: audioUrl, narration_duration_ms: durationMs }).eq('id', page.id);
      console.log(`[build-pipeline:narration] Page ${page.page_number} done, ${durationMs}ms`);
    } catch (err) {
      console.error(`[build-pipeline:narration] Page ${page.page_number} failed:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`[build-pipeline:narration] Done for ${bookId}`);
}

export async function runFullBuild(bookId: string, onProgress?: (p: BuildProgress) => void): Promise<void> {
  const supabase = getServiceSupabase();

  try {
    await supabase.from('books').update({ status: 'generating' }).eq('id', bookId);

    await runCharacterSheet(bookId, onProgress);
    await runCoverGeneration(bookId, onProgress);

    // Pages + narration in parallel
    await Promise.all([
      runIllustrations(bookId, onProgress),
      runNarration(bookId, onProgress),
    ]);

    await supabase.from('books').update({ status: 'complete' }).eq('id', bookId);
    try { await checkBookFullyComplete(bookId); } catch { /* non-fatal */ }
    try { await triggerSuccessEmail(bookId); } catch { /* non-fatal */ }

    console.log(`[build-pipeline] Book ${bookId} complete`);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(`[build-pipeline] Book ${bookId} FAILED:`, error.message);
    const { data: metaRead } = await supabase.from('books').select('metadata').eq('id', bookId).limit(1);
    await supabase.from('books').update({
      status: 'failed',
      metadata: { ...((metaRead?.[0]?.metadata as Record<string, unknown>) || {}), failure_reason: 'build_pipeline_error', failure_stage: 'build', failure_detail: error.message },
    }).eq('id', bookId);
    try { await triggerFailureEmail(bookId); } catch { /* non-fatal */ }
    throw error;
  }
}
