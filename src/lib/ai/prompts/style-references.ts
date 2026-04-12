export const ART_STYLES = {
  watercolor: {
    name: 'Watercolor Dream',
    stylePrompt: `Soft watercolor painting style. Visible delicate brush strokes, pastel color palette with gentle washes of color, dreamy and ethereal lighting, soft edges and organic shapes. Colors bleed slightly into each other creating a warm, handmade feel. Paint directly onto a flat canvas — the scene fills the entire frame edge to edge with no borders.`,
    previewDescription: 'Soft, dreamy watercolors with gentle pastel tones',
  },
  cartoon: {
    name: 'Bold & Bright',
    stylePrompt: `Modern cartoon illustration style. Clean vector-like lines with bold black outlines, bright and saturated colors, fun and energetic. Characters have large expressive eyes and exaggerated proportions (slightly bigger head). Flat color fills with minimal shading. Cheerful, colorful backgrounds with simple geometric patterns. The scene fills the entire frame edge to edge with no borders.`,
    previewDescription: 'Fun, colorful cartoon with bold outlines',
  },
  storybook: {
    name: 'Classic Storybook',
    stylePrompt: `Traditional illustration style reminiscent of golden age children's art. Warm earth tones mixed with rich jewel colors, detailed and textured backgrounds with depth, soft but defined lighting creating a cozy atmosphere. Characters have realistic proportions with gentle, friendly features. Painterly technique with visible texture. The scene fills the entire frame edge to edge with no borders.`,
    previewDescription: 'Rich, warm classic storybook feel',
  },
} as const;

export type ArtStyleKey = keyof typeof ART_STYLES;
export const ART_STYLE_KEYS = Object.keys(ART_STYLES) as ArtStyleKey[];
