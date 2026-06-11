import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getImageBase64 } from '@/lib/supabase/storage';
import { generateCharacterSheet } from '@/lib/ai/illustration-generator';
import type { ArtStyleKey } from '@/lib/ai/prompts/style-references';

export const maxDuration = 120;

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

    // Generate sheet (attempt 1)
    let result = await generateCharacterSheet({ styleKey, characterDescription, childPhotosBase64, stylePreviewBase64 });

    // Light quality gate: quick identity check via Gemini Flash
    if (childPhotosBase64.length > 0) {
      const passesCheck = await quickIdentityCheck(childPhotosBase64[0], result.buffer.toString('base64'));
      if (!passesCheck) {
        console.log('[generate-character-sheet] Sheet failed identity check, regenerating once');
        result = await generateCharacterSheet({ styleKey, characterDescription, childPhotosBase64, stylePreviewBase64 });
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
    return NextResponse.json({ error: 'Sheet generation failed' }, { status: 500 });
  }
}

async function quickIdentityCheck(photoBase64: string, sheetBase64: string): Promise<boolean> {
  try {
    const { getGeminiClient } = await import('@/lib/ai/gemini');
    const ai = getGeminiClient();
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: photoBase64 } },
          { inlineData: { mimeType: 'image/png', data: sheetBase64 } },
          { text: 'Image 1 is a photo of a real child. Image 2 is an illustrated character sheet. Does the illustrated character clearly match the child in the photo — same hair color, skin tone, and face shape? Answer with exactly one word: "YES" or "NO".' },
        ],
      }],
    });
    const answer = (res.text || '').trim().toUpperCase();
    console.log(`[character-sheet] Identity check: ${answer}`);
    return answer.startsWith('YES');
  } catch (err) {
    console.warn('[character-sheet] Identity check failed, passing by default:', err);
    return true;
  }
}
