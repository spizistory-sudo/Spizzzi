/**
 * Generate 8 style preview images using FLUX Pro 1.1 via fal.ai.
 *
 * Usage:
 *   npx tsx scripts/generate-style-previews.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'images', 'styles');

const SCENE = 'A 6-year-old child standing in a magical forest at twilight, holding a small glowing book in both hands, looking curious and gently smiling. Lush trees, soft magical light, a sense of wonder. The child is the focal point of the composition. The illustration fills the entire frame edge to edge with no borders, no text, no words, no letters anywhere.';

// Import style prompts inline (can't use @ alias in scripts)
const STYLES: Array<{ key: string; stylePrompt: string }> = [
  { key: 'watercolor', stylePrompt: 'Authentic traditional watercolor painting on textured paper. Visible water bleeds, soft pigment washes, white paper showing through in highlights, organic uneven edges. Muted pastel palette — soft blues, gentle yellows, warm peach tones, dusty greens. Loose brush strokes. Style of Beatrix Potter and Winnie-the-Pooh. Avoid: digital cleanness, vector lines, 3D rendering, photorealism, anime, bold outlines.' },
  { key: 'comic', stylePrompt: 'Bold comic book illustration. Thick black ink outlines on every character and object, dynamic poses, flat saturated colors with halftone dots, no gradients. High-contrast: deep reds, electric blues, bright yellows, jet blacks. Exaggerated expressions. Style of Dog Man and modern children\'s graphic novels. Avoid: watercolor softness, photorealism, 3D, pastel colors.' },
  { key: 'anime', stylePrompt: 'Studio Ghibli-inspired anime illustration. Large expressive eyes with detailed iris reflections, soft cel-shaded skin and clothing, magical atmospheric lighting with visible sparkles, lush detailed backgrounds. Jewel tones — deep blues, rich purples, warm sunset oranges, emerald greens. Style of Spirited Away, My Neighbor Totoro. Avoid: comic outlines, photorealism, watercolor, 3D rendering.' },
  { key: 'claymation', stylePrompt: 'Stop-motion claymation 3D style. Characters appear hand-sculpted from clay, with visible fingerprints, sculptural seams, matte textured surfaces. Soft warm studio lighting. Muted earthy colors. Chunky rounded proportions. Miniature handcrafted sets. Style of Wallace & Gromit, Shaun the Sheep. Avoid: 2D illustration, watercolor, anime, sharp digital edges, glossy CGI.' },
  { key: 'minimalist', stylePrompt: 'Minimalist hand-drawn doodle illustration. Simple confident line work, generous white space, limited palette of 3-5 colors. Imperfect hand-drawn quality, slight wobbles. Characters drawn with fewest possible lines. No detailed backgrounds. Style of Mo Willems, Oliver Jeffers, Jon Klassen. Avoid: detailed rendering, photorealism, 3D, gradients, complex backgrounds.' },
  { key: 'storybook', stylePrompt: 'Rich painterly golden age children\'s book illustration. Warm oil-painted or gouache texture with visible brush work, deep saturated jewel tones — burgundy, forest green, gold, deep blue. Atmospheric chiaroscuro lighting. Realistic but slightly idealized proportions. Style of Arthur Rackham, N.C. Wyeth, Maurice Sendak. Avoid: digital sharpness, watercolor pastels, comic outlines, 3D, anime, minimalism.' },
  { key: 'pixar', stylePrompt: 'Modern 3D animated Pixar/Disney style. Smooth 3D rendered characters with soft subsurface skin shading, cinematic lighting with rim lights, hyper-expressive faces with large eyes. Vibrant saturated colors with realistic light. Rounded friendly proportions. Style of Up, Coco, Inside Out, Tangled. Avoid: 2D illustration, flat colors, watercolor, comic outlines, hand-painted textures.' },
  { key: 'vintage', stylePrompt: 'Vintage mid-century children\'s book illustration. Limited retro palette of muted oranges, ochres, teals, creams. Visible printing texture, slight color registration imperfections, grainy paper feel. Clean simple shapes with vintage charm. Flat color blocks with simple patterns. Style of 1950s-60s — Mary Blair, Richard Scarry. Avoid: modern digital cleanness, photorealism, 3D, anime, saturated vivid colors.' },
];

async function generateTile(style: { key: string; stylePrompt: string }, falKey: string): Promise<void> {
  const outPath = path.join(OUTPUT_DIR, `${style.key}.jpg`);

  if (fs.existsSync(outPath)) {
    console.log(`[skip] ${style.key}.jpg already exists`);
    return;
  }

  const prompt = `${style.stylePrompt}\n\nScene: ${SCENE}`;
  console.log(`[gen] ${style.key}.jpg ...`);

  const submitRes = await fetch('https://queue.fal.run/fal-ai/flux-pro/v1.1', {
    method: 'POST',
    headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      image_size: 'square',
      num_images: 1,
      enable_safety_checker: true,
      output_format: 'jpeg',
    }),
  });

  if (!submitRes.ok) {
    const body = await submitRes.text();
    console.error(`[fail] ${style.key}: submit failed (${submitRes.status}): ${body}`);
    return;
  }

  const { request_id, response_url } = await submitRes.json();
  console.log(`[queued] ${style.key} — ${request_id}`);

  const statusUrl = `https://queue.fal.run/fal-ai/flux-pro/v1.1/requests/${request_id}/status`;
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const statusRes = await fetch(statusUrl, { headers: { 'Authorization': `Key ${falKey}` } });
    if (!statusRes.ok) continue;
    const status = await statusRes.json();
    if (status.status === 'COMPLETED') break;
    if (status.status === 'FAILED') { console.error(`[fail] ${style.key}: generation failed`); return; }
  }

  const resultRes = await fetch(response_url, { headers: { 'Authorization': `Key ${falKey}` } });
  if (!resultRes.ok) { console.error(`[fail] ${style.key}: result fetch failed`); return; }

  const result = await resultRes.json();
  const imageUrl = result?.images?.[0]?.url;
  if (!imageUrl) { console.error(`[fail] ${style.key}: no image in result`); return; }

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) { console.error(`[fail] ${style.key}: download failed`); return; }

  const buffer = Buffer.from(await imgRes.arrayBuffer());
  fs.writeFileSync(outPath, buffer);
  console.log(`[done] ${style.key}.jpg — ${(buffer.length / 1024).toFixed(0)} KB`);
}

async function main() {
  const falKey = process.env.FAL_KEY;
  if (!falKey) { console.error('FAL_KEY not set'); process.exit(1); }
  console.log(`[init] FAL_KEY loaded: ${falKey.substring(0, 8)}...`);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const style of STYLES) {
    await generateTile(style, falKey);
  }
  console.log('\nAll style previews generated.');
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
