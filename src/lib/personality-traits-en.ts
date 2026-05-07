/**
 * StoryMagic English — Personality Traits
 *
 * 15 traits that describe HOW a child shows up in the world.
 * Selected by the parent during the wizard (max 4).
 * Used by the curation engine to score story fit, and by the generation prompt
 * to shape how the protagonist is written.
 */

export interface PersonalityTrait {
  id: string;
  label: string;             // What the parent sees
  description: string;       // Tooltip / longer description
  prompt_instruction: string; // Sent to Claude during story generation — tells Claude HOW to express this trait in the story
  category: 'social' | 'emotional' | 'cognitive' | 'energy' | 'values';
}

export const PERSONALITY_TRAITS: PersonalityTrait[] = [
  // Social
  {
    id: 'kind',
    label: 'Kind',
    description: 'Looks out for others, naturally caring',
    prompt_instruction:
      'Show the child noticing others\' needs and acting on them without being asked. Let kindness be the default response, not a calculated choice.',
    category: 'social',
  },
  {
    id: 'shy',
    label: 'Shy',
    description: 'Slow to warm up, prefers to observe first',
    prompt_instruction:
      'The child watches before joining. They take time to feel safe. Their bravery is quiet, not loud — and when they speak or act, it matters more because of the holding back.',
    category: 'social',
  },
  {
    id: 'loyal',
    label: 'Loyal',
    description: 'Sticks with friends and family through anything',
    prompt_instruction:
      'Show the child returning to the people who matter even when it would be easier to walk away. Their loyalty is steady, not blind.',
    category: 'social',
  },

  // Emotional
  {
    id: 'sensitive',
    label: 'Sensitive',
    description: 'Feels deeply, notices what others miss',
    prompt_instruction:
      'The child feels things at full volume. Show them noticing emotional currents others miss. Honor their depth without making it a weakness.',
    category: 'emotional',
  },
  {
    id: 'gentle',
    label: 'Gentle',
    description: 'Quiet, soft, careful with others',
    prompt_instruction:
      'The child moves through the world softly. They handle creatures and feelings with care. Their power is in their tenderness.',
    category: 'emotional',
  },
  {
    id: 'thoughtful',
    label: 'Thoughtful',
    description: 'Considers things before acting',
    prompt_instruction:
      'Show the child pausing before they act. They weigh options, notice details others miss, and their decisions feel earned.',
    category: 'emotional',
  },

  // Cognitive
  {
    id: 'curious',
    label: 'Curious',
    description: 'Asks questions, loves to explore',
    prompt_instruction:
      'The child asks "why" and "what if." Their curiosity drives the story forward. Let them notice things others walk past.',
    category: 'cognitive',
  },
  {
    id: 'creative',
    label: 'Creative',
    description: 'Makes things, imagines, builds new ideas',
    prompt_instruction:
      'Show the child making, building, or imagining. They solve problems with original ideas, not formulas. Let their solution feel like theirs.',
    category: 'cognitive',
  },
  {
    id: 'clever',
    label: 'Clever',
    description: 'Solves puzzles, thinks ahead',
    prompt_instruction:
      'The child sees patterns and connections quickly. They solve problems through thinking. But never let cleverness replace heart.',
    category: 'cognitive',
  },
  {
    id: 'imaginative',
    label: 'Imaginative',
    description: 'Sees worlds others miss',
    prompt_instruction:
      'The child sees magic in ordinary things. Their imagination is real to them, and the story should treat it as real too.',
    category: 'cognitive',
  },

  // Energy
  {
    id: 'brave',
    label: 'Brave',
    description: 'Faces fears, takes the lead',
    prompt_instruction:
      'Bravery is not the absence of fear. Show the child afraid, then choosing to act anyway. Make the fear real before the action.',
    category: 'energy',
  },
  {
    id: 'energetic',
    label: 'Energetic',
    description: 'Bursts of action, hard to slow down',
    prompt_instruction:
      'The child has a body full of motion. They run, climb, jump. Let their energy drive scenes — and find moments where stillness costs them something real.',
    category: 'energy',
  },
  {
    id: 'playful',
    label: 'Playful',
    description: 'Silly, light-hearted, finds the joke',
    prompt_instruction:
      'The child finds the funny in things. They make small jokes, see absurdity, lighten heavy moments. Their playfulness is a gift to others.',
    category: 'energy',
  },
  {
    id: 'friendly',
    label: 'Friendly',
    description: 'Easy to know, warm to strangers',
    prompt_instruction:
      'The child opens easily to others. They make friends quickly because they offer warmth first. Show them being the one who says hello.',
    category: 'energy',
  },

  // Values
  {
    id: 'persistent',
    label: 'Persistent',
    description: 'Tries again after failing',
    prompt_instruction:
      'Show the child failing and trying again. Don\'t skip the failure or rush past the frustration. The persistence is the story.',
    category: 'values',
  },
  {
    id: 'honest',
    label: 'Honest',
    description: 'Tells the truth, even when it\'s hard',
    prompt_instruction:
      'The child tells the truth. Sometimes it costs them something. Honor what honesty costs and what it earns.',
    category: 'values',
  },
  {
    id: 'patient',
    label: 'Patient',
    description: 'Waits well, takes their time',
    prompt_instruction:
      'The child can wait. They don\'t rush important things. Let scenes slow down with them, and let their patience earn something — trust, friendship, mastery.',
    category: 'values',
  },
];

export function getTraitById(id: string): PersonalityTrait | undefined {
  return PERSONALITY_TRAITS.find((t) => t.id === id);
}

export function getTraitsByIds(ids: string[]): PersonalityTrait[] {
  return ids.map((id) => getTraitById(id)).filter((t): t is PersonalityTrait => t !== undefined);
}
