import Anthropic from '@anthropic-ai/sdk';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set');
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Use the dated model identifier for stability.
// If this errors with "model not found", check the latest at:
// https://docs.claude.com/en/docs/about-claude/models
export const CLAUDE_MODEL = 'claude-sonnet-4-5-20250929';
