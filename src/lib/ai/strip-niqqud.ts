/**
 * Remove all Hebrew niqqud (vowel marks) from text.
 * Used for TTS input and for word comparisons in validation.
 */
export function stripNiqqud(text: string): string {
  return text.replace(/[\u05B0-\u05BC\u05C1\u05C2\u05C7]/g, '');
}

/**
 * Count the ratio of niqqud marks to Hebrew letters in text.
 * Returns 0–1.
 */
export function countNiqqudRatio(text: string): number {
  const hebrewLetters = text.match(/[\u05D0-\u05EA]/g) || [];
  const niqqudMarks = text.match(/[\u05B0-\u05BC\u05C1\u05C2\u05C7]/g) || [];
  if (hebrewLetters.length === 0) return 0;
  return niqqudMarks.length / hebrewLetters.length;
}
