export async function generateWithRateLimit<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 5000
): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const status = (error as { status?: number })?.status;
      if (status === 429 && attempt < retries - 1) {
        const backoff = delayMs * Math.pow(2, attempt);
        console.log(`Rate limited, retrying in ${backoff}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}
