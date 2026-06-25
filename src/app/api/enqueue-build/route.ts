export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { tasks } from '@trigger.dev/sdk/v3';
import type { buildBook } from '@/trigger/build-book';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookId } = await req.json();
    if (!bookId) return NextResponse.json({ error: 'bookId required' }, { status: 400 });

    console.log(`[enqueue-build] Enqueueing build-book for ${bookId} (user: ${user.email})`);

    const handle = await tasks.trigger<typeof buildBook>('build-book', { bookId });

    console.log(`[enqueue-build] Job enqueued: ${handle.id}`);
    return NextResponse.json({ enqueued: true, runId: handle.id, bookId });
  } catch (err) {
    console.error('[enqueue-build] ERROR:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to enqueue build job' }, { status: 500 });
  }
}
