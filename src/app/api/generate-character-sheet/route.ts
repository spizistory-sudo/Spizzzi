import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getImageBase64 } from '@/lib/supabase/storage';
import { generateCharacterSheet } from '@/lib/ai/illustration-generator';
import { scoreCharacterMatch } from '@/lib/ai/character-scorer';
import { withTimeout } from '@/lib/ai/timeout';
import type { ArtStyleKey } from '@/lib/ai/prompts/style-references';

export const maxDuration = 300;

const SHEET_TIMEOUT_MS = 60_000;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookId } = await req.json();
    if (!bookId) return NextResponse.json({ error: 'Missing bookId' }, { status: 400 });

    const { data: book } = await supabase
      .from('books')
      .select('metadata')
      .eq('id', bookId)
      .limit(1);

    if (!book?.[0]) return NextResponse.json({ error: 'Book not found' }, { status: 404 });

    const meta = (book[0].metadata || {}) as Record<string, unknown>;
    const styleKey = (meta.style_key as ArtStyleKey) || 'storybook';
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

    const characterDescription = [genderLock, photoDescription, storyBible].filter(Boolean).join('\n\n');

    // Load all child photos
    const childPhotosBase64: string[] = [];
    const { data: photos } = await supabase
      .from('photos')
      .select('storage_path')
      .eq('book_id', bookId)
      .eq('label', 'child')
      .order('created_at', { ascending: true });

    for (const photo of photos || []) {
      try {
        childPhotosBase64.push(await getImageBase64('photos', photo.storage_path));
      } catch { /* skip */ }
    }

    // Load style preview
    const fs = await import('fs');
    const path = await import('path');
    let stylePreviewBase64: string | undefined;
    try {
      const previewPath = path.join(process.cwd(), 'public', 'images', 'styles', `${styleKey}.png`);
      if (fs.existsSync(previewPath)) {
        stylePreviewBase64 = fs.readFileSync(previewPath).toString('base64');
      }
    } catch { /* skip */ }

    console.log(`[generate-character-sheet] Generating for book ${bookId}, style: ${styleKey}, photos: ${childPhotosBase64.length}`);

    // Generate sheet with internal timeout (fail fast, don't hit gateway 504)
    let result;
    try {
      result = await withTimeout(
        generateCharacterSheet({ styleKey, characterDescription, childPhotosBase64, stylePreviewBase64 }),
        SHEET_TIMEOUT_MS,
        'Character sheet generation',
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[generate-character-sheet] First attempt failed: ${msg}`);
      return NextResponse.json({ error: 'Sheet generation timed out or failed', skipped: true }, { status: 200 });
    }

    // Quality gate: score against photo, retry ONCE only if score is low (NOT on timeout)
    if (childPhotosBase64.length > 0) {
      try {
        const match = await withTimeout(
          scoreCharacterMatch(result.buffer.toString('base64'), childPhotosBase64[0], 'image/png', 'image/jpeg'),
          15_000,
          'Character match scoring',
        );
        console.log(`[generate-character-sheet] Sheet scored=${match.scored}, score=${match.score}, mismatches: ${match.mismatches.join(', ') || 'none'}`);
        if (!match.scored || (match.score !== null && match.score < 60)) {
          console.log('[generate-character-sheet] Sheet below threshold (60), regenerating once');
          try {
            const retry = await withTimeout(
              generateCharacterSheet({ styleKey, characterDescription, childPhotosBase64, stylePreviewBase64 }),
              SHEET_TIMEOUT_MS,
              'Character sheet retry',
            );
            result = retry;
          } catch (retryErr) {
            console.warn('[generate-character-sheet] Retry failed, keeping first attempt:', retryErr instanceof Error ? retryErr.message : retryErr);
          }
        }
      } catch (scoreErr) {
        console.warn('[generate-character-sheet] Scoring failed, keeping first attempt:', scoreErr instanceof Error ? scoreErr.message : scoreErr);
      }
    }

    // Upload to storage
    const storagePath = `character-sheets/${bookId}/sheet.png`;
    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: uploadError } = await serviceSupabase.storage
      .from('covers')
      .upload(storagePath, result.buffer, { contentType: 'image/png', upsert: true });

    if (uploadError) {
      console.error('[generate-character-sheet] Upload failed:', uploadError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    const { data: urlData } = serviceSupabase.storage.from('covers').getPublicUrl(storagePath);
    const sheetUrl = urlData?.publicUrl || '';

    // Save URL to book metadata (read-then-merge)
    const { data: freshBook } = await serviceSupabase
      .from('books')
      .select('metadata')
      .eq('id', bookId)
      .limit(1);

    const freshMeta = (freshBook?.[0]?.metadata || {}) as Record<string, unknown>;
    await serviceSupabase
      .from('books')
      .update({ metadata: { ...freshMeta, character_sheet_url: sheetUrl, character_sheet_model: result.modelUsed } })
      .eq('id', bookId);

    console.log(`[generate-character-sheet] Done. Model: ${result.modelUsed}, URL: ${sheetUrl.substring(0, 80)}...`);

    return NextResponse.json({ sheetUrl, modelUsed: result.modelUsed });
  } catch (err) {
    console.error('[generate-character-sheet] Error:', err);
    return NextResponse.json({ error: 'Sheet generation failed', skipped: true }, { status: 200 });
  }
}
