import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

async function cleanupStorage(bookId: string) {
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  for (const bucket of ['covers', 'illustrations', 'audio']) {
    try {
      const { data: files } = await supabase.storage.from(bucket).list(bookId);
      if (files?.length) {
        await supabase.storage
          .from(bucket)
          .remove(files.map((f) => `${bookId}/${f.name}`));
      }
    } catch {
      // Best-effort cleanup
    }
  }
}

export async function DELETE(
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

    // Verify ownership
    const { data: book } = await supabase
      .from('books')
      .select('id')
      .eq('id', bookId)
      .eq('user_id', user.id)
      .single();

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Cleanup storage files
    await cleanupStorage(bookId);

    // Delete book (cascade handles pages, covers, photos)
    const { error } = await supabase.from('books').delete().eq('id', bookId);
    if (error) {
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[delete-book] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
