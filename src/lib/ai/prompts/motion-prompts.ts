export const THEME_MOTION_PROMPTS: Record<string, string> = {
  superhero: 'Gentle breeze flowing through hair and cape, sparkles of energy around hands, clouds drifting slowly',
  underwater: 'Gentle underwater current, small bubbles rising slowly, sea plants swaying softly, fish swimming lazily',
  chef: 'Gentle steam rising from cooking pot, small sparkles around magical food, soft warm lighting flickering',
  space: 'Stars twinkling softly, slow nebula drift, gentle floating motion in zero gravity',
  dinosaur: 'Gentle swaying of prehistoric plants, soft dust particles floating, dinosaur breathing subtly',
  fairy: 'Fireflies blinking softly, flower petals falling gently, magical sparkles drifting, wings fluttering',
  pirate: 'Gentle ocean waves, ship rocking softly, clouds drifting, flag waving in breeze',
  sports: 'Gentle wind, leaves or confetti drifting, crowd movement in background',
  music: 'Musical notes floating through air, instruments gently vibrating, forest leaves swaying',
  winter: 'Snowflakes falling gently, soft wind, breath visible in cold air, northern lights shifting slowly',
};

export function getMotionPrompt(themeSlug: string): string {
  const baseMotion = THEME_MOTION_PROMPTS[themeSlug] || 'Gentle ambient motion, soft lighting changes, subtle movement';
  return `Animate this children's book illustration with gentle, looping motion. Keep the character mostly still but add ambient life to the scene. ${baseMotion}. The animation should feel calming and magical. Loop seamlessly.`;
}
