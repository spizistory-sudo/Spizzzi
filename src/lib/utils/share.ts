import { customAlphabet } from 'nanoid';

const generateSlug = customAlphabet('abcdefghkmnpqrstuvwxyz23456789', 8);

export function createShareSlug(): string {
  return generateSlug();
}

export function getShareUrl(slug: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://spizzzi.vercel.app';
  return `${base}/share/${slug}`;
}
