import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

// Kept for backward compatibility — alias for getAnthropicClient()
export const anthropic = { get messages() { return getAnthropicClient().messages; } };

// Use the dated model identifier for stability.
// If this errors with "model not found", check the latest at:
// https://docs.claude.com/en/docs/about-claude/models
export const CLAUDE_MODEL = 'claude-sonnet-4-5-20250929';
