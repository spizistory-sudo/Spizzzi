/**
 * Generate 3 hero card illustrations for the landing page using FLUX Pro 1.1.
 *
 * Usage:
 *   npx tsx scripts/generate-landing-illustrations.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'images', 'landing');

interface TileSpec {
  filename: string;
  prompt: string;
}

const TILES: TileSpec[] = [
  {
    filename: 'pick-a-story.jpg',
    prompt:
      'A child standing before a magical floating bookshelf, dozens of glowing storybooks suspended in the air around them, warm golden magical light, sparkles, dreamy fantasy atmosphere, Pixar-style children\'s book illustration, soft painterly style, vibrant colors, cinematic composition',
  },
  {
    filename: 'make-it-theirs.jpg',
    prompt:
      'An open magical storybook with a child\'s photo on one page transforming into a hand-drawn illustrated character on the facing page, golden sparkles flowing from the photo into the illustration, dreamy fantasy atmosphere, Pixar-style children\'s book illustration, soft painterly style, vibrant colors, cinematic composition',
  },
  {
    filename: 'read-and-listen.jpg',
    prompt:
      'A cozy bedroom at night, a child in bed reading an open glowing book, soft golden light from the pages, music notes and stars floating gently from the book into the air, warm magical atmosphere, Pixar-style children\'s book illustration, soft painterly style, vibrant colors, cinematic composition',
  },
];

async function generateTile(tile: TileSpec, falKey: string): Promise<void> {
  const outPath = path.join(OUTPUT_DIR, tile.filename);

  if (fs.existsSync(outPath)) {
    console.log(`[skip] ${tile.filename} already exists`);
    return;
  }

  console.log(`[gen] ${tile.filename} ...`);

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

  for (const tile of TILES) {
    await generateTile(tile, falKey);
  }

  console.log('\nAll landing illustrations generated.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
