import { DEFAULT_VOICE_ID } from '@/lib/elevenlabs/voices';
import { FALLBACK_TRACKS } from '@/lib/music/tracks';

export interface AutoSelection {
  voiceId: string;
  musicId: string;
}

const ENERGY_TO_MUSIC_CATEGORY: Record<string, string> = {
  warm: 'Whimsical',
  cozy: 'Bedtime',
  exciting: 'Adventure',
  brave: 'Adventure',
  dreamy: 'Nature',
  playful: 'Playful',
};

const CATEGORY_TO_MUSIC_CATEGORY: Record<string, string> = {
  big_adventures: 'Adventure',
  animal_friends: 'Nature',
  all_my_feelings: 'Whimsical',
  i_can_do_it: 'Adventure',
  family_and_friends: 'Whimsical',
  wonders_of_the_world: 'Whimsical',
  cozy_and_calm: 'Bedtime',
};

export function autoSelectFinalize(story: {
  id: string;
  category_id?: string;
  energy?: string;
}): AutoSelection {
  // Music: match by story energy first, then category, then default
  const energyMatch = story.energy ? ENERGY_TO_MUSIC_CATEGORY[story.energy] : undefined;
  const categoryMatch = story.category_id ? CATEGORY_TO_MUSIC_CATEGORY[story.category_id] : undefined;
  const targetCategory = energyMatch || categoryMatch || 'Whimsical';

  const matchedTrack = FALLBACK_TRACKS.find(t => t.category === targetCategory) || FALLBACK_TRACKS[0];

  // Voice: Sarah as safe default
  const voiceId = DEFAULT_VOICE_ID;

  console.log('[auto-finalize] Selected:', {
    voiceId,
    musicId: matchedTrack.id,
    musicCategory: targetCategory,
    reason: energyMatch ? `energy:${story.energy}` : categoryMatch ? `category:${story.category_id}` : 'default',
  });

  return {
    voiceId,
    musicId: matchedTrack.id,
  };
}
