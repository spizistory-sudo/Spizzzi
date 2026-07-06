import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/admin';
import { getBook, deleteBook, saveReview, updateBookStatus } from '@/lib/studio/db';

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user && isAdmin(user.email);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const { id } = await params;
    const book = await getBook(id);
    if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ book });
  } catch (err) {
    console.error('[studio/books/id] GET error:', err);
    return NextResponse.json({ error: 'Failed to get book' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const { id } = await params;
    await deleteBook(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[studio/books/id] DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const { id } = await params;
    const body = await req.json();
    if (body.review_verdict) {
      const book = await saveReview(id, body.review_verdict, body.review_notes);
      return NextResponse.json({ book });
    }
    if (body.update_brief) {
      const book = await getBook(id);
      if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const updated = await updateBookStatus(id, book.status as Parameters<typeof updateBookStatus>[1], { brief: body.update_brief });
      return NextResponse.json({ book: updated });
    }
    return NextResponse.json({ error: 'No action' }, { status: 400 });
  } catch (err) {
    console.error('[studio/books/id] PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update book' }, { status: 500 });
  }
}
