import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fal } from '@fal-ai/client';

fal.config({ credentials: process.env.FAL_KEY });

const MODELS: Record<string, string> = {
  minimax: 'fal-ai/minimax/hailuo-02/standard/image-to-video',
  kling: 'fal-ai/kling-video/v1.6/standard/image-to-video',
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pageId = searchParams.get('pageId');
    const requestId = searchParams.get('requestId');
    const bookId = searchParams.get('bookId');

    if (!pageId || !requestId) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    const startedAt = searchParams.get('startedAt');

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Server-side timeout: if page has been generating for > 5 minutes, mark as timed out
    if (startedAt) {
      const elapsed = Date.now() - parseInt(startedAt, 10);
      if (elapsed > 5 * 60 * 1000) {
        console.warn(`[animate-status] Page ${pageId} timed out after ${Math.round(elapsed / 1000)}s`);
        await supabase.from('pages').update({ video_status: 'error', video_url: null }).eq('id', pageId);
        return NextResponse.json({ status: 'timeout', message: 'Animation timed out after 5 minutes' });
      }
    }

    // Resolve which model was used from the page's video_url (fal:minimax:xxx or fal:kling:xxx)
    const { data: pageRow } = await supabase
      .from('pages')
      .select('video_url')
      .eq('id', pageId)
      .limit(1);

    const videoUrlField = pageRow?.[0]?.video_url || '';
    const parts = videoUrlField.split(':');
    // Format: "fal:minimax:requestId" or legacy "fal:requestId"
    const modelKey = parts.length >= 3 ? parts[1] : 'minimax';
    const falModel = MODELS[modelKey] || MODELS.minimax;
    console.log('[animate-status] Resolved model:', modelKey, '→', falModel);

    // Check fal queue status
    let queueStatus: string;
    try {
      const status = await fal.queue.status(falModel, { requestId, logs: true });
      queueStatus = status.status as string;
      console.log('[animate-status] fal status:', JSON.stringify({ requestId, model: modelKey, status: queueStatus }));
    } catch (falErr: unknown) {
      const errStatus = (falErr as { status?: number })?.status;
      if (errStatus === 404 || errStatus === 422) {
        await supabase.from('pages').update({ video_status: 'none', video_url: null }).eq('id', pageId);
        return NextResponse.json({ status: 'not_found' });
      }
      throw falErr;
    }

    if (queueStatus === 'COMPLETED') {
      const result = await fal.queue.result(falModel, { requestId });
      const videoUrl = (result.data as { video?: { url?: string } })?.video?.url;

      if (!videoUrl) {
        console.error('[animate-status] No video URL in result:', JSON.stringify(result.data));
        return NextResponse.json({ status: 'generating' });
      }

      if (videoUrl) {
        const videoRes = await fetch(videoUrl);
        const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

        const fileName = `${pageId}-${Date.now()}.mp4`;
        const { error: uploadError } = await supabase.storage
          .from('videos')
          .upload(fileName, videoBuffer, { contentType: 'video/mp4', upsert: true });

        if (uploadError) {
          console.error('[animate-page/status] Upload error:', uploadError);
          return NextResponse.json({ status: 'error' });
        }

        const { data: urlData } = supabase.storage.from('videos').getPublicUrl(fileName);

        await supabase
          .from('pages')
          .update({ video_url: urlData.publicUrl, video_status: 'complete' })
          .eq('id', pageId);

        // Check if ALL illustrated pages in this book are now animated
        if (bookId) {
          const { data: allPages } = await supabase
            .from('pages')
            .select('id, video_status')
            .eq('book_id', bookId)
            .not('illustration_url', 'is', null);

          const allDone = allPages?.every((p) => p.video_status === 'complete');
          if (allDone) {
            await supabase.from('books').update({ animation_status: 'complete' }).eq('id', bookId);
            console.log('[animate-page/status] All pages complete — book animation done');
          }
        }

        return NextResponse.json({ status: 'complete', videoUrl: urlData.publicUrl });
      }
    } else if (queueStatus === 'FAILED') {
      await supabase.from('pages').update({ video_status: 'error', video_url: null }).eq('id', pageId);
      return NextResponse.json({ status: 'error' });
    }

    return NextResponse.json({ status: 'generating' });
  } catch (err) {
    console.error('[animate-page/status]', err);
    return NextResponse.json({ error: 'Status check failed' }, { status: 500 });
  }
}
