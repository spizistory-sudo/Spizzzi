import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const bookId = searchParams.get('bookId');

    if (!bookId) {
      return NextResponse.json({ error: 'bookId is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: book } = await supabase
      .from('books')
      .select('id, status, cover_style, metadata')
      .eq('id', bookId)
      .eq('user_id', user.id)
      .single();

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const { data: pages } = await supabase
      .from('pages')
      .select('id, page_number, illustration_status, illustration_url, narration_url, narration_duration_ms')
      .eq('book_id', bookId)
      .order('page_number');

    const total = pages?.length || 0;
    const illustrationsComplete = pages?.filter((p) => p.illustration_status === 'complete').length || 0;
    const illustrationErrors = pages?.filter((p) => p.illustration_status === 'error').length || 0;
    const narrationsComplete = pages?.filter((p) => p.narration_url).length || 0;

    // Determine cover status
    const { data: covers } = await supabase
      .from('cover_options')
      .select('image_url')
      .eq('book_id', bookId)
      .eq('is_selected', true)
      .limit(1);

    const coverImageUrl = covers?.[0]?.image_url || null;
    const bookMeta = (book.metadata || {}) as Record<string, unknown>;
    const hasVisualBible = !!bookMeta.visual_bible;
    const hasCharacterCrops = Array.isArray(bookMeta.character_crops) && (bookMeta.character_crops as unknown[]).length > 0;

    let coverStatus: 'pending' | 'generating_image' | 'processing' | 'ready';
    if (coverImageUrl && hasVisualBible && hasCharacterCrops) {
      coverStatus = 'ready';
    } else if (coverImageUrl) {
      coverStatus = 'processing';
    } else {
      coverStatus = 'generating_image';
    }

    return NextResponse.json({
      bookStatus: book.status,
      total,
      complete: illustrationsComplete,
      errors: illustrationErrors,
      illustrationsComplete,
      narrationsComplete,
      coverStatus,
      coverUrl: coverImageUrl,
      pages: pages || [],
    });
  } catch (err) {
    console.error('Book status error:', err);
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}
