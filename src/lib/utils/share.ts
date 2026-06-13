import { customAlphabet } from 'nanoid';
import { getSiteUrl } from './site-url';

const generateSlug = customAlphabet('abcdefghkmnpqrstuvwxyz23456789', 8);

export function createShareSlug(): string {
  return generateSlug();
}

export function getShareUrl(slug: string): string {
  return `${getSiteUrl()}/share/${slug}`;
}
