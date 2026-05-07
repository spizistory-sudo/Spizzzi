/**
 * StoryMagic English Story Catalog
 *
 * Each story is a TEMPLATE. The actual story is generated at runtime by Claude
 * using the child's name, age, gender, traits, and interests. The metadata here
 * drives:
 *   1. Which stories get recommended (curation)
 *   2. How the story is written (generation prompt)
 *
 * Categories:
 *   - big_adventures
 *   - animal_friends
 *   - all_my_feelings
 *   - i_can_do_it
 *   - family_and_friends
 *   - wonders_of_the_world
 *   - cozy_and_calm
 *
 * Energy levels:
 *   playful | warm | exciting | cozy | brave | dreamy
 *
 * Gender fit:
 *   any | boy_lean | girl_lean
 *
 * Age coverage: 3-12
 */

export interface StoryTemplate {
  id: string;
  category_id: string;
  title: string;
  description: string;       // 1-sentence summary shown to parent
  premise: string;            // longer summary used by the generation prompt

  // Curation fields
  age_min: number;
  age_max: number;
  age_sweet_spot: number;
  gender_fit: 'any' | 'boy_lean' | 'girl_lean';
  best_traits: string[];
  interests: string[];
  energy: 'playful' | 'warm' | 'exciting' | 'cozy' | 'brave' | 'dreamy';
  why_it_works: string;       // note for the AI curator

  // Generation guidance
  required_beats: string[];   // story must hit these moments
  things_to_avoid: string[];  // common pitfalls for this kind of story
}

export interface CategoryDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
  status: 'active' | 'coming_soon';
  order: number;
}

// -----------------------------------------------------------------------------
// CATEGORIES
// -----------------------------------------------------------------------------

export const CATEGORIES: CategoryDefinition[] = [
  {
    id: 'big_adventures',
    name: 'Big Adventures',
    emoji: '🌟',
    description: 'Heroic quests, journeys, and bold missions where your child saves the day.',
    status: 'active',
    order: 1,
  },
  {
    id: 'animal_friends',
    name: 'Animal Friends',
    emoji: '🦁',
    description: 'Stories where animals are companions, teachers, and partners.',
    status: 'active',
    order: 2,
  },
  {
    id: 'all_my_feelings',
    name: 'All My Feelings',
    emoji: '💛',
    description: 'Gentle stories that help your child understand big emotions.',
    status: 'active',
    order: 3,
  },
  {
    id: 'i_can_do_it',
    name: 'I Can Do It!',
    emoji: '🚀',
    description: 'Stories of trying, failing, and trying again — building confidence.',
    status: 'active',
    order: 4,
  },
  {
    id: 'family_and_friends',
    name: 'Family & Friends',
    emoji: '🏡',
    description: 'Sibling bonds, friendships, parents, and grandparents.',
    status: 'active',
    order: 5,
  },
  {
    id: 'wonders_of_the_world',
    name: 'Wonders of the World',
    emoji: '🌍',
    description: 'Curious explorations of nature, science, history, and cultures.',
    status: 'active',
    order: 6,
  },
  {
    id: 'cozy_and_calm',
    name: 'Cozy & Calm',
    emoji: '🌙',
    description: 'Bedtime stories and gentle, peaceful adventures.',
    status: 'active',
    order: 7,
  },
];

// -----------------------------------------------------------------------------
// STORY CATALOG
// -----------------------------------------------------------------------------

export const STORIES: StoryTemplate[] = [
  // ---------------------------------------------------------------------------
  // BIG ADVENTURES (11 stories)
  // ---------------------------------------------------------------------------
  {
    id: 'pirate_treasure_hunt',
    category_id: 'big_adventures',
    title: 'Pirate Treasure Hunt',
    description: 'Set sail on a friendly pirate ship to find a treasure that matters more than gold.',
    premise:
      'The child sets sail on a colorful, friendly pirate ship with a kind crew. They follow a tattered treasure map across small islands. The "treasure" at the end turns out to be something heartwarming — a friendship bracelet for someone who needs cheering up, or a bottled message from a kind stranger. The story celebrates curiosity and the idea that the best treasures are not always shiny.',
    age_min: 3, age_max: 5, age_sweet_spot: 4,
    gender_fit: 'any',
    best_traits: ['brave', 'playful', 'curious'],
    interests: ['pirates_and_adventure', 'wild_and_sea_animals', 'mystery_and_puzzles'],
    energy: 'playful',
    why_it_works: 'Simple A-to-B quest structure perfect for the youngest. The reframing of "treasure" lands gently for ages 3-5.',
    required_beats: [
      'Child boards the pirate ship and meets the crew',
      'A treasure map is revealed',
      'They sail to one or two small islands and discover clues',
      'The "treasure" turns out to be something kind, not gold',
      'The child returns home proud and excited',
    ],
    things_to_avoid: [
      'Scary pirates, sword fights, or violence',
      'Real-world piracy themes',
      'Long sea-storms or peril',
    ],
  },
  {
    id: 'the_dragons_riddle',
    category_id: 'big_adventures',
    title: "The Dragon's Riddle",
    description: 'A dragon everyone fears asks a riddle only your child can answer.',
    premise:
      'The child journeys to a kingdom where everyone is afraid of a dragon who lives on the highest hill. When the child climbs up, the dragon turns out to be lonely, not fierce. The dragon poses a riddle — and the answer reveals that the dragon has been protecting something precious for the village (a hidden spring, a magic flower, a lost child). The child returns to the village as the bridge between dragon and people.',
    age_min: 4, age_max: 7, age_sweet_spot: 5,
    gender_fit: 'any',
    best_traits: ['brave', 'clever', 'kind'],
    interests: ['fairy_tales_and_magic', 'mystery_and_puzzles'],
    energy: 'brave',
    why_it_works: 'Classic "misunderstood creature" arc. Rewards the child who looks past appearances.',
    required_beats: [
      'Child hears the village fears the dragon',
      'Child climbs to meet the dragon alone',
      'Dragon shares the riddle and the truth',
      'Child solves the riddle through care, not cleverness',
      'Village and dragon are brought together',
    ],
    things_to_avoid: [
      'Defeating or harming the dragon',
      'A clever-trickery solution that ignores the dragon\'s feelings',
    ],
  },
  {
    id: 'beyond_the_stars',
    category_id: 'big_adventures',
    title: 'Beyond the Stars',
    description: 'A young alien needs help getting home — and your child is the only one who can help.',
    premise:
      'The child finds a small spaceship in their backyard with a young alien stranded inside. Together they fix the ship and travel through space, visiting two or three small planets, each with a quirky lesson (a planet of constant noise, a planet that\'s lost its color, a planet where everyone is shy). They get the alien home and return to Earth carrying a small glowing memento.',
    age_min: 5, age_max: 8, age_sweet_spot: 6,
    gender_fit: 'any',
    best_traits: ['curious', 'brave', 'kind'],
    interests: ['space_and_stars', 'science_and_how_things_work'],
    energy: 'exciting',
    why_it_works: 'Empathy across difference + sci-fi wonder. The episodic planet visits give natural spread structure.',
    required_beats: [
      'Child meets the stranded alien',
      'They repair the ship and launch',
      'They visit at least two planets, each with a small problem and gift',
      'The alien gets home; they say a real goodbye',
      'Child returns home, changed in a small way',
    ],
    things_to_avoid: [
      'Scary aliens or villains',
      'Space-battle or weaponry',
      'Sad ending where the friend is forgotten',
    ],
  },
  {
    id: 'deep_sea_discovery',
    category_id: 'big_adventures',
    title: 'Deep Sea Discovery',
    description: 'A magical submarine takes your child into the ocean to help a baby whale find its mother.',
    premise:
      'The child finds a small magical submarine and dives into the ocean. They meet curious sea creatures — a sea turtle who tells stories, a school of fish who travel as one, a wise octopus. Each helps them find their way to a lost baby whale, then to its mother. The story emphasizes gentleness and the wonder of the deep.',
    age_min: 4, age_max: 7, age_sweet_spot: 5,
    gender_fit: 'any',
    best_traits: ['gentle', 'curious', 'persistent'],
    interests: ['wild_and_sea_animals', 'mystery_and_puzzles'],
    energy: 'dreamy',
    why_it_works: 'The ocean is universally compelling. Rescue arc gives clear emotional payoff.',
    required_beats: [
      'Child enters the submarine and dives',
      'Three sea creatures help them along the way',
      'They find the baby whale, then the mother',
      'Reunion is celebrated by all the sea creatures',
      'Child surfaces with a small ocean treasure',
    ],
    things_to_avoid: [
      'Sharks, danger, predators',
      'Pollution that overwhelms — keep environmental themes light',
    ],
  },
  {
    id: 'the_secret_of_the_old_map',
    category_id: 'big_adventures',
    title: 'The Secret of the Old Map',
    description: 'A mysterious map in the attic leads your child on a clue-by-clue adventure through their own town.',
    premise:
      'The child finds an old, faded map in their attic with three coded clues. Each clue leads to a real-world place near them (the park, the library, an old tree) where they discover the next piece. The final reveal is something meaningful — a buried family memento, or a small magical object that\'s been waiting for them. The story rewards careful thinking and observation.',
    age_min: 6, age_max: 9, age_sweet_spot: 7,
    gender_fit: 'any',
    best_traits: ['clever', 'persistent', 'curious'],
    interests: ['mystery_and_puzzles', 'pirates_and_adventure'],
    energy: 'exciting',
    why_it_works: 'More cognitive than younger adventures. Older kids who like to think and decode get rewarded.',
    required_beats: [
      'Child discovers the old map',
      'Three clues, each in a different location',
      'Each clue requires real thinking to solve',
      'The final reveal connects to family or magic',
      'Child returns home with new understanding',
    ],
    things_to_avoid: [
      'Solutions that are too obvious or too random',
      'The reveal being just a treasure chest of gold',
    ],
  },
  {
    id: 'race_around_the_world',
    category_id: 'big_adventures',
    title: 'Race Around the World',
    description: 'Your child is in a hot-air balloon race through five countries — but winning isn\'t the point.',
    premise:
      'The child is a contestant in a colorful hot-air balloon race that crosses five countries (specific real ones, with sensory detail — markets in Morocco, a temple in Japan, the icy plains of Iceland, etc.). At each country they meet someone who slows them down with a kindness or a need. By the finish line they\'re last, but they realize they\'ve gained something better than winning.',
    age_min: 5, age_max: 8, age_sweet_spot: 6,
    gender_fit: 'any',
    best_traits: ['energetic', 'persistent', 'kind'],
    interests: ['travel_and_cultures', 'sports'],
    energy: 'exciting',
    why_it_works: 'Travel + competition + heart. The "last but happiest" reframe lands beautifully for this age.',
    required_beats: [
      'Race begins with high stakes and energy',
      'Five country stops, each with sensory cultural detail',
      'At three of them, child slows down to help someone',
      'Child finishes last but with new friends and stories',
      'They realize what they gained',
    ],
    things_to_avoid: [
      'Cultural stereotypes or caricatures',
      'A tacked-on "winning is bad" moral',
    ],
  },
  {
    id: 'the_knights_first_quest',
    category_id: 'big_adventures',
    title: "The Knight's First Quest",
    description: 'On their first day as a knight-in-training, your child is sent to face a dragon — but finds something different.',
    premise:
      'The child becomes a knight-in-training in a friendly medieval kingdom. Their first quest: travel to the dark forest and face the dragon. Along the way they meet other knights, each with funny advice. When they arrive, the "dragon" turns out to be a young dragon stuck in a thorn bush, whimpering. The real bravery is in helping, not fighting.',
    age_min: 4, age_max: 7, age_sweet_spot: 5,
    gender_fit: 'any',
    best_traits: ['brave', 'kind', 'persistent'],
    interests: ['fairy_tales_and_magic', 'princesses_and_royalty'],
    energy: 'brave',
    why_it_works: 'The "subverted dragon-fight" trope works perfectly for this age. Kids love medieval gear.',
    required_beats: [
      'Child is dubbed knight-in-training',
      'They prepare with their gear and journey out',
      'They meet 1-2 other knights with quirky wisdom',
      'They reach the dragon and find it needs help',
      'They return as a real knight, having shown courage of heart',
    ],
    things_to_avoid: [
      'Glorifying combat',
      'Princesses who need rescuing in a cliché way',
    ],
  },
  {
    id: 'the_jungle_expedition',
    category_id: 'big_adventures',
    title: 'The Jungle Expedition',
    description: 'Your child leads an expedition into the rainforest and discovers a hidden grove that needs saving.',
    premise:
      'The child leads a small expedition into a vivid rainforest. They meet animals who guide them — a chatty parrot, a wise sloth, a playful monkey. Deep in the jungle they discover a hidden grove where the rare flowers are wilting. With the animals\' help, they restore it and become honorary protectors of the rainforest.',
    age_min: 5, age_max: 8, age_sweet_spot: 6,
    gender_fit: 'any',
    best_traits: ['brave', 'curious', 'gentle'],
    interests: ['wild_and_sea_animals', 'nature_and_gardens'],
    energy: 'exciting',
    why_it_works: 'Rich sensory environment. Animal guides give natural mentorship.',
    required_beats: [
      'Expedition starts at the forest edge',
      'Three animal guides each share a small wisdom',
      'They reach the hidden grove',
      'They restore the grove together',
      'Child is named a forest protector',
    ],
    things_to_avoid: [
      'Heavy-handed conservation lecture',
      'Indigenous cultures portrayed as exotic backdrop',
    ],
  },
  {
    id: 'the_cipher_in_the_library',
    category_id: 'big_adventures',
    title: 'The Cipher in the Library',
    description: 'An old book in the library hides a coded message — and only your child seems to notice.',
    premise:
      'The child is a regular at the library. One day they find a strange book with a hand-written cipher inside. Over the course of several days they decode it across multiple visits. The cipher leads them to a real reveal — a hidden author who left a riddle for whoever was curious enough to find it. The story celebrates patience and intellectual hunger.',
    age_min: 9, age_max: 12, age_sweet_spot: 10,
    gender_fit: 'any',
    best_traits: ['clever', 'curious', 'persistent', 'thoughtful'],
    interests: ['mystery_and_puzzles', 'science_and_how_things_work'],
    energy: 'exciting',
    why_it_works: 'Older-kid intellectual adventure. The "sustained mystery over days" structure is mature and rewarding.',
    required_beats: [
      'Child finds the strange book and the cipher',
      'They decode it slowly across multiple library visits',
      'Each piece of the puzzle leads to a new fragment',
      'The reveal connects to a real person or idea',
      'Child realizes curiosity is their power',
    ],
    things_to_avoid: [
      'A magical shortcut to the solution',
      'A villain or antagonist',
    ],
  },
  {
    id: 'the_mountain_that_remembered',
    category_id: 'big_adventures',
    title: 'The Mountain That Remembered',
    description: 'A solo hike up a quiet mountain becomes a journey into your child\'s own strength.',
    premise:
      'The child sets out on a solo (or near-solo) hike up a quiet mountain. The mountain seems alive with memory — the wind whispers, the stones glow softly, the path remembers every traveler who came before. As they climb, they meet small reminders of their own past struggles, and find quiet strength. At the summit, they sit alone with a view that changes them.',
    age_min: 9, age_max: 12, age_sweet_spot: 11,
    gender_fit: 'any',
    best_traits: ['brave', 'thoughtful', 'persistent', 'gentle'],
    interests: ['nature_and_gardens', 'travel_and_cultures'],
    energy: 'brave',
    why_it_works: 'Older kids need quiet stories about inner strength. Meditative and grown-up without being preachy.',
    required_beats: [
      'Child begins the climb alone',
      'Three encounters with the mountain\'s "memory"',
      'A moment of doubt or near-turning-back',
      'They reach the summit',
      'They descend with something new inside',
    ],
    things_to_avoid: [
      'Real danger or injury',
      'A talking mountain that becomes corny',
    ],
  },
  {
    id: 'the_stranger_from_the_sea',
    category_id: 'big_adventures',
    title: 'The Stranger from the Sea',
    description: 'A ship arrives at the harbor with a stranger asking for help — and your child has to decide whether to trust them.',
    premise:
      'The child lives in a coastal town. One foggy morning a small ship arrives carrying a stranger who claims to need urgent help — but the townspeople are suspicious. The child has to weigh the evidence: the stranger\'s words, their own intuition, the elders\' caution. They make a choice and the consequence reveals who was right, and what trust really requires.',
    age_min: 8, age_max: 11, age_sweet_spot: 9,
    gender_fit: 'any',
    best_traits: ['thoughtful', 'kind', 'brave', 'honest'],
    interests: ['pirates_and_adventure', 'mystery_and_puzzles'],
    energy: 'brave',
    why_it_works: 'Genuine moral complexity. No easy answer until the end. Older kids love this.',
    required_beats: [
      'The ship arrives, the stranger asks for help',
      'Townspeople warn the child to be cautious',
      'Child weighs the choice carefully',
      'They make a decision and follow through',
      'The truth reveals itself, and the child learns about discernment',
    ],
    things_to_avoid: [
      'A reveal that punishes trust or rewards paranoia',
      'A simplistic "always trust" or "never trust" moral',
    ],
  },

  // ---------------------------------------------------------------------------
  // ANIMAL FRIENDS (11 stories)
  // ---------------------------------------------------------------------------
  {
    id: 'the_lonely_lion',
    category_id: 'animal_friends',
    title: 'The Lonely Lion',
    description: 'A lion who roars too loud has no friends — until your child shows him a different kind of strength.',
    premise:
      'The child meets a lion in the savanna whose roar is so loud he scares away every animal. He\'s lonely but doesn\'t know why. The child helps him discover that his roar can be quieter, kinder — used for singing, calling friends home, or making the wind stir. By the end the lion has a circle of friends and a new way of being big.',
    age_min: 3, age_max: 6, age_sweet_spot: 4,
    gender_fit: 'any',
    best_traits: ['kind', 'gentle', 'brave'],
    interests: ['wild_and_sea_animals'],
    energy: 'warm',
    why_it_works: 'Gentle "big feelings, small friend" arc. The reframed roar is metaphorically rich.',
    required_beats: [
      'Child meets the lonely lion',
      'They learn his roar scares everyone',
      'They experiment with quieter roars together',
      'Other animals come back',
      'Lion has friends, child has a friend',
    ],
    things_to_avoid: [
      'Lion being "fixed" or made smaller',
      'A moralizing line about "being kind"',
    ],
  },
  {
    id: 'the_penguin_who_couldnt_fly',
    category_id: 'animal_friends',
    title: "The Penguin Who Couldn't Fly",
    description: 'A young penguin watches the birds and wishes he could fly — until your child shows him swimming is its own kind of flying.',
    premise:
      'The child meets a young penguin in Antarctica who watches the seabirds in the sky and feels sad he can\'t join them. The child takes him swimming. Underwater, the penguin discovers he flies through the sea — fast, graceful, free in a way the birds aren\'t. He learns his body has its own gift.',
    age_min: 3, age_max: 6, age_sweet_spot: 4,
    gender_fit: 'any',
    best_traits: ['kind', 'persistent', 'gentle'],
    interests: ['wild_and_sea_animals'],
    energy: 'warm',
    why_it_works: 'About appreciating your own gifts. Universally affirming for any kid who feels different.',
    required_beats: [
      'Penguin watches the sky birds and feels sad',
      'Child notices and gets curious',
      'They go into the water together',
      'Penguin discovers he flies underwater',
      'He celebrates his own way',
    ],
    things_to_avoid: [
      'Penguin being told to stop wanting things',
      'A "you\'re special just the way you are" cliché ending',
    ],
  },
  {
    id: 'whiskers_big_day',
    category_id: 'animal_friends',
    title: "Whisker's Big Day",
    description: 'Your child\'s cat is afraid of the outside — but today is the day they\'ll go on an adventure together.',
    premise:
      'The child\'s pet cat (Whisker — name can be adapted to child\'s real cat if known) has never gone outside. The child notices the cat staring out the window with longing. They open the door and patiently, slowly, accompany the cat through a small first adventure — three steps onto the porch, then the garden, then a tree. By bedtime the cat is back inside, but proud. The child whispers "you were brave today."',
    age_min: 4, age_max: 7, age_sweet_spot: 5,
    gender_fit: 'any',
    best_traits: ['gentle', 'sensitive', 'patient'],
    interests: ['cats'],
    energy: 'warm',
    why_it_works: 'Real and small. Validates introverted children. Powerful for cat-loving kids.',
    required_beats: [
      'Cat looks out the window',
      'Child gently opens the door',
      'Three small steps of bravery',
      'Cat returns home, proud',
      'Child names the bravery',
    ],
    things_to_avoid: [
      'Pushing the cat to do more than it wants',
      'A scary outdoor encounter',
    ],
  },
  {
    id: 'the_elephant_who_forgot',
    category_id: 'animal_friends',
    title: 'The Elephant Who Forgot',
    description: 'An old elephant has forgotten she\'s loved — and your child gathers her family to help her remember.',
    premise:
      'The child meets an old elephant in a wide grassland who feels invisible — she\'s forgotten that her herd loves her. The child journeys to find her family members one by one (sister, son, an old friend) and brings each one back, with a memory they share. By the end she\'s surrounded, remembering, weeping a little, smiling. The child has helped her gather her loved ones close.',
    age_min: 4, age_max: 7, age_sweet_spot: 5,
    gender_fit: 'any',
    best_traits: ['kind', 'patient', 'gentle', 'thoughtful'],
    interests: ['wild_and_sea_animals'],
    energy: 'warm',
    why_it_works: 'Gentle, slow-paced, deeply emotional. Honors elders without being heavy.',
    required_beats: [
      'Child meets the lonely elephant',
      'Three family members are found and brought, each with a memory',
      'The herd gathers',
      'Elephant remembers she is loved',
      'Child watches quietly, content',
    ],
    things_to_avoid: [
      'Elephant dying or being mortally sad',
      'Memories that are hard or sad themselves',
    ],
  },
  {
    id: 'a_squirrel_for_the_storm',
    category_id: 'animal_friends',
    title: 'A Squirrel for the Storm',
    description: 'A storm is coming — and your child gives a small squirrel a place to be safe.',
    premise:
      'A storm rolls in. The child notices a small wet squirrel shivering by the window. They open the door and let the squirrel in. The squirrel curls up by the fire, nibbles a bit of nut, and waits out the storm with the child. In the morning, the squirrel returns to the trees. In the spring, the squirrel comes back with babies — and the kindness is repaid in trust.',
    age_min: 3, age_max: 5, age_sweet_spot: 4,
    gender_fit: 'any',
    best_traits: ['kind', 'gentle', 'thoughtful'],
    interests: ['wild_and_sea_animals', 'nature_and_gardens'],
    energy: 'cozy',
    why_it_works: 'Small, repeatable kindness. Cozy storm shelter scenes are deeply soothing for this age.',
    required_beats: [
      'Storm begins to gather',
      'Child notices the wet squirrel',
      'They invite it in',
      'Cozy waiting-out-the-storm scene',
      'Spring return with babies',
    ],
    things_to_avoid: [
      'Heavy weather drama',
      'The squirrel being injured',
    ],
  },
  {
    id: 'the_last_firefly',
    category_id: 'animal_friends',
    title: 'The Last Firefly',
    description: 'In a forest where the fireflies have all disappeared, your child helps the very last one find his family.',
    premise:
      'The child is in a forest at twilight. They notice one tiny firefly, blinking alone. The fireflies have moved away — but where? The child carries the firefly through the forest, asking owls, deer, and a wise old fox. Each one knows a piece of the answer. By moonrise they reach a hidden meadow where thousands of fireflies have gathered for a great dance.',
    age_min: 4, age_max: 8, age_sweet_spot: 6,
    gender_fit: 'any',
    best_traits: ['gentle', 'brave', 'curious'],
    interests: ['nature_and_gardens', 'fairy_tales_and_magic'],
    energy: 'dreamy',
    why_it_works: 'Magical realism with a clear quest. The reveal of thousands of fireflies is a payoff that lands.',
    required_beats: [
      'Child finds the lone firefly',
      'They meet three forest helpers',
      'Each gives a piece of the answer',
      'The hidden meadow is revealed',
      'The firefly joins the dance',
    ],
    things_to_avoid: [
      'Firefly being separated forever',
      'Heavy environmental message',
    ],
  },
  {
    id: 'my_dog_the_hero',
    category_id: 'animal_friends',
    title: 'My Dog the Hero',
    description: 'Your child\'s dog seems ordinary — until the day they realize their dog is quietly heroic in small ways every day.',
    premise:
      'The child\'s dog (name adapted if possible) seems like an ordinary, happy pet. But over the course of one day the child watches and realizes: the dog comforts the toddler when she cries, sits with grandma when she\'s tired, finds the lost cat from next door, walks slowly when the child is sad. At the end of the day the child sees their dog is quietly, deeply heroic — every day.',
    age_min: 4, age_max: 7, age_sweet_spot: 5,
    gender_fit: 'any',
    best_traits: ['kind', 'thoughtful', 'loyal'],
    interests: ['dogs'],
    energy: 'warm',
    why_it_works: 'Reframes the "hero" idea around quiet, daily love. Hits hard for any dog-loving kid.',
    required_beats: [
      'Child sees the dog as ordinary',
      'Three small acts of quiet heroism through the day',
      'Child notices the pattern',
      'They thank the dog before bed',
      'They see their dog with new eyes',
    ],
    things_to_avoid: [
      'Dog rescuing someone from danger (overdone)',
      'Dog being made to talk',
    ],
  },
  {
    id: 'the_horse_who_could_listen',
    category_id: 'animal_friends',
    title: 'The Horse Who Could Listen',
    description: 'A shy horse in a quiet field becomes the friend who finally understands.',
    premise:
      'The child visits a stable or farm and meets a horse no one has been able to bond with — she\'s shy, watchful, hard to know. The child sits with her quietly, day after day, just listening. Slowly the horse comes closer. By the end of the visit they ride together for the first time, and the child realizes the horse heard them all along.',
    age_min: 5, age_max: 8, age_sweet_spot: 6,
    gender_fit: 'girl_lean',
    best_traits: ['gentle', 'sensitive', 'patient', 'kind'],
    interests: ['horses'],
    energy: 'warm',
    why_it_works: 'For horse-loving kids especially. Honors quiet relationship-building.',
    required_beats: [
      'Child meets the shy horse',
      'They visit and sit quietly multiple times',
      'Trust slowly builds',
      'They ride together for the first time',
      'Child realizes the listening was the gift',
    ],
    things_to_avoid: [
      'Horse being trained or broken',
      'Riding being the only goal',
    ],
  },
  {
    id: 'the_bear_in_the_garden',
    category_id: 'animal_friends',
    title: 'The Bear in the Garden',
    description: 'Through every season, a friendly bear visits your child\'s garden — and they share something different each time.',
    premise:
      'A friendly bear appears in the child\'s garden. Through spring he helps plant seeds, in summer they share berries, in fall they rake leaves into a pile and jump in, in winter they say goodbye until next year. The story is repeating and gentle, with a clear "and the next season..." rhythm that toddlers love.',
    age_min: 3, age_max: 5, age_sweet_spot: 4,
    gender_fit: 'any',
    best_traits: ['gentle', 'curious', 'kind'],
    interests: ['wild_and_sea_animals', 'nature_and_gardens'],
    energy: 'cozy',
    why_it_works: 'Repetitive seasonal structure perfect for toddlers. Cozy and predictable.',
    required_beats: [
      'Bear arrives in spring',
      'Each season gets its own scene',
      'Goodbye in winter',
      'Promise of next year\'s return',
    ],
    things_to_avoid: [
      'Bear becoming threatening',
      'Loss without return',
    ],
  },
  {
    id: 'the_wolf_who_listened',
    category_id: 'animal_friends',
    title: 'The Wolf Who Listened',
    description: 'A lone wolf has been watching your child from the woods — and finally, they meet.',
    premise:
      'The child has felt watched on their walks through the woods. One day a wolf reveals himself — wary, intelligent, alone. He doesn\'t speak in the easy way of children\'s book animals. The child has to earn his trust through real attention, real silence, real respect. Over weeks they build a quiet friendship that ends not in promises but in mutual understanding.',
    age_min: 8, age_max: 11, age_sweet_spot: 9,
    gender_fit: 'any',
    best_traits: ['gentle', 'patient', 'thoughtful', 'brave'],
    interests: ['wild_and_sea_animals', 'nature_and_gardens'],
    energy: 'brave',
    why_it_works: 'Older kids who\'ve outgrown talking-animal stories want this — wild, real, intense.',
    required_beats: [
      'Child senses being watched',
      'Wolf reveals himself slowly',
      'Multiple wary encounters',
      'Real trust is earned, not given',
      'Quiet, mature ending — not a pet, not a friend, but something true',
    ],
    things_to_avoid: [
      'Wolf becoming a tame pet',
      'Anthropomorphic dialogue',
    ],
  },
  {
    id: 'the_horse_whisperers_daughter',
    category_id: 'animal_friends',
    title: "The Horse Whisperer's Daughter",
    description: 'Your child has spent their summers learning what their grandmother knew about horses — and this year, a difficult horse arrives.',
    premise:
      'The child has spent their summers at their grandmother\'s farm, learning quietly how the older woman could understand horses. This year a difficult horse arrives — wounded, distrustful, untouchable. Grandmother has gone, and the child has to put what they learned into practice. The arc is real: failure, frustration, slow trust, eventual breakthrough. The story honors generations and the slow gift of mentorship.',
    age_min: 9, age_max: 12, age_sweet_spot: 10,
    gender_fit: 'girl_lean',
    best_traits: ['gentle', 'sensitive', 'persistent', 'thoughtful'],
    interests: ['horses'],
    energy: 'warm',
    why_it_works: 'Coming-of-age. Multi-generational. The kind of story that sticks with older kids.',
    required_beats: [
      'Setup: grandmother\'s legacy',
      'Difficult horse arrives',
      'Child fails at first',
      'Slow growth, real mistakes, real progress',
      'Quiet breakthrough — and a sense of carrying grandmother forward',
    ],
    things_to_avoid: [
      'Easy success',
      'Sentimentalizing grandmother\'s death (if mentioned, do it lightly)',
    ],
  },

  // ---------------------------------------------------------------------------
  // ALL MY FEELINGS (11 stories)
  // ---------------------------------------------------------------------------
  {
    id: 'when_the_big_mad_comes',
    category_id: 'all_my_feelings',
    title: 'When the Big Mad Comes',
    description: 'Anger is real, and big, and your child learns it can be released without hurting anyone.',
    premise:
      'The child is doing something they enjoy when something small goes wrong — a tower falls, a puzzle piece is missing — and the Big Mad rises in their belly, hot and red. The story names the physical feeling carefully (belly hot, fists tight, ears loud). A trusted adult arrives, accepts the anger without minimizing it, and offers a release — running outside, tearing paper, shouting into a pillow. The Mad goes quiet. The child rests, lighter.',
    age_min: 3, age_max: 5, age_sweet_spot: 4,
    gender_fit: 'any',
    best_traits: ['sensitive', 'energetic', 'honest'],
    interests: [],
    energy: 'warm',
    why_it_works: 'Direct emotional literacy. Names the body sensation. Validates anger as a legitimate emotion.',
    required_beats: [
      'Trigger event (small frustration)',
      'Body sensations of anger named',
      'Eruption (yell, throw, kick something soft)',
      'Trusted adult accepts without scolding',
      'Physical release',
      'Quiet, lighter ending — no apology required',
    ],
    things_to_avoid: [
      '"It\'s okay, it\'s nothing" — minimizing',
      'Apology as the resolution (the resolution is the release, not the sorry)',
      '"Count to ten" as the only solution',
    ],
  },
  {
    id: 'the_monster_in_the_closet',
    category_id: 'all_my_feelings',
    title: 'The Monster in the Closet',
    description: 'There\'s a monster in the closet — but tonight your child is going to find out who they really are.',
    premise:
      'It\'s bedtime. The child is sure there\'s a monster in the closet. The story honors that the fear is real. But tonight the child decides to look. The monster turns out to be small, fluffy, and lonely. The two of them have a tea party on the floor and become friends. The "monster" becomes a guardian who watches over sleep.',
    age_min: 3, age_max: 6, age_sweet_spot: 4,
    gender_fit: 'any',
    best_traits: ['sensitive', 'imaginative', 'brave'],
    interests: ['bedtime_stories', 'fairy_tales_and_magic'],
    energy: 'brave',
    why_it_works: 'Honors fear, then transforms it. Bedtime favorite. Reframes monsters as misunderstood.',
    required_beats: [
      'Bedtime, fear of the closet',
      'Fear is taken seriously',
      'Brave decision to look',
      'Monster revealed as friendly',
      'Cozy, settled ending',
    ],
    things_to_avoid: [
      'Telling the child "there\'s nothing to be afraid of"',
      'Monster being scary or threatening',
    ],
  },
  {
    id: 'the_day_everything_went_wrong',
    category_id: 'all_my_feelings',
    title: 'The Day Everything Went Wrong',
    description: 'It\'s just one of those days — and your child learns that nothing has to be fixed, only felt.',
    premise:
      'In the spirit of Alexander\'s Terrible, Horrible, No Good, Very Bad Day. The child wakes up to find one small thing wrong, then another, then another — six little disasters across one day. By bedtime they\'re exhausted and cranky. A trusted adult sits with them and says: today was rough, and that\'s okay. We don\'t have to fix it. Tomorrow is a new day. The child sleeps.',
    age_min: 5, age_max: 8, age_sweet_spot: 6,
    gender_fit: 'any',
    best_traits: ['sensitive', 'persistent', 'honest'],
    interests: [],
    energy: 'warm',
    why_it_works: 'Validates that bad days are normal and don\'t require reframe. Subversively non-toxic-positivity.',
    required_beats: [
      'Six small things go wrong across the day',
      'Cumulative frustration builds',
      'No magical fix arrives',
      'A grown-up validates the day was hard',
      'Bedtime brings rest, not solution',
    ],
    things_to_avoid: [
      'A silver-lining ending',
      '"At least you have..." gratitude lecture',
    ],
  },
  {
    id: 'the_empty_chair',
    category_id: 'all_my_feelings',
    title: 'The Empty Chair',
    description: 'Someone your child loves isn\'t here right now — and missing them is its own kind of love.',
    premise:
      'A grandparent has gone home after a long visit, or a best friend has moved away, or a sibling is at camp. The child sits with the empty chair where that person used to be. They don\'t want to be cheered up. The story sits with them. A parent comes to sit too, doesn\'t fix it, just sits. They share a small memory. The chair stays empty, but the love stays full.',
    age_min: 5, age_max: 8, age_sweet_spot: 6,
    gender_fit: 'any',
    best_traits: ['sensitive', 'gentle', 'thoughtful'],
    interests: ['family'],
    energy: 'warm',
    why_it_works: 'Honors longing and grief at child-scale. No false reassurance.',
    required_beats: [
      'The person\'s absence is named',
      'Child sits with the feeling',
      'A family member joins without fixing',
      'A small shared memory',
      'Acceptance: the chair stays empty, the love stays',
    ],
    things_to_avoid: [
      '"They\'ll be back soon!" as the ending',
      'Distracting from the feeling',
    ],
  },
  {
    id: 'the_green_feeling',
    category_id: 'all_my_feelings',
    title: 'The Green Feeling',
    description: 'When a sibling gets all the attention, a green feeling rises — and your child learns it doesn\'t make them bad.',
    premise:
      'A sibling (or close friend) gets a lot of praise or attention for something. The child feels the "green feeling" rise — a tight, hot, ugly feeling. The story names it without judgment. A parent helps the child see: jealousy is a feeling, not a flaw. The green fades. The child finds their own thing to feel good about. Bonus: they also offer real congratulations to the sibling at the end, but only when ready.',
    age_min: 4, age_max: 7, age_sweet_spot: 5,
    gender_fit: 'any',
    best_traits: ['sensitive', 'honest', 'kind'],
    interests: ['family'],
    energy: 'warm',
    why_it_works: 'Names jealousy as okay-to-feel. Doesn\'t shame. Doesn\'t force false generosity.',
    required_beats: [
      'Sibling/friend gets attention',
      'Green feeling rises and is named',
      'Parent normalizes it',
      'Child waits with it; it fades',
      'Genuine, not forced, kindness emerges',
    ],
    things_to_avoid: [
      '"Don\'t be jealous!"',
      'Forcing a hug or apology',
    ],
  },
  {
    id: 'a_hug_for_tomorrow',
    category_id: 'all_my_feelings',
    title: 'A Hug for Tomorrow',
    description: 'Worry about tomorrow is real — and your child learns to collect brave thoughts to bring along.',
    premise:
      'Tomorrow is something the child is anxious about — first day of something, a doctor visit, a performance. Tonight the worry is loud. A parent sits with them and they make a "brave thoughts" jar together: notes about times they\'ve been brave before, kind words, a tiny picture. The jar goes by the bed. In the morning the child carries one note in their pocket.',
    age_min: 4, age_max: 8, age_sweet_spot: 6,
    gender_fit: 'any',
    best_traits: ['sensitive', 'thoughtful', 'gentle'],
    interests: [],
    energy: 'cozy',
    why_it_works: 'Concrete coping skill (the jar). Honors anxiety without minimizing. Practical and warm.',
    required_beats: [
      'Worry about tomorrow named',
      'Parent doesn\'t dismiss it',
      'They build the brave thoughts jar together',
      'Sleep with the jar nearby',
      'Morning: one note carried into the day',
    ],
    things_to_avoid: [
      '"Don\'t worry!" advice',
      'Pretending the worry will be gone',
    ],
  },
  {
    id: 'sometimes_im_quiet',
    category_id: 'all_my_feelings',
    title: "Sometimes I'm Quiet",
    description: 'A child who needs quiet times finds out their quietness is its own kind of strength.',
    premise:
      'The child is having one of those days where they don\'t want to talk much, don\'t want to play loud, just want to be quiet. People keep asking "Are you okay?" The child learns, with a parent\'s help, that quiet is a real way of being — and it\'s their right. The day unfolds as a quiet day. By evening the child has rested and feels like themselves again.',
    age_min: 3, age_max: 6, age_sweet_spot: 4,
    gender_fit: 'any',
    best_traits: ['gentle', 'thoughtful', 'sensitive'],
    interests: [],
    energy: 'cozy',
    why_it_works: 'Validates introversion in young kids. Helpful for shy or sensitive children to see themselves.',
    required_beats: [
      'Child wakes up wanting quiet',
      'Others\' worry is named without judgment',
      'Parent confirms quiet is okay',
      'A quiet day unfolds gently',
      'Evening: child feels rested and themselves',
    ],
    things_to_avoid: [
      '"Snap out of it" energy',
      'Implying quiet is sad',
    ],
  },
  {
    id: 'the_big_sorry',
    category_id: 'all_my_feelings',
    title: 'The Big Sorry',
    description: 'Your child accidentally hurts a friend\'s feelings — and learns how a real apology works.',
    premise:
      'The child says something or does something — not on purpose — that hurts a close friend\'s feelings. The friend goes quiet and walks away. The child feels the regret. Their first attempt at apology is too quick and gets brushed off. With help, they try again — slower, with real listening, with naming the hurt they caused. The friendship repairs, but the lesson is the apology itself, not the outcome.',
    age_min: 4, age_max: 7, age_sweet_spot: 5,
    gender_fit: 'any',
    best_traits: ['kind', 'honest', 'sensitive'],
    interests: ['friendship'],
    energy: 'warm',
    why_it_works: 'Real apology mechanics — not "say sorry," but "see the hurt, name it, take responsibility."',
    required_beats: [
      'The accidental hurt happens',
      'Friend withdraws',
      'Child feels regret, attempts a quick "sorry"',
      'Quick sorry doesn\'t land',
      'Real apology: slower, naming what they did, not asking for forgiveness',
      'Repair happens — but the lesson is the apology itself',
    ],
    things_to_avoid: [
      'Forced apology from outside',
      'Friendship repair feeling automatic',
    ],
  },
  {
    id: 'the_quiet_storm',
    category_id: 'all_my_feelings',
    title: 'The Quiet Storm',
    description: 'Sometimes a heavy mood rolls in for no reason — and your child learns that real feelings can pass without fighting them.',
    premise:
      'The child wakes up with a heaviness they can\'t explain. Nothing\'s wrong, exactly, but the world feels far away and gray. The story takes the feeling seriously — names it as a "quiet storm" inside. A parent or older sibling sits with them, doesn\'t demand cheer, doesn\'t pathologize. They go for a walk, have a slow meal, watch the real sky. The storm passes on its own time. The child learns these moods come and go.',
    age_min: 9, age_max: 12, age_sweet_spot: 10,
    gender_fit: 'any',
    best_traits: ['sensitive', 'thoughtful', 'gentle', 'honest'],
    interests: [],
    energy: 'warm',
    why_it_works: 'Older kids start having real moods that aren\'t "about" anything. This story honors that without medicalizing.',
    required_beats: [
      'Heavy mood arrives without clear cause',
      'It\'s named, not fixed',
      'A trusted adult sits with the child',
      'Slow day with no demands',
      'Mood passes naturally',
      'Insight: moods come and go, and that\'s okay',
    ],
    things_to_avoid: [
      'Suggesting the child has a clinical condition',
      '"What\'s wrong?" repeatedly',
      'Forcing activity to fix the mood',
    ],
  },
  {
    id: 'the_friend_in_the_mirror',
    category_id: 'all_my_feelings',
    title: 'The Friend in the Mirror',
    description: 'Your child meets the meanest critic in the world — themselves — and learns to talk to themselves like a friend.',
    premise:
      'The child catches themselves saying mean things about themselves in the mirror — about how they look, what they said today, how they failed at something. The story personifies the inner critic gently and asks: would you say this to your best friend? Through the day, the child practices catching the mean thoughts and replacing them with what a friend would say. By evening they look in the mirror and smile at themselves, just a little.',
    age_min: 9, age_max: 12, age_sweet_spot: 11,
    gender_fit: 'any',
    best_traits: ['sensitive', 'thoughtful', 'kind', 'honest'],
    interests: [],
    energy: 'warm',
    why_it_works: 'Self-talk and identity work for the older kids. Real cognitive-behavioral concepts at age-appropriate level.',
    required_beats: [
      'Mean self-talk noticed',
      'The "would you say this to a friend?" reframe',
      'Practice across the day',
      'Some catches succeed, some don\'t',
      'A small smile at the end, not a transformation',
    ],
    things_to_avoid: [
      'Affirmations that feel hollow',
      'Suggesting self-criticism is shameful',
      'Body image specifics that could trigger',
    ],
  },
  {
    id: 'when_things_dont_make_sense',
    category_id: 'all_my_feelings',
    title: "When Things Don't Make Sense",
    description: 'Something unfair has happened — and your child sits with the realness of it instead of forcing it to make sense.',
    premise:
      'Something unfair has happened — a teacher\'s judgment that wasn\'t right, a friend\'s betrayal, a rule that doesn\'t make sense, a loss with no explanation. The child is angry at the world, not just at people. A trusted adult listens without trying to fix it. They acknowledge: yes, this is unfair. Sometimes the world doesn\'t make sense. The story doesn\'t end with a tidy resolution — it ends with the child being able to name "this is unfair, and I\'m not crazy."',
    age_min: 8, age_max: 12, age_sweet_spot: 10,
    gender_fit: 'any',
    best_traits: ['sensitive', 'honest', 'thoughtful'],
    interests: [],
    energy: 'warm',
    why_it_works: 'Real complexity for older kids. Honors that adults sometimes don\'t have answers.',
    required_beats: [
      'Unfair event happens',
      'Child\'s anger or confusion is real',
      'Adult validates instead of fixing',
      'No false resolution',
      'Child learns "I see clearly" is itself a kind of strength',
    ],
    things_to_avoid: [
      '"Everything happens for a reason"',
      'A magical fix to the unfairness',
      'Implying the child is overreacting',
    ],
  },

  // ---------------------------------------------------------------------------
  // I CAN DO IT! (10 stories)
  // ---------------------------------------------------------------------------
  {
    id: 'learning_to_try',
    category_id: 'i_can_do_it',
    title: 'Learning to Try',
    description: 'A small new skill feels impossible — until your child learns the magic of one more try.',
    premise:
      'The child is trying to do something age-appropriate that\'s hard for them — tying shoes, climbing a tree, riding a balance bike. They fail and want to give up. A parent or older sibling shows them the "one more try" magic — three more attempts, with breaks. By the end of the day they\'ve done it once, just barely. They go to bed proud.',
    age_min: 3, age_max: 5, age_sweet_spot: 4,
    gender_fit: 'any',
    best_traits: ['persistent', 'brave'],
    interests: [],
    energy: 'warm',
    why_it_works: 'Concrete and small-scale. Builds growth mindset at the youngest age.',
    required_beats: [
      'Child tries something hard',
      'They fail and want to quit',
      'Trusted adult names "one more try" magic',
      'Three more attempts',
      'They get it once, just barely',
      'Pride at bedtime',
    ],
    things_to_avoid: [
      'Easy success',
      'Adult doing the task for them',
    ],
  },
  {
    id: 'the_first_day_at_big_kid_school',
    category_id: 'i_can_do_it',
    title: 'The First Day at Big Kid School',
    description: 'Tomorrow is the first day of big kid school — and tonight your child finds courage with a little help.',
    premise:
      'The child is starting kindergarten or first grade tomorrow. They\'re excited and terrified. The night before, a parent sits with them and they pack the backpack together, name the worries out loud, find one small thing to look forward to. The next morning is hard. The child is brave anyway. By pickup time they\'ve made one friend, and they have a story to tell.',
    age_min: 5, age_max: 7, age_sweet_spot: 5,
    gender_fit: 'any',
    best_traits: ['shy', 'brave', 'sensitive'],
    interests: ['friendship'],
    energy: 'warm',
    why_it_works: 'Universal milestone story. Hits parents in the heart too.',
    required_beats: [
      'Night before, worries named',
      'Backpack packed, lunch prepared',
      'One thing to look forward to identified',
      'Hard morning, child is brave anyway',
      'One friend made by pickup',
      'A story to tell at home',
    ],
    things_to_avoid: [
      'School day depicted as easy',
      'False promise that nothing will be hard',
    ],
  },
  {
    id: 'the_big_performance',
    category_id: 'i_can_do_it',
    title: 'The Big Performance',
    description: 'Stage fright is real — and your child finds their voice when it counts.',
    premise:
      'The child has a recital, play, or performance coming up. As the day approaches the nerves grow. The day-of, they\'re shaking. They want to back out. A trusted person reminds them why they signed up — the love of the thing, not the spotlight. They go on. They make a small mistake. They keep going. After, they realize they did it not because it was easy, but because it mattered.',
    age_min: 6, age_max: 9, age_sweet_spot: 7,
    gender_fit: 'any',
    best_traits: ['creative', 'sensitive', 'brave'],
    interests: ['music', 'dance_and_performance', 'art_and_creativity'],
    energy: 'brave',
    why_it_works: 'Specifically powerful for kids in performing arts. The "small mistake" detail is crucial — perfection isn\'t the goal.',
    required_beats: [
      'Performance approaches',
      'Nerves build to peak',
      'Want to back out',
      'Reminded of why they love it',
      'They go on, make a small mistake, keep going',
      'After: pride in showing up, not in perfection',
    ],
    things_to_avoid: [
      'Flawless performance ending',
      'Audience reaction as the validation',
    ],
  },
  {
    id: 'the_inventors_workshop',
    category_id: 'i_can_do_it',
    title: "The Inventor's Workshop",
    description: 'Your child needs to invent something to solve a real problem — and learns that "didn\'t work" is part of how things get made.',
    premise:
      'The child has a real problem to solve in their world — the dog keeps escaping, a younger sibling can\'t reach something, the garden gets eaten by squirrels. They become an inventor. They build something. It fails. They build again. It almost works. They build a third time and it works. The story celebrates the process more than the product, and ends with them sketching the next thing they\'ll build.',
    age_min: 6, age_max: 9, age_sweet_spot: 7,
    gender_fit: 'any',
    best_traits: ['curious', 'creative', 'persistent'],
    interests: ['science_and_how_things_work', 'building_and_inventing'],
    energy: 'exciting',
    why_it_works: 'Real STEM mindset. Failure is built into the structure as a feature, not a flaw.',
    required_beats: [
      'Real problem identified',
      'First invention designed and built',
      'It fails',
      'Iteration: what to change',
      'Second attempt almost works',
      'Third attempt works',
      'Sketch of next idea',
    ],
    things_to_avoid: [
      'First-try success',
      'Magical solution',
    ],
  },
  {
    id: 'the_rainy_day_race',
    category_id: 'i_can_do_it',
    title: 'The Rainy Day Race',
    description: 'On race day it\'s pouring — and your child runs anyway, learning that effort matters more than placing.',
    premise:
      'The child has trained for weeks for a race (running, biking, swimming — adapt to interest). On race day, it\'s pouring. Half the kids drop out. The child runs anyway. They don\'t come in first — they come in fifth. But they finished, in the rain, when they could have stayed home. The story names what that\'s worth.',
    age_min: 5, age_max: 8, age_sweet_spot: 6,
    gender_fit: 'any',
    best_traits: ['persistent', 'energetic', 'brave'],
    interests: ['sports'],
    energy: 'exciting',
    why_it_works: 'Effort-over-outcome reframe done well. Concrete and physical.',
    required_beats: [
      'Race day, weather is awful',
      'Some kids drop out',
      'Child decides to run anyway',
      'They run hard, don\'t win',
      'Pride in finishing',
      'Adult names what showing up was worth',
    ],
    things_to_avoid: [
      'Last-minute miracle win',
      'Implying winning didn\'t matter to the child',
    ],
  },
  {
    id: 'the_reading_mountain',
    category_id: 'i_can_do_it',
    title: 'The Reading Mountain',
    description: 'Reading feels like a mountain too tall to climb — and your child takes the first step today.',
    premise:
      'The child is learning to read and feels behind their peers. The story uses a magical mountain metaphor: each new word they sound out is a step up. There are slides backward. There are days they want to quit. A teacher or parent climbs alongside. By the end of the story, they\'ve made it partway up and can see how far they\'ve come. The summit is still ahead, and that\'s okay.',
    age_min: 5, age_max: 7, age_sweet_spot: 6,
    gender_fit: 'any',
    best_traits: ['persistent', 'sensitive', 'curious'],
    interests: ['bedtime_stories'],
    energy: 'warm',
    why_it_works: 'Especially powerful for kids who feel behind in reading. Doesn\'t pretend it\'s easy.',
    required_beats: [
      'Reading feels impossible',
      'Mountain metaphor introduced',
      'Each word sounded out = a step',
      'Slides backward acknowledged',
      'A teacher/parent climbs alongside',
      'Look back at how far they\'ve come — summit still ahead',
    ],
    things_to_avoid: [
      'Sudden reading breakthrough',
      'Comparison to other kids',
    ],
  },
  {
    id: 'learning_to_ride',
    category_id: 'i_can_do_it',
    title: 'Learning to Ride',
    description: 'Falling is part of learning — and today is the day your child rides on their own.',
    premise:
      'The child is learning to ride a bike (or scooter, or skateboard — adapt). They\'ve fallen many times. Today they\'re tired of being scared. A parent helps them once more, then steps back. There are wobbles. There\'s a fall. There\'s a moment of getting up and going further than ever before. By the end of the afternoon they ride to the end of the street and back, alone.',
    age_min: 4, age_max: 7, age_sweet_spot: 5,
    gender_fit: 'any',
    best_traits: ['brave', 'persistent', 'energetic'],
    interests: ['sports'],
    energy: 'brave',
    why_it_works: 'Universal physical-mastery milestone. The "step back" by the parent is emotionally precise.',
    required_beats: [
      'History of falls and frustration',
      'Today\'s decision to keep trying',
      'Parent helps, then steps back',
      'Wobbles, fall, get up',
      'First real solo ride',
      'Triumph at end of street',
    ],
    things_to_avoid: [
      'Parent steadying through to the end',
      'Magic mastery without falls',
    ],
  },
  {
    id: 'the_cake_that_took_three_tries',
    category_id: 'i_can_do_it',
    title: 'The Cake That Took Three Tries',
    description: 'Your child wants to bake a cake for someone special — and the first two tries are disasters.',
    premise:
      'The child wants to bake a cake for a person who matters — a parent\'s birthday, a sibling\'s good news, a friend who\'s sad. The first cake collapses. The second cake burns. They\'re ready to give up. A grandparent or older sibling helps them try once more, slower, more careful. The third cake is imperfect but real. They give it. The receiver doesn\'t care that it\'s lopsided. They cry a little because it was made for them.',
    age_min: 5, age_max: 8, age_sweet_spot: 6,
    gender_fit: 'any',
    best_traits: ['creative', 'persistent', 'kind'],
    interests: ['cooking_and_food', 'family'],
    energy: 'warm',
    why_it_works: 'Persistence + love combined. The lopsided-cake-loved-anyway ending is powerful.',
    required_beats: [
      'Reason to bake the cake',
      'First cake fails',
      'Second cake fails',
      'Want to give up',
      'Helper steps in',
      'Third cake is imperfect but finished',
      'Receiver moved by the effort, not the cake',
    ],
    things_to_avoid: [
      'Third cake being magazine-perfect',
      'The cake replacing the relationship as the focus',
    ],
  },
  {
    id: 'the_audition',
    category_id: 'i_can_do_it',
    title: 'The Audition',
    description: 'Your child auditions for something they want badly — and learns what to do with rejection.',
    premise:
      'The child auditions for a role, team, or program they want badly (chess club, school musical, sports team, art program). They prepare for weeks. They audition. They don\'t get it. The story sits with the disappointment fully — it\'s real, it hurts, and they need time. After, they decide whether to try again next year, with eyes open. The story ends with them practicing again — not because they\'re sure they\'ll succeed, but because the love of the thing is its own reason.',
    age_min: 9, age_max: 12, age_sweet_spot: 10,
    gender_fit: 'any',
    best_traits: ['persistent', 'sensitive', 'creative', 'brave'],
    interests: ['music', 'sports', 'dance_and_performance', 'art_and_creativity'],
    energy: 'warm',
    why_it_works: 'Real rejection at older-kid scale. Doesn\'t flinch from disappointment. Mature emotional terrain.',
    required_beats: [
      'Weeks of preparation, real hope',
      'The audition itself',
      'Not getting in',
      'Real disappointment, named',
      'Time to grieve',
      'Decision to try again or not — on their terms',
      'Practicing again, for love not certainty',
    ],
    things_to_avoid: [
      'Surprise reversal where they get in after all',
      '"It wasn\'t meant to be" platitude',
    ],
  },
  {
    id: 'the_project_that_almost_wasnt',
    category_id: 'i_can_do_it',
    title: 'The Project That Almost Wasn\'t',
    description: 'A long project, weeks of work, and the moment your child almost quit — but didn\'t.',
    premise:
      'The child takes on a long project — a model, a story, a research project, a piece of art that takes weeks. There\'s a crisis point in the middle when it seems unsalvageable. They almost quit. They take a day away. They come back. The ending isn\'t a flawless final product — it\'s the satisfaction of having stayed with something hard, all the way through.',
    age_min: 9, age_max: 12, age_sweet_spot: 10,
    gender_fit: 'any',
    best_traits: ['persistent', 'creative', 'patient', 'thoughtful'],
    interests: ['art_and_creativity', 'science_and_how_things_work', 'building_and_inventing'],
    energy: 'warm',
    why_it_works: 'Long-form persistence. Older kids start to face projects that take real time. Validates the middle slog.',
    required_beats: [
      'Project chosen with excitement',
      'Long stretch of steady work',
      'Crisis point in the middle',
      'Almost quitting, taking a break',
      'Coming back',
      'Imperfect finish that they\'re proud of',
    ],
    things_to_avoid: [
      'Final product being a masterpiece',
      'Fast-forward through the slog',
    ],
  },

  // ---------------------------------------------------------------------------
  // FAMILY & FRIENDS (10 stories)
  // ---------------------------------------------------------------------------
  {
    id: 'the_new_baby',
    category_id: 'family_and_friends',
    title: 'The New Baby',
    description: 'A new baby is coming — and your child learns that love grows, it doesn\'t shrink.',
    premise:
      'The child\'s family is expecting a new baby. The child has mixed feelings — excitement and worry that they\'ll be loved less. A parent honors both feelings. The baby arrives. The first weeks are noisy and tired. There\'s a quiet moment when the baby grasps the older child\'s finger and the child realizes: love grows, it doesn\'t shrink. They\'re not replaced. They\'re a big sibling now.',
    age_min: 3, age_max: 6, age_sweet_spot: 4,
    gender_fit: 'any',
    best_traits: ['sensitive', 'kind'],
    interests: ['family'],
    energy: 'warm',
    why_it_works: 'Honors mixed feelings. Doesn\'t pretend the older child should be all-excitement. The finger-grasp is iconic.',
    required_beats: [
      'Baby is coming, mixed feelings honored',
      'Baby arrives, first weeks are hard',
      'Quiet moment of connection',
      'Realization: love grows',
      'Identity as big sibling settled',
    ],
    things_to_avoid: [
      'Older child only feeling pure joy',
      'Baby being adorable from page one',
    ],
  },
  {
    id: 'best_friends_forever',
    category_id: 'family_and_friends',
    title: 'Best Friends Forever',
    description: 'Even best friends have hard days — and your child learns how to come back from a fight.',
    premise:
      'The child and their best friend have a fight — over something that, looking back, isn\'t much. They go home angry. The next day at school they avoid each other. By that night the child is sad and confused. With a parent\'s help they think through what happened. The next day they make the first move — with a real apology, not a "let\'s pretend it didn\'t happen." The friendship comes back, a little wiser.',
    age_min: 5, age_max: 8, age_sweet_spot: 6,
    gender_fit: 'any',
    best_traits: ['sensitive', 'kind', 'honest'],
    interests: ['friendship'],
    energy: 'warm',
    why_it_works: 'Real friendship mechanics. Fight, distance, real repair. No magic forgiveness.',
    required_beats: [
      'The fight happens',
      'Distance the next day',
      'Sadness at home',
      'Thinking through what happened',
      'Real apology, not papering over',
      'Friendship returns, a little stronger',
    ],
    things_to_avoid: [
      'Forced apology by an adult',
      '"Friends forever" without the work',
    ],
  },
  {
    id: 'a_day_with_grandma_grandpa',
    category_id: 'family_and_friends',
    title: 'A Day with Grandma/Grandpa',
    description: 'A whole day with a grandparent becomes the day your child learns a story they\'ll keep forever.',
    premise:
      'The child spends a whole day with one grandparent (parent of either gender — the prompt asks which grandparent and adapts). They do something simple — bake, garden, fix something, walk the neighborhood. During the day the grandparent shares a story from their own childhood that mirrors something the child is going through. The child carries the story home like a small treasure.',
    age_min: 3, age_max: 7, age_sweet_spot: 5,
    gender_fit: 'any',
    best_traits: ['curious', 'gentle', 'kind'],
    interests: ['family'],
    energy: 'cozy',
    why_it_works: 'Intergenerational. The story-within-the-story is the key — grandparents pass down memory.',
    required_beats: [
      'Drop-off at grandparent\'s',
      'Simple shared activity',
      'Grandparent shares a childhood story',
      'Story mirrors something the child is going through',
      'Goodbye with the story carried home',
    ],
    things_to_avoid: [
      'Grandparent depicted as frail or sad',
      'Lecture-style "in my day..."',
    ],
  },
  {
    id: 'the_sleepover',
    category_id: 'family_and_friends',
    title: 'The Sleepover',
    description: 'First sleepover at a friend\'s house — and your child learns they can miss home and have fun at the same time.',
    premise:
      'The child is at a friend\'s house for their first sleepover. The afternoon is fun. As bedtime approaches they start missing home. They feel small in someone else\'s house. The friend\'s parent is kind and offers either a call home or a stay-anyway. The child chooses to stay. They sleep with their stuffed animal close. They wake up proud. It was real bravery.',
    age_min: 5, age_max: 8, age_sweet_spot: 6,
    gender_fit: 'any',
    best_traits: ['brave', 'friendly', 'sensitive'],
    interests: ['friendship'],
    energy: 'warm',
    why_it_works: 'Honors that missing home and having fun aren\'t opposites. Real first-sleepover honesty.',
    required_beats: [
      'Excited arrival',
      'Fun afternoon',
      'Bedtime homesickness rises',
      'Real choice offered (call home or stay)',
      'Choice to stay, gentle sleep',
      'Pride in the morning',
    ],
    things_to_avoid: [
      'Pressure to stay if it\'s really hard',
      'Sleepover being uniformly fun',
    ],
  },
  {
    id: 'the_lost_toy',
    category_id: 'family_and_friends',
    title: 'The Lost Toy',
    description: 'A favorite toy goes missing — and your child\'s sibling helps find it in a way that says everything.',
    premise:
      'The child\'s most beloved stuffed animal or toy goes missing. They search the house in tears. The sibling — older or younger, sometimes the one they fight with — quietly joins the search. Together they retrace steps, look in unlikely places, eventually find it. The toy is returned. The bond between siblings is what really shows up. Inspired by Shirley Hughes\' Dogger, but original.',
    age_min: 3, age_max: 6, age_sweet_spot: 4,
    gender_fit: 'any',
    best_traits: ['sensitive', 'gentle', 'persistent'],
    interests: ['family'],
    energy: 'warm',
    why_it_works: 'Sibling tenderness without saccharine. The lost-and-found arc is bulletproof for this age.',
    required_beats: [
      'Toy is missing, real distress',
      'Sibling joins the search unprompted',
      'They retrace steps together',
      'Toy is found in an unexpected place',
      'Quiet sibling moment that says more than words',
    ],
    things_to_avoid: [
      'Sibling already being a saint',
      'Adult finding the toy instead',
    ],
  },
  {
    id: 'the_family_recipe',
    category_id: 'family_and_friends',
    title: 'The Family Recipe',
    description: 'Your child cooks a recipe that\'s been in the family for generations — and learns where they came from.',
    premise:
      'The child helps a grandparent or parent cook a family dish — one with deep roots. As they cook, the older person shares where the recipe came from: a great-grandmother, a country, a hard time when the recipe sustained the family. The child takes a small role and contributes. They eat together. The child has a new sense of who they are and where they\'re from. We adapt to the family\'s actual culture if known.',
    age_min: 5, age_max: 8, age_sweet_spot: 6,
    gender_fit: 'any',
    best_traits: ['curious', 'kind', 'patient'],
    interests: ['cooking_and_food', 'family', 'travel_and_cultures'],
    energy: 'cozy',
    why_it_works: 'Identity, lineage, sensory richness. Universal across cultures with adaptation.',
    required_beats: [
      'Recipe and ingredients gathered',
      'Story of the recipe shared while cooking',
      'Child contributes a real step',
      'Family meal together',
      'New sense of belonging and history',
    ],
    things_to_avoid: [
      'Generic "tradition" without specifics',
      'Cultural details that read as exotic flavoring',
    ],
  },
  {
    id: 'my_favorite_person',
    category_id: 'family_and_friends',
    title: 'My Favorite Person',
    description: 'A celebration of one specific person who matters more to your child than almost anyone.',
    premise:
      'The story is a love letter to one specific family member (the parent picks: mom, dad, sibling, grandparent, aunt, uncle). It walks through a typical day or week with that person, naming the small things they do that make the child feel loved. It ends with the child telling them what they mean. Simple, repeating, full-hearted.',
    age_min: 3, age_max: 6, age_sweet_spot: 4,
    gender_fit: 'any',
    best_traits: ['kind', 'gentle', 'thoughtful'],
    interests: ['family'],
    energy: 'cozy',
    why_it_works: 'Pure heart. Hooray Heroes territory — a book that becomes a keepsake.',
    required_beats: [
      'Name the person and what makes them special',
      'Three or four small things they do that show love',
      'A specific moment that matters',
      'Direct expression of love by the child',
      'A hug or quiet moment together',
    ],
    things_to_avoid: [
      'Saccharine universal love language',
      'The person being depicted as perfect',
    ],
  },
  {
    id: 'the_friend_who_moved_away',
    category_id: 'family_and_friends',
    title: 'The Friend Who Moved Away',
    description: 'A best friend is moving — and your child learns that distance doesn\'t end love.',
    premise:
      'The child\'s best friend is moving — far enough that they won\'t see each other often. The story honors the grief without trying to fix it. The two friends spend a last day together. They make plans for video calls and letters. The friend leaves. The child misses them. Some days are hard. Slowly, they realize the friendship still exists, just differently. By the end, they\'ve sent the first real letter.',
    age_min: 6, age_max: 9, age_sweet_spot: 7,
    gender_fit: 'any',
    best_traits: ['sensitive', 'thoughtful', 'kind'],
    interests: ['friendship'],
    energy: 'warm',
    why_it_works: 'Real loss at child-scale. Doesn\'t pretend distance is nothing. Honors letter-writing/calls as real connection.',
    required_beats: [
      'News of the move, shock',
      'Last day together',
      'Real goodbye',
      'Hard days after',
      'Slow understanding that distance isn\'t end',
      'First real letter sent',
    ],
    things_to_avoid: [
      'Surprise return of the friend',
      'Quick replacement with a new best friend',
    ],
  },
  {
    id: 'the_group_chat',
    category_id: 'family_and_friends',
    title: 'The Group Chat',
    description: 'Your child notices they\'ve been left out of a group chat — and learns how to handle digital exclusion.',
    premise:
      'The child realizes a group of friends has a chat that doesn\'t include them. They feel hurt, confused, and uncertain. The story honors how digital exclusion is real even though it\'s "just" online. The child talks to a parent or older sibling. They think through whether to ask the group, let it go, or seek a different friendship. Whatever they choose, the story validates that being left out hurts and they\'re allowed to care.',
    age_min: 9, age_max: 12, age_sweet_spot: 11,
    gender_fit: 'any',
    best_traits: ['sensitive', 'thoughtful', 'honest'],
    interests: ['friendship'],
    energy: 'warm',
    why_it_works: 'Modern friendship reality. Honors a hurt that adults often dismiss as "just online."',
    required_beats: [
      'Discovery of the chat',
      'Real hurt named, not minimized',
      'Conversation with a trusted adult',
      'Thinking through options',
      'A choice made on the child\'s terms',
      'Self-respect intact regardless of outcome',
    ],
    things_to_avoid: [
      '"Just put your phone down" advice',
      'Implying digital relationships aren\'t real',
    ],
  },
  {
    id: 'when_mom_and_dad_are_tired',
    category_id: 'family_and_friends',
    title: 'When Mom and Dad Are Tired',
    description: 'Your child notices their parents are stressed — and learns that empathy can flow both ways.',
    premise:
      'The child notices that their parents have been quieter, shorter-tempered, more tired than usual. They realize, maybe for the first time, that their parents have hard days too. The child tries to do something kind without being asked — make a card, set the table, give a hug. Their parents notice. There\'s a real moment between them. The child learns that being seen is a gift they can give too.',
    age_min: 8, age_max: 11, age_sweet_spot: 9,
    gender_fit: 'any',
    best_traits: ['sensitive', 'kind', 'thoughtful'],
    interests: ['family'],
    energy: 'warm',
    why_it_works: 'Older kids start to see parents as real humans. Honors that growing up means empathy goes both ways.',
    required_beats: [
      'Child notices parents\' stress',
      'Realization that parents have hard days too',
      'A small unprompted kindness',
      'Real moment with the parent',
      'Insight: love can flow both directions',
    ],
    things_to_avoid: [
      'Child becoming a parentified caregiver',
      'Parents being depicted as fragile',
    ],
  },

  // ---------------------------------------------------------------------------
  // WONDERS OF THE WORLD (10 stories)
  // ---------------------------------------------------------------------------
  {
    id: 'what_lives_in_the_garden',
    category_id: 'wonders_of_the_world',
    title: 'What Lives in the Garden',
    description: 'With a magnifying glass and an afternoon, your child discovers the secret world of insects.',
    premise:
      'The child spends an afternoon with a magnifying glass in their garden. They discover the secret civilizations underfoot — ant highways, ladybug families, a beetle dragging something twice its size, spiders weaving in real time. The story names insects with real curiosity (not fear) and ends with the child seeing their familiar garden as a wild kingdom.',
    age_min: 3, age_max: 6, age_sweet_spot: 5,
    gender_fit: 'any',
    best_traits: ['curious', 'gentle', 'thoughtful'],
    interests: ['nature_and_gardens', 'science_and_how_things_work', 'wild_and_sea_animals'],
    energy: 'dreamy',
    why_it_works: 'Wonder-of-the-small. Helps kids appreciate insects without fear.',
    required_beats: [
      'Magnifying glass in hand',
      'Three or four insect discoveries with real detail',
      'A surprising fact for each',
      'Garden seen as wild kingdom by the end',
    ],
    things_to_avoid: [
      'Insects being scary',
      'Squashing or harm',
    ],
  },
  {
    id: 'the_tallest_mountain',
    category_id: 'wonders_of_the_world',
    title: 'The Tallest Mountain',
    description: 'Your child climbs a famous mountain — and learns about the world while learning about themselves.',
    premise:
      'The child climbs a famous mountain (we pick: Everest, Kilimanjaro, Mount Fuji, etc., or a magical version of one). The journey is broken into sections — the foothills, the tree line, the snow, the summit. Each section has its own animals, weather, and wonder. They reach the top with effort and humility. The view is named in real terms. They come down changed.',
    age_min: 6, age_max: 9, age_sweet_spot: 7,
    gender_fit: 'any',
    best_traits: ['brave', 'persistent', 'curious'],
    interests: ['travel_and_cultures', 'nature_and_gardens', 'sports'],
    energy: 'brave',
    why_it_works: 'Geography + adventure. Real altitude facts grounded in story.',
    required_beats: [
      'Foothills with one feature',
      'Tree line with another',
      'Snow zone with a real challenge',
      'Summit with quiet pride',
      'Descent with a small object or memory',
    ],
    things_to_avoid: [
      'Real danger or rescue',
      'Mountain being conquered (frame as honored)',
    ],
  },
  {
    id: 'the_star_map',
    category_id: 'wonders_of_the_world',
    title: 'The Star Map',
    description: 'On a clear night, your child learns to read the sky and find their way home by stars.',
    premise:
      'The child is given a real or magical star map by an older relative. They go outside on a clear night and learn three or four constellations — what they\'re called, what stories the ancients told about them. The story sits with the wonder of the sky, then the child uses the stars to find their way back home, the way travelers have done for thousands of years.',
    age_min: 5, age_max: 8, age_sweet_spot: 7,
    gender_fit: 'any',
    best_traits: ['curious', 'thoughtful', 'gentle'],
    interests: ['space_and_stars', 'science_and_how_things_work'],
    energy: 'dreamy',
    why_it_works: 'Real astronomy meets gentle bedtime feel. Cross-cultural sky-reading is rich.',
    required_beats: [
      'Star map received',
      'Clear night, going outside',
      'Three or four constellations named with stories',
      'Sense of awe',
      'Using the sky to find home',
    ],
    things_to_avoid: [
      'Astrology presented as science',
      'Overload of facts',
    ],
  },
  {
    id: 'how_things_are_made',
    category_id: 'wonders_of_the_world',
    title: 'How Things Are Made',
    description: 'Your child shrinks down and travels through a chocolate factory (or pencil factory, or anything they love).',
    premise:
      'The child shrinks (magically) and travels through a working factory making something they love — chocolate, pencils, books, jelly beans, sneakers. Each station shows a real step, demystified. They meet workers who explain. They emerge with new appreciation for how things in their daily life come into being. We adapt the factory to the child\'s interest.',
    age_min: 5, age_max: 8, age_sweet_spot: 6,
    gender_fit: 'any',
    best_traits: ['curious', 'energetic', 'creative'],
    interests: ['science_and_how_things_work', 'building_and_inventing', 'cooking_and_food'],
    energy: 'exciting',
    why_it_works: 'Magic School Bus energy. Kids love seeing behind the curtain. Adaptable to many interests.',
    required_beats: [
      'Magical shrink moment',
      'Three or four real production steps',
      'A worker explains each',
      'A funny near-mishap',
      'Emerging with appreciation',
    ],
    things_to_avoid: [
      'Industrial process feeling cold',
      'Workers being invisible',
    ],
  },
  {
    id: 'the_time_machine_tea',
    category_id: 'wonders_of_the_world',
    title: 'The Time Machine Tea',
    description: 'Your child shares an afternoon tea with a child from another time and place.',
    premise:
      'The child sets a small table for tea. Through some gentle magic, a child from another era and culture appears — a Roman child, a child from Edo Japan, a child from 1920s Harlem. They have tea together. They each describe their world with curiosity. They ask each other questions. By the end of the tea they\'ve seen each other\'s humanity through the centuries. The visiting child fades back, but they\'re carried in memory.',
    age_min: 6, age_max: 9, age_sweet_spot: 7,
    gender_fit: 'any',
    best_traits: ['curious', 'kind', 'thoughtful'],
    interests: ['travel_and_cultures', 'fairy_tales_and_magic'],
    energy: 'dreamy',
    why_it_works: 'Historical empathy as wonder. Cross-cultural curiosity at child-scale.',
    required_beats: [
      'Tea is set',
      'Visiting child appears',
      'Mutual curiosity, real questions',
      'Each describes their world',
      'A moment of recognized shared humanity',
      'Goodbye, but memory remains',
    ],
    things_to_avoid: [
      'Stereotyping the visiting culture',
      'Modern child as the wise one',
    ],
  },
  {
    id: 'the_oceans_whisper',
    category_id: 'wonders_of_the_world',
    title: "The Ocean's Whisper",
    description: 'Your child helps clean up a beach — and the sea creatures show their gratitude in a small magic.',
    premise:
      'The child is at the beach. They notice plastic in the sand. They start picking it up. As they do, sea creatures (a small crab, a starfish, a curious dolphin) emerge. They help in small ways. By the end of the afternoon the beach is clean and the ocean has a small whispered thank-you for them — a perfect shell, a tide that recedes to reveal a tide pool. The story is environmental but small-scale and personal.',
    age_min: 5, age_max: 8, age_sweet_spot: 6,
    gender_fit: 'any',
    best_traits: ['gentle', 'kind', 'curious'],
    interests: ['wild_and_sea_animals', 'nature_and_gardens'],
    energy: 'dreamy',
    why_it_works: 'Environmentalism through agency, not guilt. Small-scale and personal.',
    required_beats: [
      'Beach setting, plastic noticed',
      'Quiet decision to help',
      'Three sea creatures appear and assist',
      'Beach is cleaner',
      'Small magical thank-you',
    ],
    things_to_avoid: [
      'Heavy environmental doom',
      'Implication that the child can solve pollution alone',
    ],
  },
  {
    id: 'the_weather_wizards_apprentice',
    category_id: 'wonders_of_the_world',
    title: "The Weather Wizard's Apprentice",
    description: 'Your child learns about clouds, rain, and wind from a friendly weather wizard.',
    premise:
      'The child meets a friendly weather wizard who teaches them how clouds form, why it rains, how wind moves. They get to play with miniature versions of weather in the wizard\'s workshop. The story sneaks in real meteorology through magical demonstration. By the end the child looks at the sky with new understanding.',
    age_min: 4, age_max: 7, age_sweet_spot: 6,
    gender_fit: 'any',
    best_traits: ['curious', 'playful', 'creative'],
    interests: ['science_and_how_things_work', 'fairy_tales_and_magic'],
    energy: 'playful',
    why_it_works: 'Real science through wonder. STEM without feeling like school.',
    required_beats: [
      'Meeting the weather wizard',
      'Cloud formation demonstrated',
      'Rain demonstrated',
      'Wind demonstrated',
      'Child looks at the sky with new eyes',
    ],
    things_to_avoid: [
      'Inaccurate science',
      'Wizard being all-magic with no real explanation',
    ],
  },
  {
    id: 'around_the_world_in_one_day',
    category_id: 'wonders_of_the_world',
    title: 'Around the World in One Day',
    description: 'In a single magical day, your child visits five countries and makes a friend in each.',
    premise:
      'The child has a magical day where they can visit five countries in one afternoon. In each country they meet a child their age, share a small moment (a meal, a game, a song), and learn something specific about that culture. By the end of the day they\'ve been around the world. They go to bed with a small souvenir from each.',
    age_min: 5, age_max: 8, age_sweet_spot: 6,
    gender_fit: 'any',
    best_traits: ['curious', 'friendly', 'energetic', 'kind'],
    interests: ['travel_and_cultures', 'friendship'],
    energy: 'exciting',
    why_it_works: 'Cultural curiosity through friendship. Tangible (souvenirs) and concrete.',
    required_beats: [
      'Magical setup',
      'Five countries with one specific cultural detail each',
      'A friend made in each',
      'A souvenir from each',
      'Tucked into bed with five new friends in memory',
    ],
    things_to_avoid: [
      'Cultural stereotypes',
      'Country-as-flag with no specifics',
    ],
  },
  {
    id: 'the_civilization_buried_below',
    category_id: 'wonders_of_the_world',
    title: 'The Civilization Buried Below',
    description: 'Your child joins an archaeological dig and uncovers a real-feeling lost city.',
    premise:
      'The child joins an archaeological dig — real or magical — and slowly uncovers an ancient city. Layer by layer, they find pottery, then a wall, then a courtyard. The lead archaeologist tells them what each thing means. By the end the city is partly revealed, and the child has a sense of how deep human history goes. The story is grounded in real archaeology.',
    age_min: 9, age_max: 12, age_sweet_spot: 10,
    gender_fit: 'any',
    best_traits: ['curious', 'persistent', 'thoughtful'],
    interests: ['mystery_and_puzzles', 'travel_and_cultures', 'science_and_how_things_work'],
    energy: 'exciting',
    why_it_works: 'Real archaeology for older kids. Grounded, scholarly, exciting.',
    required_beats: [
      'Arriving at the dig',
      'Layer-by-layer uncovering with real detail',
      'Three significant finds, each explained',
      'A sense of the city emerging',
      'Reflection on deep human time',
    ],
    things_to_avoid: [
      'Treasure-hunter framing',
      'Removing objects from cultural context',
    ],
  },
  {
    id: 'the_letter_from_a_hundred_years_ago',
    category_id: 'wonders_of_the_world',
    title: 'The Letter from a Hundred Years Ago',
    description: 'Your child finds a letter written by a child long ago — and learns how much they have in common.',
    premise:
      'The child finds an old letter — in an attic, an antique store, a library book. It was written by a child their age, exactly a hundred years ago. The letter describes the child\'s daily life, their worries, what they hoped for. Across the pages, the modern child realizes the long-ago child was so much like them. They write a letter back, knowing it can\'t be sent — but it matters anyway.',
    age_min: 9, age_max: 12, age_sweet_spot: 11,
    gender_fit: 'any',
    best_traits: ['thoughtful', 'curious', 'sensitive', 'kind'],
    interests: ['travel_and_cultures', 'mystery_and_puzzles'],
    energy: 'dreamy',
    why_it_works: 'Historical empathy at older-kid depth. The unsent reply is a poignant detail.',
    required_beats: [
      'Discovery of the old letter',
      'Reading it slowly',
      'Recognition of shared humanity across time',
      'Decision to write back even though it can\'t be sent',
      'A quiet sense of connection across a century',
    ],
    things_to_avoid: [
      'Idealizing or condemning the past',
      'Quick-fix time-travel solution',
    ],
  },

  // ---------------------------------------------------------------------------
  // COZY & CALM (9 stories)
  // ---------------------------------------------------------------------------
  {
    id: 'the_sleepy_little_star',
    category_id: 'cozy_and_calm',
    title: 'The Sleepy Little Star',
    description: 'A tiny star can\'t find its way home — and your child gently guides it through the night sky.',
    premise:
      'A tiny star has wandered down from the sky and is sleepy. The child gently helps it find its way back — climbing onto a moonbeam, riding a soft cloud, passing the planets one by one. Each step is slower and softer than the last. By the time the star is back in its place, the child is yawning. They settle into bed and the star watches over them.',
    age_min: 3, age_max: 5, age_sweet_spot: 4,
    gender_fit: 'any',
    best_traits: ['gentle', 'kind', 'thoughtful'],
    interests: ['space_and_stars', 'bedtime_stories'],
    energy: 'cozy',
    why_it_works: 'Classic bedtime structure. Slow pacing built in. The star-as-guardian ending is iconic.',
    required_beats: [
      'Tiny sleepy star found',
      'Gentle journey upward',
      'Each stop softer than the last',
      'Star reaches home',
      'Child settles into bed, star watches',
    ],
    things_to_avoid: [
      'Action or adventure energy',
      'Bright/loud language',
    ],
  },
  {
    id: 'the_big_comfy_blanket',
    category_id: 'cozy_and_calm',
    title: 'The Big Comfy Blanket',
    description: 'After a long day, your child finds peace under their favorite blanket.',
    premise:
      'The child has had a long day — not bad, just long. They find their favorite blanket. The story slows way down. They notice small comforts in turn: warmth, weight, the smell of home, a soft sound, a quiet thought. Each one is named gently. By the end they\'re half-asleep and the world feels exactly the right size.',
    age_min: 3, age_max: 5, age_sweet_spot: 4,
    gender_fit: 'any',
    best_traits: ['sensitive', 'gentle'],
    interests: ['bedtime_stories'],
    energy: 'cozy',
    why_it_works: 'Sensory mindfulness for the youngest. Very few stories teach this directly.',
    required_beats: [
      'Long day ends',
      'Finding the blanket',
      'Five small sensory comforts named slowly',
      'Drifting off',
    ],
    things_to_avoid: [
      'Plot or adventure',
      'A lesson tacked on',
    ],
  },
  {
    id: 'counting_stars_together',
    category_id: 'cozy_and_calm',
    title: 'Counting Stars Together',
    description: 'A quiet evening with a parent or grandparent, just counting stars.',
    premise:
      'The child and a beloved adult (parent, grandparent — adapted) sit outside as evening falls. They count the stars as they appear, one by one. They name a few constellations together. They share a quiet thought — what the day was, what tomorrow holds. The story is mostly silence, mostly looking up. By the end the sky is full of stars and the child is held.',
    age_min: 3, age_max: 6, age_sweet_spot: 5,
    gender_fit: 'any',
    best_traits: ['gentle', 'thoughtful', 'sensitive'],
    interests: ['family', 'space_and_stars', 'bedtime_stories'],
    energy: 'cozy',
    why_it_works: 'Generational tenderness. Mostly silent prose, full of presence.',
    required_beats: [
      'Sitting outside as evening falls',
      'Counting stars one by one',
      'Naming a few constellations',
      'A quiet shared thought',
      'A held silence',
    ],
    things_to_avoid: [
      'Lengthy dialogue',
      'A teaching moment',
    ],
  },
  {
    id: 'the_dream_garden',
    category_id: 'cozy_and_calm',
    title: 'The Dream Garden',
    description: 'Each night your child plants a thought, and in their dreams it grows into something beautiful.',
    premise:
      'The child has a small dream garden — a real or imaginary patch where, each night before bed, they plant a thought or wish. In their dreams the thoughts grow into flowers, birds, butterflies, small wonders. The story shows three nights with three plantings — a worry that grows into a butterfly, a hope that grows into a tree, a memory that grows into a song. The garden gets richer. The dreams get gentler.',
    age_min: 4, age_max: 7, age_sweet_spot: 5,
    gender_fit: 'any',
    best_traits: ['imaginative', 'gentle', 'sensitive'],
    interests: ['nature_and_gardens', 'fairy_tales_and_magic', 'bedtime_stories'],
    energy: 'dreamy',
    why_it_works: 'A repeatable bedtime ritual the parent can actually use. Beautiful concrete metaphor.',
    required_beats: [
      'The dream garden introduced',
      'Three nights of planting',
      'Each thought grows into something different',
      'Garden gets richer',
      'Settled, dream-touched ending',
    ],
    things_to_avoid: [
      'Garden becoming a chore',
      'Worries being named in scary terms',
    ],
  },
  {
    id: 'a_quiet_walk_in_the_woods',
    category_id: 'cozy_and_calm',
    title: 'A Quiet Walk in the Woods',
    description: 'A slow walk through the woods becomes an invitation to notice.',
    premise:
      'The child takes a quiet walk through the woods with a parent or alone. The pacing is intentional — they pause to listen for birds, watch a squirrel, feel the moss, smell the air after rain. Each pause is named. Nothing big happens. By the end they sit on a stump and feel the whole forest around them. They go home calmer.',
    age_min: 4, age_max: 8, age_sweet_spot: 6,
    gender_fit: 'any',
    best_traits: ['gentle', 'thoughtful', 'curious'],
    interests: ['nature_and_gardens'],
    energy: 'cozy',
    why_it_works: 'Mindfulness without being preachy. The pacing is the message.',
    required_beats: [
      'Setting out',
      'Five sensory pauses, each named',
      'Sitting on a stump at the end',
      'Going home, slightly different',
    ],
    things_to_avoid: [
      'Plot intrusion',
      'A nature-fact lecture',
    ],
  },
  {
    id: 'the_lighthouse_keepers_lullaby',
    category_id: 'cozy_and_calm',
    title: "The Lighthouse Keeper's Lullaby",
    description: 'A lighthouse keeps watch over your child as they fall asleep.',
    premise:
      'The story is told from a soft, third-person voice. Far away, a lighthouse stands by the sea. Its keeper turns on the lamp at dusk. The light sweeps slow circles over the water. Boats find their way home. As the night deepens, the rhythm of the light becomes a lullaby. The child reading hears it: you\'re safe. You\'re watched over. Sleep.',
    age_min: 4, age_max: 7, age_sweet_spot: 5,
    gender_fit: 'any',
    best_traits: ['gentle', 'thoughtful', 'sensitive'],
    interests: ['wild_and_sea_animals', 'bedtime_stories'],
    energy: 'cozy',
    why_it_works: 'Atmospheric. The lighthouse as protector is a deep, calming archetype.',
    required_beats: [
      'Lighthouse and keeper introduced',
      'Dusk, lamp lit',
      'Slow rhythm of the light established',
      'Boats finding home',
      'Direct address to the child: you\'re safe',
    ],
    things_to_avoid: [
      'A storm that threatens',
      'A keeper in distress',
    ],
  },
  {
    id: 'the_last_page_before_sleep',
    category_id: 'cozy_and_calm',
    title: 'The Last Page Before Sleep',
    description: 'A meta bedtime story — the book itself becomes the bedtime ritual.',
    premise:
      'The story addresses the child reading. It walks them through the bedtime ritual itself — closing the book, last sip of water, hugs goodnight, head on pillow, slow breaths, watching the ceiling shadows, drifting. The final spreads slow further and further, sentences shorter, until the child is asleep before the last word.',
    age_min: 3, age_max: 5, age_sweet_spot: 4,
    gender_fit: 'any',
    best_traits: ['sensitive', 'gentle'],
    interests: ['bedtime_stories', 'family'],
    energy: 'cozy',
    why_it_works: 'Meta-bedtime is rare and powerful. Designed to read children to sleep, literally.',
    required_beats: [
      'Direct address to the child reader',
      'Walk through the bedtime ritual',
      'Sentences slow and shorten',
      'Last spread is barely a sentence',
      'Implied sleep before the book closes',
    ],
    things_to_avoid: [
      'Plot, conflict, or stimulation',
      'Loud or bright imagery',
    ],
  },
  {
    id: 'the_long_way_home',
    category_id: 'cozy_and_calm',
    title: 'The Long Way Home',
    description: 'Your child takes the long way home as evening falls — and notices the world they\'ve always known.',
    premise:
      'The child takes the long way home from somewhere — school, a friend\'s house, an errand. Evening is settling. They notice things they\'ve walked past a thousand times: an old tree, a particular light in a window, a neighbor\'s garden, the sound of distant dinner. The story\'s pace mirrors the slow walk. They arrive home with no big revelation, just a settled, grounded calm.',
    age_min: 8, age_max: 11, age_sweet_spot: 9,
    gender_fit: 'any',
    best_traits: ['thoughtful', 'gentle', 'sensitive'],
    interests: ['nature_and_gardens'],
    energy: 'cozy',
    why_it_works: 'Mindfulness for older kids. The "no revelation" structure is mature and unusual.',
    required_beats: [
      'Decision to take the long way',
      'Five things noticed slowly',
      'Evening light deepens',
      'Arriving home, settled',
      'No moral, just presence',
    ],
    things_to_avoid: [
      'A profound insight at the end',
      'Action or interruption',
    ],
  },
  {
    id: 'the_year_i_was_twelve',
    category_id: 'cozy_and_calm',
    title: 'The Year I Was Twelve',
    description: 'A reflective bedtime piece for the older child — quietly honoring that growing up is strange and real.',
    premise:
      'The story is reflective, almost like a memory, told to the child reading. It honors that being eleven or twelve is a strange in-between place — not little, not grown. It names some of the small, quiet truths of this age: when something the child loved as a kid suddenly feels small, when a feeling has no name, when the future feels both close and far. It ends with a gentle "and that\'s okay. Sleep now."',
    age_min: 11, age_max: 12, age_sweet_spot: 12,
    gender_fit: 'any',
    best_traits: ['thoughtful', 'sensitive', 'gentle'],
    interests: ['bedtime_stories'],
    energy: 'cozy',
    why_it_works: 'Older-kid bedtime stories barely exist. This honors the strangeness of growing up at age-appropriate depth.',
    required_beats: [
      'Direct, gentle address to the child reader',
      'Three small in-between truths named',
      'Acknowledgement that the strangeness is real',
      '"And that\'s okay. Sleep now."',
    ],
    things_to_avoid: [
      'Lecturing about growing up',
      'Implication that this age is a problem to solve',
    ],
  },
];

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

export function getStoryById(id: string): StoryTemplate | undefined {
  return STORIES.find((s) => s.id === id);
}

export function getStoriesByCategory(categoryId: string): StoryTemplate[] {
  return STORIES.filter((s) => s.category_id === categoryId);
}

export function getCategoryById(id: string): CategoryDefinition | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function getActiveCategories(): CategoryDefinition[] {
  return CATEGORIES.filter((c) => c.status === 'active').sort((a, b) => a.order - b.order);
}
