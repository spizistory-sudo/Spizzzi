export function isDevMode(): boolean {
  return process.env.DEV_MODE === 'true';
}

export function isDevNarration(): boolean {
  return process.env.DEV_NARRATION === 'true';
}

export function isDevPhotoAnalysis(): boolean {
  return process.env.DEV_PHOTO_ANALYSIS === 'true';
}

export function getTestPageCount(): number | null {
  const val = process.env.TEST_PAGE_COUNT;
  if (!val) return null;
  const num = parseInt(val, 10);
  return isNaN(num) ? null : num;
}
