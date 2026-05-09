/**
 * Generate 7 cinematic category tile images using FLUX Pro 1.1 via fal.ai.
 *
 * Usage:
 *   npx tsx scripts/generate-category-tiles.ts
 *
 * Requires FAL_KEY env var (loaded from .env.local via dotenv).
 */

import * as fs from 'fs';
import * as path from 'path';

// Load env from .env.local
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'images', 'categories');

interface TileSpec {
  filename: string;
  prompt: string;
}

const STYLE_SUFFIX = ", children's book illustration, soft painterly digital art, warm bright colors, Pixar-inspired key art, joyful and inviting, full-bleed composition, no text, no logos";

const TILES: TileSpec[] = [
  {
    filename: 'big-adventures.jpg',
    prompt:
      'A cheerful child with a backpack standing at the start of a winding path through a magical forest, waterfall in the distance, golden sunlight, sense of adventure and wonder, soft blues and greens' + STYLE_SUFFIX,
  },
  {
    filename: 'animal-friends.jpg',
    prompt:
      'A smiling child sitting in a flower meadow surrounded by friendly cartoon animals — a fox, a rabbit, a deer, butterflies — sunny afternoon, lush greens and warm yellows, magical atmosphere' + STYLE_SUFFIX,
  },
  {
    filename: 'all-my-feelings.jpg',
    prompt:
      'A cozy scene of a small child sitting on a soft armchair holding a teddy bear, soft warm lamp light, gentle pastel colors — pinks, peaches, soft yellows — comforting and warm, NOT sad' + STYLE_SUFFIX,
  },
  {
    filename: 'i-can-do-it.jpg',
    prompt:
      'A joyful child triumphantly raising their arms at the top of a small grassy hill, sun bursting behind them, butterflies and birds, vibrant greens and yellows, sense of confidence and triumph' + STYLE_SUFFIX,
  },
  {
    filename: 'family-and-friends.jpg',
    prompt:
      'A happy multi-generational moment — grandparent and child laughing together while baking cookies in a warm sunny kitchen, soft yellows and warm wood tones, cozy and loving' + STYLE_SUFFIX,
  },
  {
    filename: 'wonders-of-the-world.jpg',
    prompt:
      'A wonder-filled child gazing up at a magical scene — floating planets, glowing stars, swirling galaxies — surrounded by soft purple and pink nebula colors, dreamy and magical, NOT dark' + STYLE_SUFFIX,
  },
  {
    filename: 'cozy-and-calm.jpg',
    prompt:
      'A peaceful child curled up reading a book in a soft window nook with a cat beside them, warm candlelight inside, gentle moonlight outside, soft pastel blues and creams, dreamy bedtime feeling' + STYLE_SUFFIX,
  },
];

async function generateTile(tile: TileSpec, falKey: string): Promise<void> {
  const outPath = path.join(OUTPUT_DIR, tile.filename);

  // Skip if already exists
  if (fs.existsSync(outPath)) {
    console.log(`[skip] ${tile.filename} already exists`);
    return;
  }

  console.log(`[gen] ${tile.filename} ...`);

  // Submit to queue
  const submitRes = await fetch('https://queue.fal.run/fal-ai/flux-pro/v1.1', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: tile.prompt,
      image_size: 'landscape_4_3',
      num_images: 1,
      enable_safety_checker: true,
      output_format: 'jpeg',
    }),
  });

  if (!submitRes.ok) {
    const body = await submitRes.text();
    console.error(`[fail] ${tile.filename}: submit failed (${submitRes.status}): ${body}`);
    return;
  }

  const { request_id, response_url } = await submitRes.json();
  console.log(`[queued] ${tile.filename} — request_id: ${request_id}`);

  // Poll for completion
  const statusUrl = `https://queue.fal.run/fal-ai/flux-pro/v1.1/requests/${request_id}/status`;
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const statusRes = await fetch(statusUrl, {
      headers: { 'Authorization': `Key ${falKey}` },
    });
    if (!statusRes.ok) continue;
    const status = await statusRes.json();
    if (status.status === 'COMPLETED') break;
    if (status.status === 'FAILED') {
      console.error(`[fail] ${tile.filename}: generation failed`);
      return;
    }
  }

  // Fetch result
  const resultRes = await fetch(response_url, {
    headers: { 'Authorization': `Key ${falKey}` },
  });
  if (!resultRes.ok) {
    console.error(`[fail] ${tile.filename}: result fetch failed (${resultRes.status})`);
    return;
  }

  const result = await resultRes.json();
  const imageUrl = result?.images?.[0]?.url;
  if (!imageUrl) {
    console.error(`[fail] ${tile.filename}: no image in result`);
    return;
  }

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    console.error(`[fail] ${tile.filename}: image download failed (${imgRes.status})`);
    return;
  }

  const buffer = Buffer.from(await imgRes.arrayBuffer());
  fs.writeFileSync(outPath, buffer);
  console.log(`[done] ${tile.filename} — ${(buffer.length / 1024).toFixed(0)} KB`);
}

async function main() {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    console.error('FAL_KEY not set');
    process.exit(1);
  }
  console.log(`[init] FAL_KEY loaded: ${falKey.substring(0, 8)}...`);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Generate sequentially to avoid rate limits
  for (const tile of TILES) {
    await generateTile(tile, falKey);
  }

  console.log('\nAll tiles generated.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
