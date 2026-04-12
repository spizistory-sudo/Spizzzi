import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

let client: ElevenLabsClient | null = null;

export function getElevenLabsClient(): ElevenLabsClient {
  if (!client) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY is not set');
    }
    client = new ElevenLabsClient({ apiKey });
  }
  return client;
}
