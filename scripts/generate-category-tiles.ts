/**
 * Generate 7 cinematic category tile images using FLUX Pro 1.1 via fal.ai.
 *
 * Usage:
 *   npx tsx scripts/generate-category-tiles.ts
 *
 * Requires FAL_KEY env var (loaded from .env.local via dotenv).
 */

import { fal } from '@fal-ai/client';
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

const TILES: TileSpec[] = [
  {
    filename: 'big-adventures.jpg',
    prompt:
      'A small child seen from behind silhouetted on a hilltop at sunrise, vast landscape stretching ahead, distant mountains, golden hour cinematic light, painterly photographic style, deep saturated colors, atmospheric, sense of wonder, no faces visible',
  },
  {
    filename: 'animal-friends.jpg',
    prompt:
      'A child kneeling in tall meadow grass with a horse\'s head gently bent toward them, soft golden afternoon sun, painterly photographic style, warm tones, intimate and tender, child seen from behind or side, no face visible, cinematic',
  },
  {
    filename: 'all-my-feelings.jpg',
    prompt:
      'A small child sitting alone on a window seat looking out at rain, warm interior lamp light contrasting with cool blue rain outside, painterly photographic style, contemplative, cozy, intimate, child seen from behind, no face visible, cinematic',
  },
  {
    filename: 'i-can-do-it.jpg',
    prompt:
      'A child mid-leap across a stream in a sunny forest clearing, dynamic motion blur, sunlight breaking through tall trees in shafts, painterly photographic style, vibrant green and gold, sense of triumph and courage, child seen from side, no face visible, cinematic',
  },
  {
    filename: 'family-and-friends.jpg',
    prompt:
      'A child and an elderly person sitting together on a wooden porch swing at golden hour, warm intimate lighting, painterly photographic style, soft focus, evening light, both seen from behind, no faces visible, cinematic',
  },
  {
    filename: 'wonders-of-the-world.jpg',
    prompt:
      'A small child standing alone looking up at a vast night sky filled with stars and a glowing Milky Way, painterly photographic style, deep blues and purples, magical atmospheric light, sense of awe, child seen from behind in silhouette, no face visible, cinematic',
  },
  {
    filename: 'cozy-and-calm.jpg',
    prompt:
      'A small child curled up in a window seat wrapped in a soft blanket, single candle on the sill, twilight blue sky outside, painterly photographic style, intimate warm interior light, peaceful, child seen from side or behind, no face visible, cinematic',
  },
];

interface FluxResult {
  data: {
    images: Array<{ url: string; content_type: string }>;
  };
}

async function generateTile(tile: TileSpec): Promise<void> {
  const outPath = path.join(OUTPUT_DIR, tile.filename);

  // Skip if already exists
  if (fs.existsSync(outPath)) {
    console.log(`[skip] ${tile.filename} already exists`);
    return;
  }

  console.log(`[gen] ${tile.filename} ...`);

  const result = (await fal.subscribe('fal-ai/flux-pro/v1.1', {
    input: {
      prompt: tile.prompt,
      image_size: 'landscape_4_3',
      num_images: 1,
      enable_safety_checker: true,
      output_format: 'jpeg',
    },
  })) as FluxResult;

  const imageUrl = result.data?.images?.[0]?.url;
  if (!imageUrl) {
    console.error(`[fail] ${tile.filename}: no image returned`);
    return;
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    console.error(`[fail] ${tile.filename}: download failed (${response.status})`);
    return;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outPath, buffer);
  console.log(`[done] ${tile.filename} — ${(buffer.length / 1024).toFixed(0)} KB`);
}

async function main() {
  const falKey = process.env.FAL_KEY;
  console.log(`[init] FAL_KEY loaded: ${falKey ? falKey.substring(0, 8) + '...' : 'MISSING'}`);
  fal.config({ credentials: falKey });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Generate sequentially to avoid rate limits
  for (const tile of TILES) {
    await generateTile(tile);
  }

  console.log('\nAll tiles generated.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
