import { AgeRules } from './prompts/age-rules';
import { stripNiqqud, countNiqqudRatio } from './strip-niqqud';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  score: number; // 0-100
}

export interface SpreadInput {
  spread_number: number;
  text: string;
}

export interface StoryForValidation {
  spreads: SpreadInput[];
  metadata?: {
    rhyme_pairs?: Array<[string, string]>;
    [key: string]: unknown;
  };
}

export function validateHebrewStory(
  story: StoryForValidation,
  rules: AgeRules,
  childName: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  // 1. Spread count
  const spreadCount = story.spreads.length;
  if (spreadCount < rules.spreadCount.min || spreadCount > rules.spreadCount.max) {
    warnings.push(
      `Spread count ${spreadCount} outside target ${rules.spreadCount.min}-${rules.spreadCount.max}`
    );
    score -= 10;
  }

  // 2. Word count per spread (warning, not error)
  story.spreads.forEach(spread => {
    const wordCount = spread.text.split(/\s+/).filter(Boolean).length;
    if (wordCount < rules.wordsPerSpread.min || wordCount > rules.wordsPerSpread.max) {
      warnings.push(
        `Spread ${spread.spread_number}: ${wordCount} words (target ${rules.wordsPerSpread.min}-${rules.wordsPerSpread.max})`
      );
      score -= 2;
    }
  });

  // 3. Niqqud completeness — only an error if niqqud is required AND ratio is very low
  if (rules.niqqudFull) {
    story.spreads.forEach(spread => {
      const ratio = countNiqqudRatio(spread.text);
      if (ratio < 0.5) {
        errors.push(
          `Spread ${spread.spread_number}: niqqud severely incomplete (${Math.round(ratio * 100)}%)`
        );
        score -= 15;
      } else if (ratio < 0.7) {
        warnings.push(
          `Spread ${spread.spread_number}: niqqud partial (${Math.round(ratio * 100)}%)`
        );
        score -= 5;
      }
    });
  }

  // 4. Rhyme checks (only if rhymes required)
  if (rules.rhymeRequired) {
    const cleanChildName = stripNiqqud(childName);

    // 4a. Check that lines 2 and 4 actually rhyme (ABCB scheme)
    let rhymeFailCount = 0;
    story.spreads.forEach(spread => {
      const lines = spread.text.split('\n').filter(Boolean);
      if (lines.length >= 4) {
        const word2 = getLastWord(lines[1]);
        const word4 = getLastWord(lines[3]);
        if (word2 && word4 && !basicRhymeCheck(word2, word4)) {
          errors.push(
            `Spread ${spread.spread_number}: lines 2 and 4 do not rhyme ("${stripNiqqud(word2)}" / "${stripNiqqud(word4)}")`
          );
          rhymeFailCount++;
        }
      } else {
        // Spread doesn't have 4 lines — not structured as verse at all
        errors.push(
          `Spread ${spread.spread_number}: not structured as verse — only ${lines.length} line(s), need 4 lines for ABCB rhyme`
        );
        rhymeFailCount++;
      }
    });
    // Big score penalty for rhyme failures — this is a hard requirement
    score -= rhymeFailCount * 20;

    // 4b. Child name not at end of rhyming line
    story.spreads.forEach(spread => {
      const lines = spread.text.split('\n').filter(Boolean);
      [1, 3].forEach(idx => {
        if (idx < lines.length) {
          const lastWord = getLastWord(lines[idx]);
          if (lastWord && stripNiqqud(lastWord) === cleanChildName) {
            errors.push(
              `Spread ${spread.spread_number}: child name at end of rhyming line ${idx + 1}`
            );
            score -= 10;
          }
        }
      });
    });
  }

  // 5. Forbidden phrases and words
  const forbiddenPhrases = [
    'היה היה', 'באושר ועושר', 'מיינדפולנס', 'ויסות רגשי',
    // Modern Hebrew offensive/inappropriate/ambiguous:
    'תחת',      // "ass" in modern colloquial, even if formal for "under"
    'אכל אותה', // vulgar expression
    'מטומטם',    // "stupid"
  ];
  const fullText = story.spreads.map(s => s.text).join(' ');
  forbiddenPhrases.forEach(phrase => {
    if (fullText.includes(phrase)) {
      errors.push(`Forbidden phrase: "${phrase}"`);
      score -= 5;
    }
  });

  // 6. Spread length consistency (warning only)
  const wordCounts = story.spreads.map(s => s.text.split(/\s+/).filter(Boolean).length);
  const avgWords = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
  const maxDeviation = Math.max(...wordCounts.map(c => Math.abs(c - avgWords)));
  if (maxDeviation > avgWords * 0.5) {
    warnings.push(
      `Inconsistent spread length: max deviation ${Math.round(maxDeviation)} from avg ${Math.round(avgWords)}`
    );
    score -= 3;
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    score: Math.max(0, score),
  };
}

function getLastWord(line: string): string {
  const words = line.trim().split(/\s+/).filter(Boolean);
  const lastWord = words[words.length - 1] || '';
  return lastWord.replace(/[.,!?;:"׳']/g, '');
}

/**
 * Basic Hebrew rhyme check — compares last 2 Hebrew characters after stripping niqqud/punctuation.
 * Permissive: catches obvious failures (completely different endings) without requiring
 * stressed-syllable analysis. Good enough to reject prose-when-rhyme-required.
 */
function basicRhymeCheck(word1: string, word2: string): boolean {
  const clean1 = stripNiqqud(word1).replace(/[^\u05D0-\u05EA]/g, '');
  const clean2 = stripNiqqud(word2).replace(/[^\u05D0-\u05EA]/g, '');
  if (clean1.length < 2 || clean2.length < 2) return false;
  return clean1.slice(-2) === clean2.slice(-2);
}
