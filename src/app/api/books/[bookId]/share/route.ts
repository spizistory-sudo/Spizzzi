import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createShareSlug } from '@/lib/utils/share';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { isPublic } = await req.json();

    // Fetch current book
    const { data: book } = await supabase
      .from('books')
      .select('id, share_slug, is_public, user_id')
      .eq('id', bookId)
      .eq('user_id', user.id)
      .single();

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Generate share slug if making public and none exists
    const shareSlug = book.share_slug || (isPublic ? createShareSlug() : null);

    const { data: updated, error } = await supabase
      .from('books')
      .update({
        is_public: isPublic,
        share_slug: shareSlug,
      })
      .eq('id', bookId)
      .select('id, is_public, share_slug')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.json({
      ...updated,
      shareUrl: updated.share_slug ? `${appUrl}/share/${updated.share_slug}` : null,
    });
  } catch (err) {
    console.error('[share] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
