export interface Theme {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  age_range_min: number;
  age_range_max: number;
  thumbnail_url: string | null;
  prompt_template: string;
  page_count: number;
  is_active: boolean;
  created_at: string;
}

export interface ThemeDefinition {
  slug: string;
  name: string;
  category: string;
  description: string;
  pageCount: number;
  ageRange: [number, number];
  promptTemplate: string;
  emoji: string;
}
