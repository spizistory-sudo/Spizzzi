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

  // 4. Child name not at end of rhyming line (only if rhymes required)
  if (rules.rhymeRequired) {
    const cleanChildName = stripNiqqud(childName);
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

  // 5. Forbidden phrases
  const forbiddenPhrases = ['היה היה', 'באושר ועושר', 'מיינדפולנס', 'ויסות רגשי'];
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
