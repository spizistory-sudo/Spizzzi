export const ART_STYLES = {
  watercolor: {
    name: 'Watercolor Dreams',
    stylePrompt: `A modern traditional watercolor painting on cold-pressed paper. Visible wet-on-wet pigment bleeding, soft granulation, white paper showing through in the highlights, organic uneven edges where colors meet. Loose visible brushstrokes, no hard outlines anywhere. Slightly modern contemporary watercolor sensibility — not overly old-fashioned, more contemporary picture-book watercolor than vintage. Muted pastel palette of soft blues, gentle peach, dusty greens, and warm cream, with luminous lighting. The painting style is reminiscent of Beatrix Potter and Winnie-the-Pooh but with a fresher modern feel. NOT a digital illustration, NOT a 3D render, NOT a cartoon. No bold black outlines.`,
    previewDescription: 'Hand-painted watercolor like classic storybooks',
    storyTonePrompt: `A gentle, quiet, reflective tone. Use soft sensory language — whispers, shimmers, gentle breezes. Slow rhythm. Lots of emotional interiority. Words like 'soft,' 'gentle,' 'warm,' 'hush.' Avoid action verbs. The story unfolds like a memory.`,
  },
  comic: {
    name: 'Bold Comic',
    stylePrompt: `A bold comic book illustration page laid out as classic comic book panels. The composition uses multi-panel grid layout dividing the image into separate comic panels, each showing a different action moment. Across the panels: a young child LEAPING dynamically through a forest, eyes wide with excitement, hair blowing back, a small book in their hand SHOOTING out a burst of magical light. Speech bubbles with bold black lettering reading "POW!" and "ZAP!" in jagged sound-effect shapes. Speed lines radiate around the character showing motion. THICK BLACK INK OUTLINES on every character, every tree, every object, every panel border. FLAT saturated colors only, no gradients. Ben-Day halftone dot patterns visible in the shading. High-contrast palette of pure red, electric blue, bright yellow, white, and jet black. Style of Dog Man by Dav Pilkey, Wings of Fire graphic novels, Captain Underpants, Bone by Jeff Smith. NOT painterly, NOT soft, NOT watercolor.`,
    previewDescription: 'Action-packed comic book energy with panels and sound effects',
    storyTonePrompt: `An energetic, action-driven tone. Bold verbs. Short punchy sentences. Sound effects ('whoosh,' 'crash,' 'leap'). Characters move and react. Excited dialogue. Words like 'dash,' 'zoom,' 'pow.' The pace is fast and the energy is high.`,
  },
  anime: {
    name: 'Anime Fantasy',
    stylePrompt: `A Studio Ghibli anime film cel illustration. Hand-drawn 2D animation cel-shading with clear color zones. The character has large expressive eyes with detailed iris reflections and highlights. Soft cel-shaded skin and clothing. Hand-painted lush atmospheric background with depth and detail — a forest at dusk with warm sunset light filtering through trees, fireflies and glowing magical particles floating in the air, soft wind moving the character's hair. Color palette of deep cerulean blue, rich purples, warm sunset orange, and emerald green. Style of Hayao Miyazaki — Spirited Away, My Neighbor Totoro, Howl's Moving Castle. NOT a 3D render, NOT a comic with black outlines, NOT a watercolor.`,
    previewDescription: 'Magical Studio Ghibli anime with big expressive eyes',
    storyTonePrompt: `A wondrous, magical tone with hints of mystery. Lyrical language. Hints of larger forces at play. Sensory details about light, wind, and atmosphere. Emotional moments held longer. Words like 'shimmer,' 'whispered,' 'glowed.' Pace builds gently to magical beats.`,
  },
  claymation: {
    name: 'Claymation',
    stylePrompt: `A photograph of a stop-motion claymation scene with bright cheerful lighting. A young child made of plasticine clay is holding a small glowing book, standing in a miniature handcrafted forest set with clay trees, clay flowers, and a clay path. The clay character has visible fingerprint marks pressed into the clay, sculptural seams where pieces were joined, slight asymmetrical handmade imperfections, and a matte clay surface texture. Bright and inviting studio photography lighting — not moody, not dark. Cheerful saturated colors (bright greens, oranges, blues) but still earthy clay-pigment tones. Chunky rounded clay proportions. Style of Wallace & Gromit, Shaun the Sheep, Aardman Animations. This is a REAL PHOTOGRAPH of a physical clay model, NOT a 2D illustration, NOT a digital painting, NOT a 3D CGI render.`,
    previewDescription: 'Hand-sculpted bright clay characters, like Aardman films',
    storyTonePrompt: `A playful, tactile tone. Sensory language emphasizing texture and shape. Slightly silly humor. Onomatopoeia for physical actions ('squish,' 'plop,' 'wobble'). Characters are huggable and warm. Short rhythmic sentences. Light comedy throughout.`,
  },
  minimalist: {
    name: 'Minimalist Doodle',
    stylePrompt: `A minimalist hand-drawn picture book illustration with MASSIVE white negative space dominating the composition. A young child is holding a small glowing book — drawn with the fewest possible pen-and-ink lines while remaining expressive. The character is a simple line drawing in a few brush weights. Only 3-4 flat solid colors total in the entire image (no shading, no rendering). Background elements are suggested with just a couple of simple shapes — NO detailed backgrounds, NO lush forests. Slight imperfect hand-drawn wobble in every line. Generous empty white space surrounds the character on all sides. Style of Jon Klassen ("I Want My Hat Back"), Oliver Jeffers, Mo Willems (Pigeon books, Elephant & Piggie). NOT a detailed illustration, NOT 3D, NOT a busy composition.`,
    previewDescription: 'Simple, soulful line doodles with lots of space',
    storyTonePrompt: `A simple, warm, conversational tone. Short clear sentences. Lots of white space in meaning. Big feelings expressed simply. Words a young child would use. Pauses for the reader. Style of Mo Willems or Jon Klassen — gentle wit with deep heart.`,
  },
  storybook: {
    name: 'Modern Picture Book',
    stylePrompt: `A modern literary picture book illustration in the style of contemporary award-winning children's books. The medium is GOUACHE AND ACRYLIC PAINT on textured paper — opaque, matte, slightly chalky paint with visible flat color areas and gentle textured brushwork. NOT translucent watercolor washes. NOT digital. The composition is thoughtfully designed and graphically composed — clear shapes, considered negative space, slightly stylized rather than realistic. Bright sophisticated palette with warmth and lightness — soft teal, dusty rose, warm ochre, soft sage green, cream, with bright highlights — earthy and considered but inviting and luminous, NOT dark or moody. The character has a slightly geometric, stylized, intentional design — not cute cartoon, not soft watercolor. Painterly texture but with strong graphic clarity. The mood is quiet, literary, and inviting. Style of Jon Klassen's painted books, Sophie Blackall, Christian Robinson, Carson Ellis, Beatrice Alemagna, Isabelle Arsenault — modern Caldecott Medal winners. NOT a transparent watercolor wash, NOT a soft fluffy storybook, NOT a digital illustration.`,
    previewDescription: 'Modern award-winning picture book art',
    storyTonePrompt: `A classic literary tone. Rich descriptive language. Slightly elevated vocabulary appropriate for read-aloud. Atmospheric scenes. Sentences with cadence and rhythm. Old-fashioned warmth. Words like 'gleamed,' 'beckoned,' 'gathered.' Suitable for a fireside reading.`,
  },
  pixar: {
    name: 'Pixar Adventure',
    stylePrompt: `A Pixar Studios 3D animated film still with cinematic depth and bright daylight atmosphere. A young child stands in a richly detailed forest environment — visible trees, foliage, sky, distant landscape, a sense of place and adventure in the background — with shallow depth of field bokeh keeping the focus on the character. The character is CGI-rendered with smooth subsurface scattering skin shading, soft volumetric atmospheric fog drifting between trees, cinematic three-point lighting with warm rim lights, and bright cheerful daylight illumination. The character has round soft 3D-modeled proportions with oversized expressive eyes. Vibrant saturated colors with photorealistic light physics. Style of Pixar's Up, Coco, Inside Out, Soul, and Brave. This is a 3D RENDER, NOT a 2D illustration, NOT painted, NOT hand-drawn, NOT dark or moody.`,
    previewDescription: 'Cinematic 3D animation like Pixar films',
    storyTonePrompt: `A cinematic emotional tone. Clear story beats with rising tension and heartfelt resolution. Witty asides. Big feelings explored honestly. Dialogue feels natural and contemporary. Pacing matches a Pixar film — funny, then deep, then triumphant.`,
  },
  vintage: {
    name: 'Vintage Nostalgia',
    stylePrompt: `A 1950s vintage screen-printed children's book illustration. Limited retro palette of exactly 4-5 colors: muted mustard orange, dusty teal, faded brick red, and cream paper background. Visible screen-print registration where the color layers are offset by a millimeter or two. Grainy paper texture throughout. The character and forest are made of FLAT GEOMETRIC SHAPES — no shading, no gradients, no detailed rendering. Decorative stylized character design. Style of Mary Blair's Disney concept art, Richard Scarry's earliest 1950s work, Little Golden Books from 1955-1965, and Charley Harper. NOT modern, NOT detailed, NOT digitally clean.`,
    previewDescription: 'Charming retro mid-century storybook style',
    storyTonePrompt: `A nostalgic, gentle, slightly old-fashioned tone. Reminiscent of mid-century children's books. Simple repeating phrases. Warm familiar imagery — milk and cookies, garden flowers, evening light. Words a grandparent might use. The mood is cozy and timeless.`,
  },
} as const;

export type ArtStyleKey = keyof typeof ART_STYLES;
export const ART_STYLE_KEYS = Object.keys(ART_STYLES) as ArtStyleKey[];
