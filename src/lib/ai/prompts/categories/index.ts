import { Category } from './types';
import { emotionsCategory } from './emotions';

export const CATEGORIES: Category[] = [
  emotionsCategory,
  // Phase 2 will add: achievement, family, adventure, world, roots
];

export const COMING_SOON_CATEGORIES: Pick<Category, 'id' | 'label_he' | 'emoji' | 'short_description' | 'status'>[] = [
  { id: 'achievement', label_he: 'אני יכול!', emoji: '⭐',
    short_description: 'סיפורים על חוסן, התמדה, וניסיון מחדש', status: 'coming_soon' },
  { id: 'family', label_he: 'חברים ומשפחה', emoji: '👨‍👩‍👧',
    short_description: 'סיפורים על קשרים — חברים, אחים, סבים', status: 'coming_soon' },
  { id: 'adventure', label_he: 'הרפתקה ודמיון', emoji: '🚀',
    short_description: 'סיפורים מלאי דמיון, מסעות, ועולמות פנטסטיים', status: 'coming_soon' },
  { id: 'world', label_he: 'העולם שלי', emoji: '🌍',
    short_description: 'סיפורים שמשלבים סקרנות לימודית עם עלילה', status: 'coming_soon' },
  { id: 'roots', label_he: 'שורשים וחגים', emoji: '🕯️',
    short_description: 'סיפורים על זהות, מסורת, וסיפורי משפחה', status: 'coming_soon' },
];

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find(c => c.id === id);
}

export function getTopicById(categoryId: string, topicId: string) {
  return getCategoryById(categoryId)?.topics.find(t => t.id === topicId);
}

export function getRandomTopic(categoryId: string) {
  const cat = getCategoryById(categoryId);
  if (!cat) return undefined;
  return cat.topics[Math.floor(Math.random() * cat.topics.length)];
}

export function getActiveCategories(): Category[] {
  return CATEGORIES.filter(c => c.status === 'active');
}
