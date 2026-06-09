export interface LibraryBook {
  id: number;
  slug: string;
  title: string;
  emoji: string;
  palette: string;
  category: string;
  ages: string;
  values: string[];
  moods: string[];
  formats: string[];
  duration: string;
  narrator: string;
  description: string;
  featured: boolean;
}

function toSlug(title: string): string {
  return title.toLowerCase().replace(/['']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function coverImagePath(slug: string): string {
  return `/images/library/covers/${slug}.webp`;
}

export function featuredImagePath(slug: string): string {
  return `/images/library/featured/${slug}.webp`;
}

const PALETTE: Record<string, [string, string]> = {
  space: ['#3a2a6e', '#6d4fb0'],
  sea: ['#0f3a52', '#1d7a8c'],
  forest: ['#1d4633', '#3a8a5a'],
  warm: ['#5a2740', '#b0506a'],
  gold: ['#5a4520', '#c9922e'],
  night: ['#1a2150', '#3a4596'],
  rose: ['#542a55', '#a05a9a'],
  ember: ['#5a2a1c', '#c2603a'],
  mint: ['#1e4a4a', '#3aa08a'],
  dusk: ['#2a2c6e', '#7a6bc0'],
};

export function paletteGradient(key: string): string {
  const p = PALETTE[key] ?? PALETTE.night;
  return `linear-gradient(165deg, ${p[0]}, ${p[1]})`;
}

const BOOKS_RAW: Omit<LibraryBook, 'id' | 'slug'>[] = [
  { title: 'Beyond the Stars', emoji: '🚀', palette: 'space', category: 'Big Adventures', ages: '6–8', values: ['Curiosity', 'Courage'], moods: ['Magical', 'Adventurous'], formats: ['read', 'listen', 'watch'], duration: '9 min', narrator: 'Sarah', featured: true, description: 'When a tiny rocket lands in the backyard, one curious kid and a giggling little alien set off to count the stars — and discover that home is the best place in the whole galaxy.' },
  { title: 'The Jungle Expedition', emoji: '🦜', palette: 'forest', category: 'Big Adventures', ages: '6–8', values: ['Curiosity', 'Perseverance'], moods: ['Adventurous', 'Exciting'], formats: ['read', 'listen', 'watch'], duration: '10 min', narrator: 'George', featured: true, description: 'Deep in a vine-tangled jungle, a young explorer follows a bright parrot toward a waterfall that hides a secret no grown-up has ever found.' },
  { title: 'Pirate Treasure Hunt', emoji: '🏴‍☠️', palette: 'gold', category: 'Big Adventures', ages: '6–8', values: ['Courage', 'Teamwork'], moods: ['Exciting', 'Adventurous'], formats: ['read', 'listen', 'watch'], duration: '11 min', narrator: 'Bill', featured: true, description: 'X marks the spot — but the real treasure is the crew of friends who sail through the storm together to find it.' },
  { title: "The Lighthouse Keeper's Cat", emoji: '🐈', palette: 'sea', category: 'Animal Friends', ages: '4–5', values: ['Kindness', 'Friendship'], moods: ['Cozy', 'Heartwarming'], formats: ['read', 'listen'], duration: '6 min', narrator: 'Matilda', featured: false, description: 'Every night the little cat lights the lamp so the fishing boats find their way home. Tonight, the fog is thick — and a lost gull needs her help.' },
  { title: 'When I Feel Like a Storm', emoji: '⛈️', palette: 'night', category: 'All My Feelings', ages: '4–5', values: ['Empathy'], moods: ['Calming', 'Heartwarming'], formats: ['read', 'listen'], duration: '5 min', narrator: 'Alice', featured: true, description: 'Big feelings can rumble like thunder. A gentle story about noticing the storm inside, and finding the calm blue sky that always comes after.' },
  { title: 'The Littlest Astronaut', emoji: '🌙', palette: 'dusk', category: 'I Can Do It!', ages: '4–5', values: ['Courage', 'Independence'], moods: ['Dreamy', 'Magical'], formats: ['read', 'listen', 'watch'], duration: '7 min', narrator: 'Lily', featured: false, description: "Everyone says she's too small to reach the moon. So she builds a ladder of brave little tries — one rung at a time." },
  { title: "Grandpa's Garden", emoji: '🌻', palette: 'gold', category: 'Family & Friends', ages: '4–5', values: ['Gratitude', 'Patience'], moods: ['Cozy', 'Heartwarming'], formats: ['read', 'listen'], duration: '6 min', narrator: 'Brian', featured: false, description: 'Seeds take time, Grandpa says. Through one slow summer, a child learns that the best things — sunflowers and grandpas — are worth the wait.' },
  { title: 'Race Around the World', emoji: '🎈', palette: 'sea', category: 'Wonders of the World', ages: '6–8', values: ['Curiosity', 'Perseverance'], moods: ['Exciting', 'Adventurous'], formats: ['read', 'listen', 'watch'], duration: '10 min', narrator: 'Daniel', featured: false, description: "Hop in the hot-air balloon! From snowy peaks to golden deserts, it's a whirlwind tour of the wonders that make our planet so amazing." },
  { title: 'The Brave Little Lantern', emoji: '🏮', palette: 'ember', category: 'I Can Do It!', ages: '4–5', values: ['Courage', 'Kindness'], moods: ['Cozy', 'Magical'], formats: ['read', 'listen'], duration: '6 min', narrator: 'Charlotte', featured: false, description: 'The smallest lantern is scared of the dark. But when the village blackout comes, its little flame turns out to be exactly enough.' },
  { title: 'Two Friends and a Kite', emoji: '🪁', palette: 'mint', category: 'Family & Friends', ages: '4–5', values: ['Friendship', 'Teamwork'], moods: ['Silly', 'Heartwarming'], formats: ['read', 'listen'], duration: '5 min', narrator: 'Sarah', featured: false, description: "One holds the string, one chases the wind. A bouncy little tale about sharing the sky and never letting go of a friend." },
  { title: 'The Whale Who Lost His Song', emoji: '🐋', palette: 'sea', category: 'Animal Friends', ages: '6–8', values: ['Empathy', 'Perseverance'], moods: ['Calming', 'Heartwarming'], formats: ['read', 'listen', 'watch'], duration: '8 min', narrator: 'George', featured: false, description: 'A young whale wakes one morning with no song to sing. He swims the whole wide ocean to find it — and learns to listen along the way.' },
  { title: 'Goodnight, Little Comet', emoji: '☄️', palette: 'dusk', category: 'Cozy & Calm', ages: '2–3', values: ['Gratitude'], moods: ['Dreamy', 'Calming'], formats: ['read', 'listen'], duration: '4 min', narrator: 'Matilda', featured: true, description: 'As the comet drifts past sleepy planets, each one whispers goodnight. The gentlest bedtime glide across a hushed and starry sky.' },
  { title: 'The Secret of the Old Map', emoji: '🗺️', palette: 'gold', category: 'Big Adventures', ages: '9–12', values: ['Curiosity', 'Honesty'], moods: ['Exciting', 'Magical'], formats: ['read', 'listen'], duration: '12 min', narrator: 'Bill', featured: false, description: "A faded map in the attic leads to a riddle, a hidden door, and a choice about what's really worth keeping." },
  { title: 'My Loud, Wonderful Family', emoji: '🏡', palette: 'warm', category: 'Family & Friends', ages: '4–5', values: ['Gratitude', 'Empathy'], moods: ['Silly', 'Heartwarming'], formats: ['read', 'listen'], duration: '6 min', narrator: 'Alice', featured: false, description: 'Sometimes home is too loud and too busy. But a wandering child discovers that loud is just love being everywhere at once.' },
  { title: 'The Dragon Who Was Afraid of Fire', emoji: '🐉', palette: 'ember', category: 'All My Feelings', ages: '6–8', values: ['Courage', 'Honesty'], moods: ['Silly', 'Heartwarming'], formats: ['read', 'listen', 'watch'], duration: '9 min', narrator: 'Daniel', featured: false, description: "Every dragon breathes fire — except Pip. A warm, funny story about being different and finding the spark that's truly yours." },
  { title: 'Stargazing with Mom', emoji: '🔭', palette: 'night', category: 'Wonders of the World', ages: '6–8', values: ['Curiosity', 'Gratitude'], moods: ['Dreamy', 'Calming'], formats: ['read', 'listen'], duration: '7 min', narrator: 'Charlotte', featured: false, description: "One blanket, one telescope, one quiet night. A child and their mom name the constellations and the things they're thankful for." },
  { title: 'The Tiniest Seed', emoji: '🌱', palette: 'forest', category: 'Cozy & Calm', ages: '2–3', values: ['Patience', 'Perseverance'], moods: ['Calming', 'Heartwarming'], formats: ['read', 'listen'], duration: '4 min', narrator: 'Lily', featured: false, description: 'Push, little seed, push! A simple, soothing story of growing — slowly, surely — into something tall and green and proud.' },
  { title: 'Detective Daisy and the Missing Sock', emoji: '🧦', palette: 'rose', category: 'I Can Do It!', ages: '4–5', values: ['Perseverance', 'Independence'], moods: ['Silly', 'Exciting'], formats: ['read', 'listen'], duration: '6 min', narrator: 'Sarah', featured: false, description: 'One sock has vanished! Magnifying glass in hand, Daisy follows the clues all over the house in this giggly little mystery.' },
  { title: 'The Stranger from the Sea', emoji: '🌊', palette: 'sea', category: 'Big Adventures', ages: '9–12', values: ['Kindness', 'Empathy'], moods: ['Magical', 'Heartwarming'], formats: ['read', 'listen'], duration: '11 min', narrator: 'Brian', featured: false, description: "A mysterious visitor washes ashore one stormy night. A thoughtful story about welcoming what we don't yet understand." },
  { title: 'Hugo the Hedgehog Says Sorry', emoji: '🦔', palette: 'forest', category: 'All My Feelings', ages: '2–3', values: ['Honesty', 'Kindness'], moods: ['Cozy', 'Heartwarming'], formats: ['read', 'listen'], duration: '4 min', narrator: 'Matilda', featured: false, description: "Hugo knocked over the acorn tower — and it wasn't even his! A tender first lesson in owning up and making things right." },
  { title: 'The Audition', emoji: '🎭', palette: 'warm', category: 'I Can Do It!', ages: '9–12', values: ['Courage', 'Perseverance'], moods: ['Heartwarming', 'Exciting'], formats: ['read', 'listen'], duration: '10 min', narrator: 'Alice', featured: false, description: 'Spotlight, racing heart, one big breath. A story about stage fright, second tries, and the brave kind of magic that lives in showing up.' },
  { title: "Penguin's First Swim", emoji: '🐧', palette: 'mint', category: 'Animal Friends', ages: '2–3', values: ['Courage', 'Friendship'], moods: ['Silly', 'Cozy'], formats: ['read', 'listen', 'watch'], duration: '5 min', narrator: 'Lily', featured: false, description: 'The water looks so cold and so big. With a friend by his side, one little penguin takes the bravest tiny jump of his life.' },
  { title: "The Moon's Birthday Party", emoji: '🌝', palette: 'dusk', category: 'Cozy & Calm', ages: '4–5', values: ['Friendship', 'Gratitude'], moods: ['Dreamy', 'Magical'], formats: ['read', 'listen'], duration: '6 min', narrator: 'Charlotte', featured: false, description: "Every star is invited! A soft, sparkly bedtime story about celebrating the people — and planets — you love." },
  { title: 'Captain of the Cardboard Ship', emoji: '📦', palette: 'ember', category: 'Family & Friends', ages: '4–5', values: ['Curiosity', 'Teamwork'], moods: ['Silly', 'Adventurous'], formats: ['read', 'listen'], duration: '6 min', narrator: 'Bill', featured: false, description: 'A rainy day, a big box, and the wildest imaginary voyage two siblings ever sailed across the living-room sea.' },
];

const BOOKS: LibraryBook[] = BOOKS_RAW.map((b, i) => ({ ...b, id: i, slug: toSlug(b.title) }));

export function getLibraryBooks(): LibraryBook[] {
  return BOOKS;
}

export const CATEGORIES = ['Big Adventures', 'Animal Friends', 'All My Feelings', 'I Can Do It!', 'Family & Friends', 'Wonders of the World', 'Cozy & Calm'];
export const AGE_RANGES = ['2–3', '4–5', '6–8', '9–12'];
export const VALUES = ['Courage', 'Kindness', 'Perseverance', 'Friendship', 'Curiosity', 'Honesty', 'Gratitude', 'Empathy', 'Independence', 'Teamwork'];
export const MOODS = ['Cozy', 'Exciting', 'Silly', 'Calming', 'Heartwarming', 'Magical', 'Adventurous', 'Dreamy'];
