import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePageAnimation } from '@/lib/ai/video-generator';
import { getMotionPrompt } from '@/lib/ai/prompts/motion-prompts';
import { uploadImage } from '@/lib/supabase/storage';

export const maxDuration = 600;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookId } = await req.json();
    if (!bookId) {
      return NextResponse.json({ error: 'bookId is required' }, { status: 400 });
    }

    // Check if Seedance is configured
    if (!process.env.SEEDANCE_API_URL || !process.env.SEEDANCE_API_KEY) {
      return NextResponse.json(
        { error: 'Animation service not configured', status: 'unavailable' },
        { status: 503 }
      );
    }

    const { data: book } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .eq('user_id', user.id)
      .single();

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const { data: pages } = await supabase
      .from('pages')
      .select('*')
      .eq('book_id', bookId)
      .eq('illustration_status', 'complete')
      .order('page_number');

    if (!pages?.length) {
      return NextResponse.json({ error: 'No completed illustrations found' }, { status: 404 });
    }

    const themeSlug = (book.metadata as Record<string, string>)?.themeSlug || '';
    const motionPrompt = getMotionPrompt(themeSlug);

    // Mark pages as animating
    await supabase
      .from('pages')
      .update({ animation_status: 'generating' })
      .eq('book_id', bookId)
      .eq('illustration_status', 'complete');

    // Background generation
    generateAllAnimations({ bookId, pages, motionPrompt });

    return NextResponse.json({ status: 'generating', total: pages.length });
  } catch (err) {
    console.error('[generate-animations] Error:', err);
    return NextResponse.json({ error: 'Failed to start animation generation' }, { status: 500 });
  }
}

async function generateAllAnimations(params: {
  bookId: string;
  pages: Array<{
    id: string;
    page_number: number;
    illustration_url: string | null;
  }>;
  motionPrompt: string;
}) {
  const { bookId, pages, motionPrompt } = params;

  const { createClient: createServiceClient } = await import('@supabase/supabase-js');
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  for (const page of pages) {
    if (!page.illustration_url) continue;

    try {
      const { videoUrl } = await generatePageAnimation(
        page.illustration_url,
        motionPrompt
      );

      // Download and re-upload to our storage
      const videoResponse = await fetch(videoUrl);
      const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
      const storagePath = `${bookId}/page-${page.page_number}.mp4`;
      const ourUrl = await uploadImage('animations', storagePath, videoBuffer, 'video/mp4');

      await supabase
        .from('pages')
        .update({
          animation_url: ourUrl,
          animation_status: 'complete',
        })
        .eq('id', page.id);

      console.log(`[animations] Page ${page.page_number} animated`);
    } catch (err) {
      console.error(`[animations] Page ${page.page_number} failed:`, err);
      await supabase
        .from('pages')
        .update({ animation_status: 'error' })
        .eq('id', page.id);
    }
  }
}
