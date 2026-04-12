import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { pages } = await req.json();
    if (!Array.isArray(pages) || pages.length === 0) {
      return NextResponse.json({ error: 'No pages provided' }, { status: 400 });
    }

    // Verify book belongs to user
    const { data: book } = await supabase
      .from('books')
      .select('id')
      .eq('id', bookId)
      .eq('user_id', user.id)
      .limit(1);

    if (!book || book.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Update each changed page's text and clear its narration
    for (const page of pages) {
      await supabase
        .from('pages')
        .update({
          text_content: page.text,
          narration_url: null,
          narration_duration_ms: null,
        })
        .eq('id', page.pageId)
        .eq('book_id', bookId);
    }

    return NextResponse.json({ success: true, updatedCount: pages.length });
  } catch (err) {
    console.error('[edit-pages]', err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
