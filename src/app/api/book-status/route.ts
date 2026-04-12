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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: book } = await supabase
      .from('books')
      .select('id, status, cover_style')
      .eq('id', bookId)
      .eq('user_id', user.id)
      .single();

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Fetch ALL page fields needed for status tracking
    const { data: pages } = await supabase
      .from('pages')
      .select('id, page_number, illustration_status, illustration_url, narration_url, narration_duration_ms')
      .eq('book_id', bookId)
      .order('page_number');

    const total = pages?.length || 0;
    const illustrationsComplete = pages?.filter((p) => p.illustration_status === 'complete').length || 0;
    const illustrationErrors = pages?.filter((p) => p.illustration_status === 'error').length || 0;
    const narrationsComplete = pages?.filter((p) => p.narration_url).length || 0;

    console.log('[book-status]', JSON.stringify({
      bookId,
      total,
      illustrationsComplete,
      illustrationErrors,
      narrationsComplete,
      pageStatuses: pages?.map((p) => ({
        pg: p.page_number,
        ill: p.illustration_status,
        illUrl: p.illustration_url ? 'yes' : 'no',
        narUrl: p.narration_url ? 'yes' : 'no',
      })),
    }));

    return NextResponse.json({
      bookStatus: book.status,
      total,
      complete: illustrationsComplete, // backwards compat
      errors: illustrationErrors,
      illustrationsComplete,
      narrationsComplete,
      pages: pages || [],
    });
  } catch (err) {
    console.error('Book status error:', err);
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}
