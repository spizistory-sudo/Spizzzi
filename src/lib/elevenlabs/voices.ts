export interface NarratorVoice {
  id: string;
  voiceId: string;
  name: string;
  description: string;
  gender: 'female' | 'male';
  tone: string;
}

export const NARRATOR_VOICES: NarratorVoice[] = [
  {
    id: 'warm-female',
    voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel
    name: 'Rachel',
    description: 'Warm and gentle, perfect for bedtime stories',
    gender: 'female',
    tone: 'warm',
  },
  {
    id: 'friendly-male',
    voiceId: '29vD33N1CtxCmqQRPOHJ', // Drew
    name: 'Drew',
    description: 'Friendly and clear, great for adventure stories',
    gender: 'male',
    tone: 'friendly',
  },
  {
    id: 'playful-female',
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella
    name: 'Bella',
    description: 'Playful and expressive, brings characters to life',
    gender: 'female',
    tone: 'playful',
  },
  {
    id: 'storyteller-male',
    voiceId: 'ErXwobaYiN019PkySvjV', // Antoni
    name: 'Antoni',
    description: 'Classic storyteller voice, rich and engaging',
    gender: 'male',
    tone: 'storyteller',
  },
  {
    id: 'soft-female',
    voiceId: 'MF3mGyEYCl7XYWbV9V6O', // Emily
    name: 'Emily',
    description: 'Soft and soothing, ideal for calming stories',
    gender: 'female',
    tone: 'soft',
  },
];

export function getVoiceById(id: string): NarratorVoice | undefined {
  return NARRATOR_VOICES.find((v) => v.id === id);
}
