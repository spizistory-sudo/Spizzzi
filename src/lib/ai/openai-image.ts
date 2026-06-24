import OpenAI from 'openai';

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

export interface GptImageRef {
  base64: string;
  mimeType?: string;
}

export async function generateImageWithGptImage2(params: {
  prompt: string;
  referenceImages?: GptImageRef[];
  size?: 'portrait' | 'landscape' | 'square';
}): Promise<Buffer> {
  const { prompt, referenceImages = [], size = 'portrait' } = params;
  const client = getClient();

  const sizeMap = { portrait: '1024x1536' as const, landscape: '1536x1024' as const, square: '1024x1024' as const };
  const imageSize = sizeMap[size];

  // Build input images array for GPT Image 2
  const inputImages: Array<{ image: string; detail?: 'auto' }> = [];
  for (const ref of referenceImages.slice(0, 4)) {
    const mime = ref.mimeType || 'image/png';
    inputImages.push({ image: `data:${mime};base64,${ref.base64}` });
  }

  console.log(`[gpt-image-2] Generating with ${inputImages.length} reference images, size: ${imageSize}, prompt length: ${prompt.length}`);

  const response = await client.images.generate({
    model: 'gpt-image-1',
    prompt,
    n: 1,
    size: imageSize,
    output_format: 'png',
    ...(inputImages.length > 0 ? { image: inputImages.map(i => i.image) } : {}),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  const result = response as { data?: Array<{ b64_json?: string; url?: string }> };
  const imageData = result.data?.[0];
  if (!imageData) throw new Error('GPT Image 2 returned no image');

  if (imageData.b64_json) {
    console.log(`[gpt-image-2] Image generated (base64), ${imageData.b64_json.length} chars`);
    return Buffer.from(imageData.b64_json, 'base64');
  }

  if (imageData.url) {
    console.log(`[gpt-image-2] Image generated (URL), downloading...`);
    const res = await fetch(imageData.url);
    if (!res.ok) throw new Error(`Failed to download GPT Image 2 result: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  throw new Error('GPT Image 2: no image data in response');
}
