import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fal } from '@fal-ai/client';
import { generateAnimationPrompt } from '@/lib/animation-prompts';

fal.config({ credentials: process.env.FAL_KEY });

const FAL_MODEL = 'fal-ai/minimax/hailuo-02/standard/image-to-video';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookId } = await req.json();

    // Verify book belongs to user
    const { data: books } = await supabase
      .from('books')
      .select('id, user_id')
      .eq('id', bookId)
      .eq('user_id', user.id)
      .limit(1);

    if (!books || books.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Log all pages for debugging
    const { data: allPages } = await supabase
      .from('pages')
      .select('id, page_number, video_status, illustration_url')
      .eq('book_id', bookId)
      .order('page_number');

    console.log('[animate-book] All pages:', allPages?.map((p) => ({
      page: p.page_number, status: p.video_status, hasIllustration: !!p.illustration_url,
    })));

    // Reset stale generating pages from previous failed runs
    await supabase
      .from('pages')
      .update({ video_status: 'none', video_url: null })
      .eq('book_id', bookId)
      .eq('video_status', 'generating');

    // Get all illustrated pages that are NOT already complete
    const { data: pagesToAnimate } = await supabase
      .from('pages')
      .select('id, page_number, text_content, illustration_url, video_status')
      .eq('book_id', bookId)
      .not('illustration_url', 'is', null)
      .neq('video_status', 'complete')
      .order('page_number');

    if (!pagesToAnimate || pagesToAnimate.length === 0) {
      return NextResponse.json({ message: 'No pages to animate', submissions: [] });
    }

    // Mark book as generating
    await supabase
      .from('books')
      .update({ animation_status: 'generating', animation_prompted: true })
      .eq('id', bookId);

    // Generate motion prompts for all pages in parallel
    const promptResults = await Promise.allSettled(
      pagesToAnimate.map((page) => generateAnimationPrompt(page.text_content || ''))
    );

    // Submit all pages to fal.ai in parallel
    const submissionResults = await Promise.allSettled(
      pagesToAnimate.map(async (page, i) => {
        const prompt = promptResults[i].status === 'fulfilled'
          ? promptResults[i].value
          : 'Gentle cinematic motion, soft magical atmosphere, storybook animation quality.';

        console.log(`[animate-book] Submitting page ${page.page_number}, prompt: ${prompt.substring(0, 80)}...`);

        const result = await fal.queue.submit(FAL_MODEL, {
          input: {
            image_url: page.illustration_url!,
            prompt,
            prompt_optimizer: true,
            duration: '6',
            resolution: '768P',
          },
        });

        const requestId = result.request_id;

        await supabase
          .from('pages')
          .update({ video_status: 'generating', video_url: `fal:${requestId}` })
          .eq('id', page.id);

        return { pageId: page.id, pageNumber: page.page_number, requestId };
      })
    );

    const submissions = submissionResults
      .filter((r): r is PromiseFulfilledResult<{ pageId: string; pageNumber: number; requestId: string }> => r.status === 'fulfilled')
      .map((r) => r.value);

    const failures = submissionResults.filter((r) => r.status === 'rejected').length;
    console.log(`[animate-book] Submitted ${submissions.length} pages, ${failures} failed`);

    return NextResponse.json({ success: true, submissions, totalPages: submissions.length });
  } catch (err) {
    console.error('[animate-book]', err);
    return NextResponse.json({ error: 'Failed to start animation' }, { status: 500 });
  }
}
