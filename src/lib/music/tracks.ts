export interface MusicTrack {
  id: string;
  name: string;
  description: string;
  storage_url: string;
  mood: string[];
  category: string;
  duration_seconds: number;
}

// Hardcoded fallback tracks (used when music_tracks table doesn't exist yet)
export const FALLBACK_TRACKS: MusicTrack[] = [
  {
    id: 'magical-wonder',
    name: 'Magical Wonder',
    description: 'Whimsical and enchanting, with gentle bells and soft strings',
    storage_url: '/music/magical-wonder.mp3',
    mood: ['magical', 'happy', 'excited'],
    category: 'Whimsical',
    duration_seconds: 120,
  },
  {
    id: 'adventure-awaits',
    name: 'Adventure Awaits',
    description: 'Upbeat and heroic, perfect for action-packed stories',
    storage_url: '/music/adventure-awaits.mp3',
    mood: ['adventurous', 'excited', 'triumphant'],
    category: 'Adventure',
    duration_seconds: 120,
  },
  {
    id: 'gentle-dreams',
    name: 'Gentle Dreams',
    description: 'Soft piano and ambient sounds for bedtime stories',
    storage_url: '/music/gentle-dreams.mp3',
    mood: ['calm', 'cozy'],
    category: 'Bedtime',
    duration_seconds: 120,
  },
  {
    id: 'playful-day',
    name: 'Playful Day',
    description: 'Light and bouncy, great for fun and silly stories',
    storage_url: '/music/playful-day.mp3',
    mood: ['happy', 'playful'],
    category: 'Playful',
    duration_seconds: 120,
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    description: 'Calm waves and gentle melodies for underwater adventures',
    storage_url: '/music/ocean-breeze.mp3',
    mood: ['calm', 'magical'],
    category: 'Nature',
    duration_seconds: 120,
  },
  {
    id: 'starlight-journey',
    name: 'Starlight Journey',
    description: 'Ethereal and cosmic, perfect for space stories',
    storage_url: '/music/starlight-journey.mp3',
    mood: ['magical', 'adventurous'],
    category: 'Whimsical',
    duration_seconds: 120,
  },
];

export function suggestTrack(tracks: MusicTrack[], pageMoods: string[]): MusicTrack {
  const moodCounts: Record<string, number> = {};
  pageMoods.forEach((mood) => {
    moodCounts[mood] = (moodCounts[mood] || 0) + 1;
  });

  const dominantMood = Object.entries(moodCounts).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0];

  const match = tracks.find((t) => t.mood.includes(dominantMood || ''));
  return match || tracks[0];
}

export function getTrackById(id: string): MusicTrack | undefined {
  return FALLBACK_TRACKS.find((t) => t.id === id);
}
