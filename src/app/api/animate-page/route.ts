import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fal } from '@fal-ai/client';
import { generateAnimationPrompt } from '@/lib/animation-prompts';

fal.config({ credentials: process.env.FAL_KEY });

export async function POST(req: Request) {
  const body = await req.json();
  const { pageId, bookId } = body;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!pageId || !bookId) {
      return NextResponse.json({ error: 'pageId and bookId required' }, { status: 400 });
    }

    // Get page + verify ownership
    const { data: pages } = await supabase
      .from('pages')
      .select('*')
      .eq('id', pageId)
      .eq('book_id', bookId)
      .limit(1);

    const page = pages?.[0];
    if (!page) return NextResponse.json({ error: 'Page not found' }, { status: 404 });

    // Verify book ownership
    const { data: books } = await supabase
      .from('books')
      .select('id, user_id')
      .eq('id', bookId)
      .eq('user_id', user.id)
      .limit(1);

    if (!books || books.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (!page.illustration_url) {
      return NextResponse.json({ error: 'No illustration to animate' }, { status: 400 });
    }

    // Mark as generating
    await supabase
      .from('pages')
      .update({ video_status: 'generating' })
      .eq('id', pageId);

    // Generate animation prompt
    const prompt = await generateAnimationPrompt(page.text_content);

    console.log('[animate-page] Submitting to Kling 2.5 Turbo, page:', page.page_number);

    // Submit to MiniMax Hailuo-02 via fal.ai queue
    const result = await fal.queue.submit('fal-ai/minimax/hailuo-02/standard/image-to-video', {
      input: {
        image_url: page.illustration_url,
        prompt,
        prompt_optimizer: true,
        duration: '6',
        resolution: '768P',
      },
    });

    const requestId = result.request_id;

    // Save the fal request_id so we can poll it
    await supabase
      .from('pages')
      .update({ video_status: 'generating', video_url: `fal:${requestId}` })
      .eq('id', pageId);

    console.log('[animate-page] Submitted, requestId:', requestId);

    return NextResponse.json({ success: true, requestId });
  } catch (err) {
    console.error('[animate-page]', err);

    // Reset status on error
    try {
      if (pageId) {
        const supabase = await createClient();
        await supabase.from('pages').update({ video_status: 'error' }).eq('id', pageId);
      }
    } catch { /* best effort */ }

    return NextResponse.json({ error: 'Animation failed' }, { status: 500 });
  }
}
