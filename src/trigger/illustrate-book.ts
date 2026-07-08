import { task } from "@trigger.dev/sdk/v3";
import { fal } from "@fal-ai/client";
import { getBook, updateBookStatus } from "@/lib/studio/db";
import { uploadImage } from "@/lib/supabase/storage";

function initFal() {
  fal.config({ credentials: process.env.FAL_KEY });
}

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
    if (referenceUrl) {
      input.image = [{ url: referenceUrl, type: 'reference' }];
    }
  } else if (referenceUrl) {
    input.image_urls = [referenceUrl];
    input.aspect_ratio = '4:3';
  } else {
    input.aspect_ratio = '4:3';
  }

  console.log(`[illustrate:callFal] ${modelId} input keys: ${Object.keys(input).join(', ')}`);

  let result: unknown;
  try {
    result = await fal.run(modelId as string, { input } as never);
  } catch (err: unknown) {
    const falErr = err as { status?: number; body?: unknown; message?: string };
    console.error(`[illustrate:callFal] ${modelId} error ${falErr.status || 'unknown'}:`, JSON.stringify(falErr.body ?? falErr.message ?? err));
    throw err;
  }
  const typed = result as FalImageResult;
  const url = typed?.data?.images?.[0]?.url;
  if (!url) throw new Error(`${modelId} returned no image. Response: ${JSON.stringify(result)}`);
  return { tempUrl: url, modelUsed: modelId };
}

async function generateWithFallback(
  prompt: string,
  referenceUrl?: string,
  isAnchor?: boolean,
): Promise<{ buffer: Buffer; modelUsed: string }> {
  const primaryModel = isAnchor ? PRIMARY_T2I : PRIMARY_I2I;

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
    const status = (err as { status?: number }).status;
    const isValidationError = status === 422;
    console.warn(`[illustrate] ${primaryModel} failed (${isValidationError ? '422 — skipping retry' : 'will fallback'}): ${err instanceof Error ? err.message : err}`);
  }

  try {
    console.log(`[illustrate] Trying fallback ${FALLBACK_MODEL}...`);
    const { tempUrl, modelUsed } = await callFal(FALLBACK_MODEL, prompt, referenceUrl);
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
  maxDuration: 3600,
  run: async (payload: { bookId: string }) => {
    console.log(`[trigger:illustrate-book] ========== TASK STARTED for ${payload.bookId} ==========`);
    console.log(`[trigger:illustrate-book] Env: FAL_KEY=${process.env.FAL_KEY ? 'set (' + process.env.FAL_KEY.slice(0, 8) + '...)' : 'MISSING'}, SUPABASE_URL=${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'MISSING'}, SERVICE_KEY=${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING'}`);

    initFal();

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

    // --- Resume: load existing images, skip completed ones ---
    const existingImages = book.images as unknown as ImagesData | null;
    const existingEntries = existingImages?.entries || [];
    const existingByKey = new Map<string, ImageEntry>();
    for (const e of existingEntries) {
      if (e.status === 'complete' && e.url) {
        existingByKey.set(`${e.type}-${e.page_or_chapter_n}`, e);
      }
    }
    const skipped = existingByKey.size;
    const toGenerate = imageJobs.filter(j => !existingByKey.has(`${j.type}-${j.n}`));

    if (skipped > 0) {
      console.log(`[trigger:illustrate-book] RESUME: ${skipped} images already stored, ${toGenerate.length} to generate`);
    }

    const estimatedCost = toGenerate.length * COST_PER_PRIMARY;
    console.log(`[trigger:illustrate-book] Estimated cost: $${estimatedCost.toFixed(2)} (${toGenerate.length} new images)`);

    if (toGenerate.length === 0) {
      console.log(`[trigger:illustrate-book] All ${totalImages} images already exist — nothing to generate`);
      await updateBookStatus(payload.bookId, 'ready', {
        images: existingImages as unknown as Record<string, unknown>,
        last_error: null,
      });
      return { success: true, bookId: payload.bookId, total: totalImages, failed: 0, skipped, cost: '$0.00' };
    }

    await updateBookStatus(payload.bookId, 'illustrating');
    console.log(`[trigger:illustrate-book] Status → 'illustrating'`);

    const preamble = buildPreamble(story);
    const entries: ImageEntry[] = [...existingEntries];
    let anchorUrl: string | null = existingImages?.anchor_url || null;

    try {
      // --- Anchor image (if not already stored) ---
      const anchorJob = imageJobs[0];
      const anchorKey = `${anchorJob.type}-${anchorJob.n}`;

      if (!existingByKey.has(anchorKey)) {
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
            prompt_used: `${preamble}\n\nSCENE: ${anchorJob.scene}`,
            model_used: 'none',
            url: '',
            status: 'failed',
            error: errorMsg,
          });
        }

        await saveProgress(payload.bookId, entries, anchorUrl, totalImages);
      } else {
        console.log(`[trigger:illustrate-book] Anchor already stored, skipping`);
      }

      // --- Remaining images in chunks (only those not already stored) ---
      const remainingToGenerate = toGenerate.filter(j => !(j === anchorJob && !existingByKey.has(anchorKey)));

      for (let i = 0; i < remainingToGenerate.length; i += CONCURRENCY) {
        const chunk = remainingToGenerate.slice(i, i + CONCURRENCY);
        console.log(`[trigger:illustrate-book] Chunk ${Math.floor(i / CONCURRENCY) + 1}: generating ${chunk.length} images (${entries.filter(e => e.status === 'complete').length}/${totalImages} complete so far)`);

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
