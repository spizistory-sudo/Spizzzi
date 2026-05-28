export const ART_STYLES = {
  watercolor: {
    name: 'Watercolor Dreams',
    stylePrompt: `Authentic traditional watercolor painting on textured paper. CRITICAL: This must look like a real hand-painted watercolor, NOT a digital illustration and NOT a 3D render. Visible water bleeds, soft pigment washes pooling and blending wet-on-wet, white paper showing through in highlights, organic uneven edges where colors meet paper. Muted pastel palette dominated by soft blues, gentle yellows, warm peach tones, dusty greens. Loose brush strokes visible throughout. Style of Beatrix Potter and Winnie-the-Pooh classic illustrations. Soft natural lighting, no harsh shadows. The scene fills the entire frame edge to edge with no borders. Avoid: digital cleanness, vector lines, 3D rendering, photorealism, cel-shading, anime style, bold outlines.`,
    previewDescription: 'Hand-painted watercolor like classic storybooks',
  },
  comic: {
    name: 'Bold Comic',
    stylePrompt: `Bold comic book illustration style. CRITICAL: Thick black ink outlines on every character and object, dynamic action poses, flat saturated colors with comic-style halftone dots or solid color fills, no gradients. High-contrast colors: deep reds, electric blues, bright yellows, jet blacks. Characters have exaggerated expressions and dynamic body language as if mid-action. Speed lines and energy effects where appropriate. Style inspired by Dog Man, Wings of Fire, and modern children's graphic novels. The scene fills the entire frame edge to edge with no borders. Avoid: watercolor softness, photorealism, 3D rendering, pastel colors, soft edges, subtle gradients.`,
    previewDescription: 'Action-packed comic book energy',
  },
  anime: {
    name: 'Anime Fantasy',
    stylePrompt: `Studio Ghibli-inspired anime illustration. CRITICAL: Large expressive eyes with detailed iris reflections, soft cel-shaded skin and clothing with clear color zones not gradients, magical atmospheric lighting with visible particles or sparkles, lush detailed backgrounds with depth. Color palette emphasizes magical jewel tones — deep blues, rich purples, warm sunset oranges, emerald greens. Characters have soft rounded faces with delicate features. Wind and movement feel present in hair and clothing. Style of Spirited Away, Howl's Moving Castle, My Neighbor Totoro. The scene fills the entire frame edge to edge with no borders. Avoid: comic outlines, photorealism, watercolor blending, 3D rendering, claymation texture.`,
    previewDescription: 'Magical anime style with big expressive eyes',
  },
  claymation: {
    name: 'Claymation',
    stylePrompt: `Stop-motion claymation 3D style. CRITICAL: Characters and objects appear hand-sculpted from clay or plasticine, with visible fingerprints, sculptural seams, slight asymmetry, and matte textured surfaces. Soft warm studio lighting like a stop-motion film set. Colors are slightly muted and earthy as if from real clay pigments. Characters have tactile chunky proportions, rounded forms, no sharp edges. Backgrounds look like real handcrafted miniature sets. Style of Wallace & Gromit, Shaun the Sheep, Chicken Run. The scene fills the entire frame edge to edge with no borders. Avoid: 2D illustration, watercolor, anime, comic outlines, sharp digital edges, glossy CGI, vector clean lines.`,
    previewDescription: 'Hand-sculpted clay characters, like Aardman films',
  },
  minimalist: {
    name: 'Minimalist Doodle',
    stylePrompt: `Minimalist hand-drawn doodle illustration. CRITICAL: Simple confident line work using only a few brush weights, generous white space throughout the composition, limited color palette of only 3-5 hand-picked colors per scene. Imperfect hand-drawn quality, slight wobbles in lines, friendly approachable simplicity. Characters are drawn with the fewest possible lines while remaining expressive. No detailed backgrounds — just essential elements floating in space. Style of Mo Willems (Elephant & Piggie), Oliver Jeffers, Jon Klassen. The scene fills the entire frame edge to edge but uses negative space generously. Avoid: detailed rendering, photorealism, 3D, gradients, complex backgrounds, busy compositions, multiple textures.`,
    previewDescription: 'Simple, soulful line doodles with lots of space',
  },
  storybook: {
    name: 'Classic Storybook',
    stylePrompt: `Rich painterly traditional illustration in the golden age children's book tradition. CRITICAL: Warm oil-painted or gouache texture with visible brush work, deep saturated jewel tones — burgundy, forest green, gold, deep blue — mixed with warm earth tones. Detailed atmospheric backgrounds with chiaroscuro lighting creating depth and cozy mood. Characters have realistic but slightly idealized proportions, painted with care to facial features. Style of golden age illustrators like Arthur Rackham, N.C. Wyeth, Maurice Sendak. The scene fills the entire frame edge to edge with no borders. Avoid: digital sharpness, watercolor pastels, comic outlines, 3D rendering, anime style, minimalist simplicity.`,
    previewDescription: 'Rich, classic golden-age storybook art',
  },
  pixar: {
    name: 'Pixar Adventure',
    stylePrompt: `Modern 3D animated film illustration in the Pixar/Disney style. CRITICAL: Smooth 3D rendered characters with soft subsurface skin shading, cinematic lighting with rim lights and color contrast, hyper-expressive faces with large eyes and clear emotion, detailed environments with depth of field. Vibrant saturated colors but with realistic light behavior. Characters have rounded friendly proportions, slightly larger heads for children. Style of Pixar's Up, Coco, Inside Out, Disney's Tangled, Frozen. The scene fills the entire frame edge to edge with no borders. Avoid: 2D illustration, flat colors, watercolor, comic outlines, hand-painted textures, claymation imperfection.`,
    previewDescription: 'Cinematic 3D animation like Pixar films',
  },
  vintage: {
    name: 'Vintage Nostalgia',
    stylePrompt: `Vintage mid-century children's book illustration style. CRITICAL: Limited retro color palette of muted oranges, ochres, teals, and creams. Visible printing texture as if from screen-printing or lithography, slight color registration imperfections, grainy paper feel. Characters drawn with clean simple shapes but with vintage charm. Backgrounds use flat color blocks with simple patterns. Style of 1950s-60s children's books — think Mary Blair, Richard Scarry's early work, Little Golden Books. The scene fills the entire frame edge to edge with no borders. Avoid: modern digital cleanness, photorealism, 3D rendering, anime style, comic outlines, saturated vivid colors.`,
    previewDescription: 'Charming retro mid-century storybook style',
  },
} as const;

export type ArtStyleKey = keyof typeof ART_STYLES;
export const ART_STYLE_KEYS = Object.keys(ART_STYLES) as ArtStyleKey[];
