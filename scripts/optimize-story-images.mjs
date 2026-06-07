import sharp from 'sharp';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const DIR = 'public/images/stories';

const files = (await readdir(DIR)).filter(f => f.toLowerCase().endsWith('.png'));
console.log(`[optimize] Found ${files.length} PNG files`);

let beforeTotal = 0;
let afterTotal = 0;

for (const file of files) {
  const inPath = path.join(DIR, file);
  const outPath = path.join(DIR, file.replace(/\.png$/i, '.webp'));

  const before = (await stat(inPath)).size;
  beforeTotal += before;

  await sharp(inPath)
    .resize(1200, 800, { fit: 'cover', position: 'centre' })
    .webp({ quality: 80 })
    .toFile(outPath);

  const after = (await stat(outPath)).size;
  afterTotal += after;

  console.log(`[optimize] ${file} → ${path.basename(outPath)}  ${(before/1e6).toFixed(2)}MB → ${(after/1024).toFixed(0)}KB`);
}

console.log(`\n[optimize] DONE. Total ${(beforeTotal/1e6).toFixed(1)}MB → ${(afterTotal/1e6).toFixed(1)}MB across ${files.length} files`);
