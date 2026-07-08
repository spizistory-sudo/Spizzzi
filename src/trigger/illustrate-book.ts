import { task } from "@trigger.dev/sdk/v3";
import { fal } from "@fal-ai/client";
import { getBook, updateBookStatus } from "@/lib/studio/db";
import { uploadImage } from "@/lib/supabase/storage";

fal.config({ credentials: process.env.FAL_KEY });

const PRIMARY_T2I = 'fal-ai/nano-banana-pro';
const PRIMARY_I2I = 'fal-ai/nano-banana-pro/edit';
const FALLBACK_MODEL = 'fal-ai/gpt-image-2';

const MAX_IMAGES_PER_BOOK = 20;
const CONCURRENCY = 3;
const COST_PER_PRIMARY = 0.15;
const COST_PER_FALLBACK = 0.08;
const STORAGE_BUCKET = 'illustrations';

interface ImageEntry {
  page_or_chapter_n: number;
  type: 'spread' | 'chapter_anchor' | 'cover';
  prompt_used: string;
  model_used: string;
  url: string;
  status: 'complete' | 'failed';
  error?: string;
}

interface ImagesData {
  entries: ImageEntry[];
  anchor_url: string | null;
  total_expected: number;
  failed_count: number;
  cost_estimate: string;
}

interface CharacterEntry {
  name: string;
  age?: number;
  description?: string;
  locked_features?: string[];
  palette?: string[];
}

interface PageEntry {
  n: number;
  title?: string;
  text: string;
  illustration_note?: string;
  page_turn?: string;
  chapter_end_pull?: string;
}

interface StoryData {
  character_sheet?: CharacterEntry[];
  style_anchor?: string;
  pages?: PageEntry[];
  cover_concept?: string;
  metadata?: { age_band?: string };
}

interface FalImageResult {
  data: {
    images: Array<{ url: string }>;
  };
}

function buildPreamble(story: StoryData): string {
  const parts: string[] = [];

  if (story.style_anchor) {
    parts.push(`STYLE: ${story.style_anchor}`);
  }

  if (story.character_sheet && story.character_sheet.length > 0) {
    parts.push('CHARACTERS:');
    for (const char of story.character_sheet) {
      let line = `- ${char.name}`;
      if (char.age) line += `, age ${char.age}`;
      if (char.description) line += `: ${char.description}`;
      parts.push(line);
      if (char.locked_features && char.locked_features.length > 0) {
        parts.push(`  Locked features: ${char.locked_features.join(', ')}`);
      }
      if (char.palette && char.palette.length > 0) {
        parts.push(`  Palette: ${char.palette.join(', ')}`);
      }
    }
  }

  parts.push('');
  parts.push('RULES: Children\'s book illustration. No text, words, letters, numbers, signs, labels, speech bubbles, or watermarks anywhere in the image. Books, signs, and paper must be blank. Warm, child-friendly, expressive.');

  return parts.join('\n');
}

async function callFal(
  modelId: string,
  prompt: string,
  referenceUrl?: string,
): Promise<{ tempUrl: string; modelUsed: string }> {
  const input: Record<string, unknown> = {
    prompt,
    num_images: 1,
    output_format: 'png',
  };

  if (modelId === FALLBACK_MODEL) {
    input.size = '1536x1024';
  } else {
    input.image_size = 'landscape_4_3';
  }

  if (referenceUrl && modelId !== FALLBACK_MODEL) {
    input.image_url = referenceUrl;
    input.strength = 0.65;
  }

  const result = await fal.run(modelId as string, { input } as never) as unknown as FalImageResult;
  const url = result?.data?.images?.[0]?.url;
  if (!url) throw new Error(`${modelId} returned no image`);
  return { tempUrl: url, modelUsed: modelId };
}

async function generateWithFallback(
  prompt: string,
  referenceUrl?: string,
  isAnchor?: boolean,
): Promise<{ buffer: Buffer; modelUsed: string }> {
  const primaryModel = isAnchor ? PRIMARY_T2I : PRIMARY_I2I;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { tempUrl, modelUsed } = await callFal(
        primaryModel,
        prompt,
        isAnchor ? undefined : referenceUrl,
      );
      const res = await fetch(tempUrl);
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      return { buffer: Buffer.from(await res.arrayBuffer()), modelUsed };
    } catch (err) {
      console.warn(`[illustrate] ${primaryModel} attempt ${attempt + 1} failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  try {
    console.log(`[illustrate] Trying fallback ${FALLBACK_MODEL}...`);
    const { tempUrl, modelUsed } = await callFal(FALLBACK_MODEL, prompt);
    const res = await fetch(tempUrl);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    return { buffer: Buffer.from(await res.arrayBuffer()), modelUsed };
  } catch (err) {
    throw new Error(`All models failed. Last: ${err instanceof Error ? err.message : err}`);
  }
}

async function saveProgress(bookId: string, entries: ImageEntry[], anchorUrl: string | null, totalExpected: number) {
  const failedCount = entries.filter(e => e.status === 'failed').length;
  let cost = 0;
  for (const e of entries) {
    if (e.status === 'complete') {
      cost += e.model_used === FALLBACK_MODEL ? COST_PER_FALLBACK : COST_PER_PRIMARY;
    }
  }
  const imagesData: ImagesData = {
    entries,
    anchor_url: anchorUrl,
    total_expected: totalExpected,
    failed_count: failedCount,
    cost_estimate: `$${cost.toFixed(2)}`,
  };
  await updateBookStatus(bookId, 'illustrating', { images: imagesData as unknown as Record<string, unknown> });
}

export const illustrateBook = task({
  id: "illustrate-book",
  maxDuration: 900,
  run: async (payload: { bookId: string }) => {
    console.log(`[trigger:illustrate-book] ========== TASK STARTED for ${payload.bookId} ==========`);
    console.log(`[trigger:illustrate-book] Env: FAL_KEY=${process.env.FAL_KEY ? 'set' : 'MISSING'}, SUPABASE_URL=${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'MISSING'}, SERVICE_KEY=${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING'}`);

    const book = await getBook(payload.bookId);
    if (!book) throw new Error(`Book ${payload.bookId} not found`);

    if (book.status !== 'ready') {
      console.log(`[trigger:illustrate-book] Book is '${book.status}', expected 'ready' — skipping`);
      return { success: false, reason: `wrong status: ${book.status}` };
    }

    const story = book.story as StoryData | null;
    if (!story?.pages || story.pages.length === 0) {
      await updateBookStatus(payload.bookId, 'ready', { last_error: 'No story pages to illustrate' });
      return { success: false, reason: 'no pages' };
    }

    const ageBand = story.metadata?.age_band || book.spark.age_band;
    const isChapterBook = ageBand === '6-8';
    console.log(`[trigger:illustrate-book] Band: ${ageBand}, pages: ${story.pages.length}, chapter book: ${isChapterBook}`);

    const imageJobs: Array<{ n: number; type: 'spread' | 'chapter_anchor' | 'cover'; scene: string }> = [];

    if (story.cover_concept) {
      imageJobs.push({ n: 0, type: 'cover', scene: story.cover_concept });
    }

    for (const page of story.pages) {
      if (!page.illustration_note) continue;
      imageJobs.push({
        n: page.n,
        type: isChapterBook ? 'chapter_anchor' : 'spread',
        scene: page.illustration_note,
      });
    }

    const totalImages = imageJobs.length;
    console.log(`[trigger:illustrate-book] ${totalImages} images to generate`);

    if (totalImages === 0) {
      await updateBookStatus(payload.bookId, 'ready', { last_error: 'No illustration notes in story pages' });
      return { success: false, reason: 'no illustration notes' };
    }

    if (totalImages > MAX_IMAGES_PER_BOOK) {
      await updateBookStatus(payload.bookId, 'ready', {
        last_error: `Image count ${totalImages} exceeds cap of ${MAX_IMAGES_PER_BOOK}. Reduce pages or raise the limit.`,
      });
      return { success: false, reason: 'exceeds cap' };
    }

    const estimatedCost = totalImages * COST_PER_PRIMARY;
    console.log(`[trigger:illustrate-book] Estimated cost: $${estimatedCost.toFixed(2)}`);

    await updateBookStatus(payload.bookId, 'illustrating');
    console.log(`[trigger:illustrate-book] Status → 'illustrating'`);

    const preamble = buildPreamble(story);
    const entries: ImageEntry[] = [];
    let anchorUrl: string | null = null;

    try {
      // --- Anchor image (first job) ---
      const anchorJob = imageJobs[0];
      const anchorPrompt = `${preamble}\n\nSCENE: ${anchorJob.scene}`;
      console.log(`[trigger:illustrate-book] Generating anchor (${anchorJob.type} #${anchorJob.n})...`);

      try {
        const { buffer, modelUsed } = await generateWithFallback(anchorPrompt, undefined, true);
        const storagePath = `library/${payload.bookId}/${anchorJob.type}-${anchorJob.n}.png`;
        const publicUrl = await uploadImage(STORAGE_BUCKET, storagePath, buffer);
        anchorUrl = publicUrl;

        entries.push({
          page_or_chapter_n: anchorJob.n,
          type: anchorJob.type,
          prompt_used: anchorPrompt,
          model_used: modelUsed,
          url: publicUrl,
          status: 'complete',
        });
        console.log(`[trigger:illustrate-book] Anchor done: ${modelUsed}, stored at ${storagePath}`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[trigger:illustrate-book] Anchor FAILED: ${errorMsg}`);
        entries.push({
          page_or_chapter_n: anchorJob.n,
          type: anchorJob.type,
          prompt_used: anchorPrompt,
          model_used: 'none',
          url: '',
          status: 'failed',
          error: errorMsg,
        });
      }

      await saveProgress(payload.bookId, entries, anchorUrl, totalImages);

      // --- Remaining images in chunks ---
      const remainingJobs = imageJobs.slice(1);

      for (let i = 0; i < remainingJobs.length; i += CONCURRENCY) {
        const chunk = remainingJobs.slice(i, i + CONCURRENCY);
        console.log(`[trigger:illustrate-book] Chunk ${Math.floor(i / CONCURRENCY) + 1}: images ${i + 2}–${Math.min(i + CONCURRENCY + 1, remainingJobs.length + 1)} of ${totalImages}`);

        const chunkResults = await Promise.all(
          chunk.map(async (job) => {
            const prompt = `${preamble}\n\nSCENE: ${job.scene}\n\nMaintain exact character consistency with the reference image.`;

            try {
              const { buffer, modelUsed } = await generateWithFallback(prompt, anchorUrl || undefined, false);
              const storagePath = `library/${payload.bookId}/${job.type}-${job.n}.png`;
              const publicUrl = await uploadImage(STORAGE_BUCKET, storagePath, buffer);

              return {
                page_or_chapter_n: job.n,
                type: job.type,
                prompt_used: prompt,
                model_used: modelUsed,
                url: publicUrl,
                status: 'complete' as const,
              };
            } catch (err) {
              const errorMsg = err instanceof Error ? err.message : String(err);
              console.error(`[trigger:illustrate-book] Image ${job.type}-${job.n} FAILED: ${errorMsg}`);
              return {
                page_or_chapter_n: job.n,
                type: job.type,
                prompt_used: prompt,
                model_used: 'none',
                url: '',
                status: 'failed' as const,
                error: errorMsg,
              };
            }
          }),
        );

        entries.push(...chunkResults);
        await saveProgress(payload.bookId, entries, anchorUrl, totalImages);
      }

      // --- Final status ---
      const failedCount = entries.filter(e => e.status === 'failed').length;
      let cost = 0;
      for (const e of entries) {
        if (e.status === 'complete') {
          cost += e.model_used === FALLBACK_MODEL ? COST_PER_FALLBACK : COST_PER_PRIMARY;
        }
      }
      const imagesData: ImagesData = {
        entries,
        anchor_url: anchorUrl,
        total_expected: totalImages,
        failed_count: failedCount,
        cost_estimate: `$${cost.toFixed(2)}`,
      };

      if (failedCount > 0) {
        console.warn(`[trigger:illustrate-book] ${failedCount}/${totalImages} images failed`);
        await updateBookStatus(payload.bookId, 'ready', {
          images: imagesData as unknown as Record<string, unknown>,
          last_error: `Illustration complete with ${failedCount} failed image(s). Use regenerate to retry.`,
        });
      } else {
        console.log(`[trigger:illustrate-book] All ${totalImages} images complete. Cost: $${cost.toFixed(2)}`);
        await updateBookStatus(payload.bookId, 'ready', {
          images: imagesData as unknown as Record<string, unknown>,
          last_error: null,
        });
      }

      console.log(`[trigger:illustrate-book] ========== TASK COMPLETE ==========`);
      return { success: true, bookId: payload.bookId, total: totalImages, failed: failedCount, cost: `$${cost.toFixed(2)}` };

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[trigger:illustrate-book] FATAL: ${errorMsg}`);
      const imagesData: ImagesData = {
        entries,
        anchor_url: anchorUrl,
        total_expected: totalImages,
        failed_count: entries.filter(e => e.status === 'failed').length,
        cost_estimate: '$0.00',
      };
      await updateBookStatus(payload.bookId, 'ready', {
        images: entries.length > 0 ? imagesData as unknown as Record<string, unknown> : null,
        last_error: `Illustration failed: ${errorMsg}`,
      });
      throw err;
    }
  },
});
