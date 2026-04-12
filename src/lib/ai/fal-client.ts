import { fal } from '@fal-ai/client';

fal.config({
  credentials: process.env.FAL_KEY,
});

type FluxAspectRatio = 'portrait_4_3' | 'portrait_16_9' | 'landscape_4_3' | 'landscape_16_9' | 'square_hd' | 'square';

interface FluxResult {
  data: {
    images: Array<{ url: string; content_type: string }>;
  };
}

export async function generateImageWithFlux(
  prompt: string,
  options: {
    aspectRatio?: FluxAspectRatio;
  } = {}
): Promise<Buffer> {
  const aspectRatio = options.aspectRatio || 'portrait_4_3';

  console.log(`[fal/flux] Generating image, aspect: ${aspectRatio}, prompt length: ${prompt.length}`);

  const result = await fal.subscribe('fal-ai/flux-pro/v1.1', {
    input: {
      prompt,
      image_size: aspectRatio,
      num_images: 1,
      enable_safety_checker: true,
      output_format: 'png',
    },
  }) as FluxResult;

  console.log(`[fal/flux] Response received:`, {
    imageCount: result.data?.images?.length,
    firstImageUrl: result.data?.images?.[0]?.url?.substring(0, 80) + '...',
  });

  const imageUrl = result.data?.images?.[0]?.url;
  if (!imageUrl) {
    throw new Error('FLUX.2 Pro returned no image');
  }

  // Download the image and return as Buffer
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download FLUX image: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
