export const maxDuration = 300;
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fal } from '@fal-ai/client';
import { generateAnimationPrompt } from '@/lib/animation-prompts';
import { getAnimationModel, buildAnimationInput } from '@/lib/animation-config';

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

    const { data: pages } = await supabase
      .from('pages')
      .select('*')
      .eq('id', pageId)
      .eq('book_id', bookId)
      .limit(1);

    const page = pages?.[0];
    if (!page) return NextResponse.json({ error: 'Page not found' }, { status: 404 });

    const { data: books } = await supabase
      .from('books')
      .select('id, user_id, metadata')
      .eq('id', bookId)
      .eq('user_id', user.id)
      .limit(1);

    if (!books || books.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (!page.illustration_url) {
      return NextResponse.json({ error: 'No illustration to animate' }, { status: 400 });
    }

    await supabase.from('pages').update({ video_status: 'generating' }).eq('id', pageId);

    const bookMeta = (books[0].metadata || {}) as Record<string, unknown>;
    const styleKey = bookMeta.style_key as string | undefined;
    const { ART_STYLES } = await import('@/lib/ai/prompts/style-references');
    const styleName = styleKey && ART_STYLES[styleKey as keyof typeof ART_STYLES]?.name;
    const prompt = await generateAnimationPrompt(page.text_content, styleName || undefined);
    const model = getAnimationModel();

    console.log(`[animate-page] using ${model.key} for page ${page.page_number}`);

    const result = await fal.queue.submit(model.falId, {
      input: buildAnimationInput(model, page.illustration_url, prompt),
    });

    const requestId = result.request_id;

    await supabase
      .from('pages')
      .update({ video_status: 'generating', video_url: `fal:${model.key}:${requestId}` })
      .eq('id', pageId);

    console.log(`[animate-page] Submitted to ${model.key}, requestId: ${requestId}`);

    return NextResponse.json({ success: true, requestId, model: model.key });
  } catch (err) {
    console.error('[animate-page]', err);
    try {
      if (pageId) {
        const supabase = await createClient();
        await supabase.from('pages').update({ video_status: 'error' }).eq('id', pageId);
      }
    } catch { /* best effort */ }
    return NextResponse.json({ error: 'Animation failed' }, { status: 500 });
  }
}
