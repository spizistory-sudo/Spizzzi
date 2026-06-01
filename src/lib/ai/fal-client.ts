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

  const imageUrl = result.data?.images?.[0]?.url;
  if (!imageUrl) {
    throw new Error('FLUX Pro returned no image');
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download FLUX image: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export type ReferenceImage = {
  base64: string;
  mimeType?: string;
  role: 'protagonist' | 'supporting_character' | 'cover' | 'photo' | 'style_preview';
};

interface Flux2Result {
  data: {
    images: Array<{ url: string; content_type: string }>;
  };
}

export async function generateImageWithFlux2Pro(
  prompt: string,
  options: {
    aspectRatio?: FluxAspectRatio;
    referenceImages?: ReferenceImage[];
  } = {}
): Promise<Buffer> {
  const aspectRatio = options.aspectRatio || 'portrait_4_3';
  const refs = options.referenceImages || [];

  console.log(`[fal/flux2pro] Generating with ${refs.length} reference images, aspect: ${aspectRatio}`);

  // Upload the protagonist crop (first reference) as the primary image_url anchor
  let imageUrl: string | undefined;
  const protagonistRef = refs.find(r => r.role === 'protagonist') || refs[0];
  if (protagonistRef) {
    try {
      const buffer = Buffer.from(protagonistRef.base64, 'base64');
      const blob = new Blob([buffer], { type: protagonistRef.mimeType || 'image/png' });
      const file = new File([blob], 'reference.png', { type: 'image/png' });
      const uploadedUrl = await fal.storage.upload(file);
      imageUrl = uploadedUrl;
      console.log(`[fal/flux2pro] Reference uploaded: ${protagonistRef.role}, url: ${uploadedUrl.substring(0, 60)}...`);
    } catch (uploadErr) {
      console.warn(`[fal/flux2pro] Failed to upload reference image:`, uploadErr);
    }
  }

  const result = await fal.run('fal-ai/flux-2-pro' as string, {
    input: {
      prompt,
      image_size: aspectRatio,
      num_images: 1,
      enable_safety_checker: true,
      output_format: 'png',
      ...(imageUrl ? { image_url: imageUrl, strength: 0.65 } : {}),
    } as never,
  }) as unknown as Flux2Result;

  const resultImageUrl = result.data?.images?.[0]?.url;
  if (!resultImageUrl) {
    throw new Error('FLUX.2 Pro returned no image');
  }

  console.log(`[fal/flux2pro] Image generated: ${resultImageUrl.substring(0, 60)}...`);

  const response = await fetch(resultImageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download FLUX.2 Pro image: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}
