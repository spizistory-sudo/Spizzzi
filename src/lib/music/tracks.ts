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
    name: 'פלא קסום',
    description: 'קסום ומכשף, עם פעמונים עדינים וכלי מיתר רכים',
    storage_url: '/music/magical-wonder.mp3',
    mood: ['magical', 'happy', 'excited'],
    category: 'קסום',
    duration_seconds: 120,
  },
  {
    id: 'adventure-awaits',
    name: 'ההרפתקה מחכה',
    description: 'מקצב גיבורי וקופצני, מושלם לסיפורי הרפתקאות',
    storage_url: '/music/adventure-awaits.mp3',
    mood: ['adventurous', 'excited', 'triumphant'],
    category: 'הרפתקה',
    duration_seconds: 120,
  },
  {
    id: 'gentle-dreams',
    name: 'חלומות עדינים',
    description: 'פסנתר רך וצלילי רקע, מושלם לסיפורי לילה',
    storage_url: '/music/gentle-dreams.mp3',
    mood: ['calm', 'cozy'],
    category: 'לפני השינה',
    duration_seconds: 120,
  },
  {
    id: 'playful-day',
    name: 'יום שובב',
    description: 'קליל ועליז, מושלם לסיפורים מצחיקים ושובבים',
    storage_url: '/music/playful-day.mp3',
    mood: ['happy', 'playful'],
    category: 'שובב',
    duration_seconds: 120,
  },
  {
    id: 'ocean-breeze',
    name: 'רוח ים',
    description: 'גלים שקטים ומנגינות עדינות להרפתקאות תת-מימיות',
    storage_url: '/music/ocean-breeze.mp3',
    mood: ['calm', 'magical'],
    category: 'טבע',
    duration_seconds: 120,
  },
  {
    id: 'starlight-journey',
    name: 'מסע כוכבים',
    description: 'אתרי וקוסמי, מושלם לסיפורי חלל',
    storage_url: '/music/starlight-journey.mp3',
    mood: ['magical', 'adventurous'],
    category: 'קסום',
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
