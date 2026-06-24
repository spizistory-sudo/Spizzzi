export async function withGeminiRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; baseDelayMs?: number; callName?: string } = {},
): Promise<T> {
  const { retries = 3, baseDelayMs = 1500, callName = 'gemini-call' } = opts;
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const status = extractStatus(err);
      const retryable = status === 500 || status === 503 || status === 429;

      if (retryable && attempt < retries) {
        const jitter = Math.random() * 500;
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1) + jitter;
        console.log(`[gemini-retry] attempt ${attempt} for ${callName} got ${status}, retrying in ${Math.round(delayMs)}ms`);
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }

      break;
    }
  }

  throw lastError;
}

function extractStatus(err: unknown): number | undefined {
  if (typeof err === 'object' && err !== null) {
    const e = err as Record<string, unknown>;
    if (typeof e.status === 'number') return e.status;
    if (typeof e.statusCode === 'number') return e.statusCode;
  }
  if (err instanceof Error) {
    if (err.message.includes('503')) return 503;
    if (err.message.includes('500')) return 500;
    if (err.message.includes('429')) return 429;
  }
  return undefined;
}
