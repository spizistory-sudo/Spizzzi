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

    // Analyze with Gemini Vision
    const description = await analyzeChildPhoto(photoBase64);

    // Save to book metadata
    const { error: updateError } = await supabase
      .from('books')
      .update({
        metadata: { character_description: description },
      })
      .eq('id', bookId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error saving character description:', updateError);
      return NextResponse.json(
        { error: 'Failed to save description' },
        { status: 500 }
      );
    }

    return NextResponse.json({ description });
  } catch (err) {
    console.error('Photo analysis error:', err);
    return NextResponse.json(
      { error: 'Failed to analyze photo' },
      { status: 500 }
    );
  }
}
