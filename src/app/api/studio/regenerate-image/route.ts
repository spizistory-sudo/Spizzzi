export const maxDuration = 120;

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/admin';
import { getBook, updateBookStatus } from '@/lib/studio/db';
import { uploadImage } from '@/lib/supabase/storage';
import { fal } from '@fal-ai/client';

fal.config({ credentials: process.env.FAL_KEY });

const PRIMARY_T2I = 'fal-ai/nano-banana-pro';
const PRIMARY_I2I = 'fal-ai/nano-banana-pro/edit';
const STORAGE_BUCKET = 'illustrations';

interface ImageEntry {
  page_or_chapter_n: number;
  type: string;
  prompt_used: string;
  model_used: string;
  url: string;
  status: string;
  error?: string;
}

interface ImagesData {
  entries: ImageEntry[];
  anchor_url: string | null;
  total_expected: number;
  failed_count: number;
  cost_estimate: string;
}

interface FalImageResult {
  data: { images: Array<{ url: string }> };
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { bookId, imageIndex } = await req.json();
    if (!bookId || imageIndex == null) {
      return NextResponse.json({ error: 'bookId and imageIndex required' }, { status: 400 });
    }

    const book = await getBook(bookId);
    if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 });

    const imagesData = book.images as unknown as ImagesData | null;
    if (!imagesData?.entries || imageIndex < 0 || imageIndex >= imagesData.entries.length) {
      return NextResponse.json({ error: 'Invalid image index' }, { status: 400 });
    }

    const entry = imagesData.entries[imageIndex];
    const isAnchor = imageIndex === 0;
    const modelId = isAnchor ? PRIMARY_T2I : PRIMARY_I2I;

    console.log(`[studio/regenerate] Regenerating image ${imageIndex} (${entry.type}-${entry.page_or_chapter_n}) with ${modelId}`);

    const input: Record<string, unknown> = {
      prompt: entry.prompt_used,
      aspect_ratio: '4:3',
      num_images: 1,
      output_format: 'png',
    };

    if (!isAnchor && imagesData.anchor_url) {
      input.image_urls = [imagesData.anchor_url];
    }

    console.log(`[studio/regenerate] fal input keys: ${Object.keys(input).join(', ')}`);

    let result: unknown;
    try {
      result = await fal.run(modelId as string, { input } as never);
    } catch (err: unknown) {
      const falErr = err as { status?: number; body?: unknown; message?: string };
      console.error(`[studio/regenerate] fal error ${falErr.status || 'unknown'}:`, JSON.stringify(falErr.body ?? falErr.message ?? err));
      throw err;
    }
    const tempUrl = (result as FalImageResult)?.data?.images?.[0]?.url;
    if (!tempUrl) throw new Error(`${modelId} returned no image`);

    const res = await fetch(tempUrl);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());

    const storagePath = `library/${bookId}/${entry.type}-${entry.page_or_chapter_n}.png`;
    const publicUrl = await uploadImage(STORAGE_BUCKET, storagePath, buffer);

    imagesData.entries[imageIndex] = {
      ...entry,
      url: publicUrl,
      model_used: modelId,
      status: 'complete',
      error: undefined,
    };

    if (isAnchor) {
      imagesData.anchor_url = publicUrl;
    }

    imagesData.failed_count = imagesData.entries.filter(e => e.status === 'failed').length;

    await updateBookStatus(bookId, book.status as Parameters<typeof updateBookStatus>[1], {
      images: imagesData as unknown as Record<string, unknown>,
      last_error: imagesData.failed_count > 0
        ? `${imagesData.failed_count} image(s) still failed`
        : null,
    });

    console.log(`[studio/regenerate] Image ${imageIndex} regenerated successfully`);
    return NextResponse.json({ success: true, entry: imagesData.entries[imageIndex] });
  } catch (err) {
    console.error('[studio/regenerate] ERROR:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Regeneration failed' }, { status: 500 });
  }
}
