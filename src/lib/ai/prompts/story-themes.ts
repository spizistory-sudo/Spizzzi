import type { ThemeDefinition } from '@/types/theme';

export const THEMES: Record<string, ThemeDefinition> = {
  superhero: {
    slug: 'superhero',
    name: 'My Superhero Adventure',
    category: 'superheroes',
    description:
      'The child discovers they have a special superpower and saves the day.',
    pageCount: 10,
    ageRange: [3, 8],
    emoji: '🦸',
    promptTemplate: `
Write a {pageCount}-page children's story for a {age}-year-old child named {childName}.

STORY PREMISE:
{childName} discovers they have a special superpower: {trait_power}. At first they don't know how to control it, but with practice and courage, they use it to help their community.

CHILD TRAITS TO WEAVE IN: {traits}

REQUIREMENTS:
- The superpower should relate to the child's personality traits.
- Include a friendly sidekick (an animal or magical creature).
- The challenge should be age-appropriate (lost kitten, broken bridge, missing toy — NOT villains or danger).
- End with the community thanking {childName}.
`,
  },
  underwater: {
    slug: 'underwater',
    name: 'Deep Sea Discovery',
    category: 'animals',
    description:
      'An underwater adventure where the child befriends sea creatures and discovers a hidden treasure.',
    pageCount: 10,
    ageRange: [3, 8],
    emoji: '🐠',
    promptTemplate: `
Write a {pageCount}-page children's story for a {age}-year-old child named {childName}.

STORY PREMISE:
{childName} puts on a magical diving suit and sinks to the bottom of the ocean, where friendly sea creatures welcome them. Together they search for a legendary lost treasure.

CHILD TRAITS TO WEAVE IN: {traits}

REQUIREMENTS:
- Include at least 3 different sea creatures as characters (e.g., dolphin, octopus, sea turtle).
- The treasure should be something meaningful, not just gold — maybe a pearl that lights up the deep sea.
- The child should use their unique traits to solve problems along the way.
- End with a celebration underwater.
`,
  },
  chef: {
    slug: 'chef',
    name: 'The Magical Kitchen',
    category: 'food',
    description:
      'The child discovers a kitchen where ingredients come alive and they cook a magical dish.',
    pageCount: 10,
    ageRange: [3, 8],
    emoji: '👨‍🍳',
    promptTemplate: `
Write a {pageCount}-page children's story for a {age}-year-old child named {childName}.

STORY PREMISE:
{childName} discovers a magical kitchen where ingredients talk, pots stir themselves, and recipes come to life. They must cook a very special dish to help a friend.

CHILD TRAITS TO WEAVE IN: {traits}

REQUIREMENTS:
- The ingredients should be friendly characters with distinct personalities.
- Include sensory descriptions of colors, smells, and textures.
- The magical dish should solve a problem (e.g., a cake that makes someone feel better, soup that warms a cold village).
- End with everyone enjoying the meal together.
`,
  },
  space: {
    slug: 'space',
    name: 'Journey to the Stars',
    category: 'adventure',
    description:
      'A space adventure where the child explores planets and meets friendly aliens.',
    pageCount: 10,
    ageRange: [3, 8],
    emoji: '🚀',
    promptTemplate: `
Write a {pageCount}-page children's story for a {age}-year-old child named {childName}.

STORY PREMISE:
{childName} builds a rocket ship from cardboard boxes that magically becomes real. They blast off into space and visit colorful planets, meeting friendly aliens who need help.

CHILD TRAITS TO WEAVE IN: {traits}

REQUIREMENTS:
- Visit at least 3 different planets, each with a unique characteristic.
- The aliens should be cute and non-threatening.
- Each planet visit should involve a small challenge that uses the child's traits.
- End with {childName} returning home with wonderful memories and a small gift from their alien friends.
`,
  },
  dinosaur: {
    slug: 'dinosaur',
    name: 'Dinosaur Day Out',
    category: 'animals',
    description:
      'The child time-travels back to the age of dinosaurs and makes prehistoric friends.',
    pageCount: 10,
    ageRange: [3, 8],
    emoji: '🦕',
    promptTemplate: `
Write a {pageCount}-page children's story for a {age}-year-old child named {childName}.

STORY PREMISE:
{childName} finds a magical fossil at the park. When they touch it, they're transported back to the time of dinosaurs! The dinosaurs are friendly and playful, and {childName} helps them with a problem.

CHILD TRAITS TO WEAVE IN: {traits}

REQUIREMENTS:
- Include at least 3 types of dinosaurs, with accurate names but friendly personalities.
- The dinosaurs should NOT be scary — they're gentle and curious.
- The problem should be age-appropriate (e.g., a baby dinosaur is lost, a river needs crossing).
- End with {childName} returning home with the fossil as a keepsake.
`,
  },
  fairy: {
    slug: 'fairy',
    name: 'The Enchanted Garden',
    category: 'fantasy',
    description:
      'The child shrinks down to fairy size and helps magical creatures in an enchanted garden.',
    pageCount: 10,
    ageRange: [3, 8],
    emoji: '🧚',
    promptTemplate: `
Write a {pageCount}-page children's story for a {age}-year-old child named {childName}.

STORY PREMISE:
{childName} discovers a tiny door hidden among the flowers in their garden. When they open it, they shrink to fairy size and enter a magical world inside the garden, where fairies, talking flowers, and friendly bugs live.

CHILD TRAITS TO WEAVE IN: {traits}

REQUIREMENTS:
- The garden world should be vividly described with magical details.
- Include talking flowers, helpful bugs, and tiny fairy characters.
- The challenge: a flower that gives the garden its magic is wilting, and {childName} must help revive it.
- End with the garden blooming more beautifully than ever.
`,
  },
  pirate: {
    slug: 'pirate',
    name: 'Treasure Island Quest',
    category: 'adventure',
    description:
      'The child becomes a friendly pirate captain and sails to discover hidden treasure.',
    pageCount: 10,
    ageRange: [3, 8],
    emoji: '🏴‍☠️',
    promptTemplate: `
Write a {pageCount}-page children's story for a {age}-year-old child named {childName}.

STORY PREMISE:
Captain {childName} sets sail on a colorful pirate ship with a friendly crew of animal pirates. They follow a treasure map across the sea, solving riddles at each stop.

CHILD TRAITS TO WEAVE IN: {traits}

REQUIREMENTS:
- The pirate crew should be friendly animals (parrot, monkey, cat, etc.).
- Include 3 stops on the treasure hunt, each with a fun riddle or challenge.
- The treasure should be something unexpected and heartwarming (not gold).
- End with the crew celebrating together on their ship.
`,
  },
  sports: {
    slug: 'sports',
    name: 'The Big Game',
    category: 'sports',
    description:
      'The child joins a team of animal friends for the biggest game of the year.',
    pageCount: 10,
    ageRange: [3, 8],
    emoji: '⚽',
    promptTemplate: `
Write a {pageCount}-page children's story for a {age}-year-old child named {childName}.

STORY PREMISE:
{childName} is invited to join a team of animal friends for the annual Forest Cup — a fun sports competition. The team is behind, but {childName}'s unique skills save the day.

CHILD TRAITS TO WEAVE IN: {traits}

REQUIREMENTS:
- The sport can be soccer, basketball, or a made-up magical sport.
- Each animal teammate has a special skill but also a funny weakness.
- The story should emphasize teamwork, not just winning.
- End with both teams celebrating together after the game.
`,
  },
  music: {
    slug: 'music',
    name: 'The Magic Concert',
    category: 'arts',
    description:
      'The child discovers magical instruments that create colorful sounds and puts on a concert.',
    pageCount: 10,
    ageRange: [3, 8],
    emoji: '🎵',
    promptTemplate: `
Write a {pageCount}-page children's story for a {age}-year-old child named {childName}.

STORY PREMISE:
{childName} finds a music box that transports them to the Land of Melodies, where every color has a sound and every sound has a color. The land's music has gone silent, and {childName} must bring it back.

CHILD TRAITS TO WEAVE IN: {traits}

REQUIREMENTS:
- Describe music with colors and visual imagery (synesthesia-style).
- Include musical characters (a drumming bear, a singing bird, a dancing river).
- {childName} should discover they can make music with something unexpected.
- End with a grand, joyful concert that brings the whole land together.
`,
  },
  winter: {
    slug: 'winter',
    name: 'The Snow Kingdom',
    category: 'fantasy',
    description:
      'The child visits a magical snow kingdom where snowflakes are alive and winter is full of wonder.',
    pageCount: 10,
    ageRange: [3, 8],
    emoji: '❄️',
    promptTemplate: `
Write a {pageCount}-page children's story for a {age}-year-old child named {childName}.

STORY PREMISE:
{childName} catches a glowing snowflake that whisks them away to the Snow Kingdom, where friendly snow creatures live in ice castles. The kingdom needs help preparing for the biggest winter celebration ever.

CHILD TRAITS TO WEAVE IN: {traits}

REQUIREMENTS:
- Describe a beautiful, cozy winter wonderland (not cold and harsh).
- Include friendly snow creatures (snow bunnies, ice birds, a gentle snow giant).
- {childName} should help prepare for the celebration using their unique traits.
- End with a warm, magical celebration where everyone comes together.
`,
  },
};

export const THEME_LIST = Object.values(THEMES);
