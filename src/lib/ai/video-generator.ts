import { isDevMode } from '@/lib/dev/config';

const SEEDANCE_API_URL = process.env.SEEDANCE_API_URL;
const SEEDANCE_API_KEY = process.env.SEEDANCE_API_KEY;

export async function generatePageAnimation(
  illustrationUrl: string,
  motionPrompt: string
): Promise<{ videoUrl: string; durationSeconds: number }> {
  if (isDevMode()) {
    console.log('[DEV_MODE] Skipping video animation');
    throw new Error('Video animation skipped in dev mode');
  }

  if (!SEEDANCE_API_URL || !SEEDANCE_API_KEY) {
    console.log('[video-generator] Seedance not configured, skipping animation');
    throw new Error('Seedance API not configured');
  }

  const submitResponse = await fetch(`${SEEDANCE_API_URL}/seedance-v2.0-i2v`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SEEDANCE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_id: 'seedance-i2v',
      prompt: motionPrompt,
      image_url: illustrationUrl,
      duration: 5,
      aspect_ratio: '16:9',
      quality: 'basic',
    }),
  });

  if (!submitResponse.ok) {
    throw new Error(`Seedance submit failed: ${submitResponse.status}`);
  }

  const { request_id } = await submitResponse.json();

  // Poll for completion
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000));

    const statusResponse = await fetch(
      `${SEEDANCE_API_URL}/status/${request_id}`,
      { headers: { Authorization: `Bearer ${SEEDANCE_API_KEY}` } }
    );
    const status = await statusResponse.json();

    if (status.status === 'completed') {
      return { videoUrl: status.output_url, durationSeconds: 5 };
    } else if (status.status === 'failed') {
      throw new Error(`Video generation failed: ${status.error}`);
    }
  }

  throw new Error('Video generation timed out');
}
