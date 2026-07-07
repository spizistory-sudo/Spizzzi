export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/admin';
import { tasks } from '@trigger.dev/sdk/v3';
import { getBook } from '@/lib/studio/db';
import type { developIdea } from '@/trigger/develop-idea';
import type { writeStory } from '@/trigger/write-story';
import type { checkStory } from '@/trigger/check-story';

const IN_PROGRESS_STATUSES = new Set(['developing_idea', 'writing', 'checking', 'illustrating']);

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { bookId, stage } = await req.json();
    if (!bookId || !stage) {
      return NextResponse.json({ error: 'bookId and stage are required' }, { status: 400 });
    }

    const book = await getBook(bookId);
    if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 });

    if (IN_PROGRESS_STATUSES.has(book.status)) {
      return NextResponse.json({ error: 'Book is already being processed', currentStatus: book.status }, { status: 409 });
    }

    let handle;
    if (stage === 'develop-idea') {
      if (book.status !== 'spark') {
        return NextResponse.json({ error: `Cannot develop idea: book is '${book.status}', expected 'spark'` }, { status: 400 });
      }
      handle = await tasks.trigger<typeof developIdea>('develop-idea', { bookId });
    } else if (stage === 'write-story') {
      if (book.status !== 'idea_ready' && book.status !== 'needs_revision') {
        return NextResponse.json({ error: `Cannot write story: book is '${book.status}', expected 'idea_ready' or 'needs_revision'` }, { status: 400 });
      }
      handle = await tasks.trigger<typeof writeStory>('write-story', { bookId });
    } else if (stage === 'check-story') {
      if (book.status !== 'checking') {
        return NextResponse.json({ error: `Cannot check story: book is '${book.status}', expected 'checking'` }, { status: 400 });
      }
      handle = await tasks.trigger<typeof checkStory>('check-story', { bookId });
    } else {
      return NextResponse.json({ error: `Unknown stage: ${stage}` }, { status: 400 });
    }

    console.log(`[studio/enqueue] Enqueued ${stage} for book ${bookId}, run: ${handle.id}`);
    return NextResponse.json({ enqueued: true, runId: handle.id, bookId, stage });
  } catch (err) {
    console.error('[studio/enqueue] ERROR:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to enqueue stage' }, { status: 500 });
  }
}
