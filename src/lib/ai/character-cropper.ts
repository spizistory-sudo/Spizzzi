import { getGeminiClient } from './gemini';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

export type CharacterCrop = {
  name: string;
  storagePath: string;
  publicUrl: string;
  base64: string;
};

type BoundingBox = { x: number; y: number; width: number; height: number };

export async function extractCharacterBoundingBoxes(
  coverImageBase64: string,
  characters: string[],
): Promise<Record<string, BoundingBox | null>> {
  if (characters.length === 0) return {};

  const ai = getGeminiClient();
  console.log('[character-cropper] Extracting bounding boxes for:', characters);

  const prompt = `The attached image is a children's book cover. For each character listed below, return their bounding box on the image. Bounding box is in normalized coordinates 0-1000.

Characters to locate: ${characters.join(', ')}

Return ONLY valid JSON, no other text:
{
${characters.map(c => `  "${c}": { "y_min": 0, "x_min": 0, "y_max": 0, "x_max": 0 }`).join(',\n')}
}

If a character is not visible in the image, return null for that character's value. Use integers 0-1000 representing normalized image coordinates.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType: 'image/png', data: coverImageBase64 } },
        { text: prompt },
      ],
    }],
  });

  const text = (response.text || '').trim();
  const cleaned = text.replace(/```json\n?|```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned) as Record<string, { y_min: number; x_min: number; y_max: number; x_max: number } | null>;

  // Get image dimensions to convert normalized coords to pixels
  const imgBuffer = Buffer.from(coverImageBase64, 'base64');
  const metadata = await sharp(imgBuffer).metadata();
  const imgW = metadata.width || 1024;
  const imgH = metadata.height || 1024;

  const result: Record<string, BoundingBox | null> = {};
  for (const [name, box] of Object.entries(parsed)) {
    if (!box) {
      result[name] = null;
      continue;
    }
    const x = Math.round((box.x_min / 1000) * imgW);
    const y = Math.round((box.y_min / 1000) * imgH);
    const w = Math.round(((box.x_max - box.x_min) / 1000) * imgW);
    const h = Math.round(((box.y_max - box.y_min) / 1000) * imgH);
    result[name] = { x, y, width: w, height: h };
  }

  console.log('[character-cropper] Bounding boxes:', result);
  return result;
}

export async function cropAndUploadCharacters(
  coverImageBuffer: Buffer,
  boundingBoxes: Record<string, BoundingBox | null>,
  bookId: string,
): Promise<CharacterCrop[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const metadata = await sharp(coverImageBuffer).metadata();
  const imgW = metadata.width || 1024;
  const imgH = metadata.height || 1024;

  const crops: CharacterCrop[] = [];

  for (const [name, box] of Object.entries(boundingBoxes)) {
    if (!box) continue;

    // Add ~10% padding
    const pad = Math.round(Math.max(box.width, box.height) * 0.1);
    const left = Math.max(0, box.x - pad);
    const top = Math.max(0, box.y - pad);
    const width = Math.min(box.width + pad * 2, imgW - left);
    const height = Math.min(box.height + pad * 2, imgH - top);

    if (width < 20 || height < 20) {
      console.warn(`[character-cropper] Skipping ${name}: crop too small (${width}x${height})`);
      continue;
    }

    try {
      const croppedBuffer = await sharp(coverImageBuffer)
        .extract({ left, top, width, height })
        .png()
        .toBuffer();

      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const storagePath = `${bookId}/character-${slug}.png`;

      const { error } = await supabase.storage
        .from('covers')
        .upload(storagePath, croppedBuffer, { contentType: 'image/png', upsert: true });

      if (error) {
        console.error(`[character-cropper] Upload failed for ${name}:`, error.message);
        continue;
      }

      const { data: urlData } = supabase.storage.from('covers').getPublicUrl(storagePath);

      crops.push({
        name,
        storagePath,
        publicUrl: urlData.publicUrl,
        base64: croppedBuffer.toString('base64'),
      });

      console.log(`[character-cropper] Cropped ${name}: ${width}x${height}, ${Math.round(croppedBuffer.length / 1024)}KB`);
    } catch (err) {
      console.error(`[character-cropper] Crop failed for ${name}:`, err);
    }
  }

  console.log(`[character-cropper] ${crops.length}/${Object.keys(boundingBoxes).length} characters cropped`);
  return crops;
}
