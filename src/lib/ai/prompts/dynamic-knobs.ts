export interface DynamicKnobs {
  point_of_view: 'first_person' | 'third_person';
  prose_style: 'lyrical' | 'everyday' | 'humorous' | 'mysterious';
  pacing: 'slow' | 'moderate' | 'fast';
  realism_level: 'realistic' | 'magical_realism' | 'fantasy';
  ending_type: 'closed' | 'open' | 'circular';
  supporting_character: 'parent' | 'sibling' | 'friend' | 'grandparent' | 'teacher' | 'magical_creature';
  setting: 'home' | 'kindergarten' | 'nature' | 'imaginary_place' | 'journey';
}

interface KnobConfig {
  [option: string]: number;
}

const TRAIT_WEIGHTS: Record<string, Partial<Record<keyof DynamicKnobs, KnobConfig>>> = {
  dreamy: {
    realism_level: { fantasy: 3, magical_realism: 2, realistic: 0 },
    prose_style: { lyrical: 3, mysterious: 2, everyday: 0 },
  },
  playful: {
    prose_style: { humorous: 3, everyday: 1 },
    pacing: { fast: 2, moderate: 1 },
  },
  curious: {
    setting: { nature: 2, imaginary_place: 2, journey: 2 },
    supporting_character: { magical_creature: 2, grandparent: 1 },
  },
  sensitive: {
    prose_style: { lyrical: 2 },
    pacing: { slow: 2, moderate: 1 },
    supporting_character: { parent: 2, grandparent: 2 },
  },
  brave: {
    pacing: { fast: 2 },
    setting: { journey: 3, nature: 2 },
  },
  loves_animals: {
    supporting_character: { magical_creature: 3 },
    setting: { nature: 3 },
  },
  loves_music: {
    prose_style: { lyrical: 3 },
  },
  loves_sports: {
    pacing: { fast: 2 },
    setting: { nature: 1 },
  },
  social: {
    supporting_character: { friend: 3, sibling: 1 },
  },
};

export function selectDynamicKnobs(input: { age: number; traits: string[] }): DynamicKnobs {
  const povOptions: DynamicKnobs['point_of_view'][] =
    input.age >= 6 ? ['first_person', 'third_person'] : ['third_person'];

  return {
    point_of_view: pickRandom(povOptions),
    prose_style: pickWeighted('prose_style',
      ['lyrical', 'everyday', 'humorous', 'mysterious'], input.traits),
    pacing: pickWeighted('pacing',
      ['slow', 'moderate', 'fast'], input.traits),
    realism_level: pickWeighted('realism_level',
      ['realistic', 'magical_realism', 'fantasy'], input.traits),
    ending_type: pickRandom(['closed', 'open', 'circular']),
    supporting_character: pickWeighted('supporting_character',
      ['parent', 'sibling', 'friend', 'grandparent', 'teacher', 'magical_creature'],
      input.traits),
    setting: pickWeighted('setting',
      ['home', 'kindergarten', 'nature', 'imaginary_place', 'journey'],
      input.traits),
  };
}

function pickWeighted<T extends string>(
  knobName: keyof DynamicKnobs,
  options: T[],
  traits: string[]
): T {
  const scores = new Map<T, number>(options.map(o => [o, 1]));
  traits.forEach(trait => {
    const traitConfig = TRAIT_WEIGHTS[trait];
    if (!traitConfig) return;
    const knobConfig = traitConfig[knobName];
    if (!knobConfig) return;
    Object.entries(knobConfig).forEach(([option, weight]) => {
      if (scores.has(option as T)) {
        scores.set(option as T, scores.get(option as T)! + (weight as number));
      }
    });
  });

  const total = Array.from(scores.values()).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [option, score] of scores.entries()) {
    r -= score;
    if (r <= 0) return option;
  }
  return options[0];
}

function pickRandom<T>(options: T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}
