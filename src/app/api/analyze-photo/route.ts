import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeChildPhoto } from '@/lib/ai/photo-analyzer';
import { getImageBase64 } from '@/lib/supabase/storage';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookId, storagePath } = await req.json();
    if (!bookId || !storagePath) {
      return NextResponse.json(
        { error: 'bookId and storagePath are required' },
        { status: 400 }
      );
    }

    // Download the photo and convert to base64
    const photoBase64 = await getImageBase64('photos', storagePath);

    // Analyze with Gemini Vision (with retry + graceful fallback)
    let description: string;
    try {
      description = await analyzeChildPhoto(photoBase64);
    } catch (err: unknown) {
      console.error('[analyze-photo] All retries failed, using fallback:', (err as Error)?.message);
      description = `A child around age 5-8 with a friendly, cheerful expression`;
    }

    // Save to book metadata (merge with existing to preserve other fields)
    const { data: existingBook } = await supabase
      .from('books')
      .select('metadata')
      .eq('id', bookId)
      .eq('user_id', user.id)
      .single();

    const existingMeta = (existingBook?.metadata as Record<string, unknown>) || {};

    const { error: updateError } = await supabase
      .from('books')
      .update({
        metadata: { ...existingMeta, character_description: description },
      })
      .eq('id', bookId)
      .eq('user_id', user.id);

    console.log('[analyze-photo] Update result:', {
      bookId,
      descriptionLength: description.length,
      descriptionPreview: description.substring(0, 100),
      updateError: updateError?.message || null,
    });

    if (updateError) {
      console.error('Error saving character description:', updateError);
      return NextResponse.json(
        { error: 'Failed to save description' },
        { status: 500 }
      );
    }

    // Verify the write persisted
    const { data: verifyBook } = await supabase
      .from('books')
      .select('metadata')
      .eq('id', bookId)
      .single();
    const verifyMeta = (verifyBook?.metadata as Record<string, unknown>) || {};
    console.log('[analyze-photo] Verify after write:', {
      bookId,
      charDescInMetadata: typeof verifyMeta.character_description === 'string' ? (verifyMeta.character_description as string).substring(0, 100) : 'MISSING',
      fullMetaKeys: Object.keys(verifyMeta),
    });

    return NextResponse.json({ description });
  } catch (err) {
    console.error('Photo analysis error:', err);
    return NextResponse.json(
      { error: 'Failed to analyze photo' },
      { status: 500 }
    );
  }
}
