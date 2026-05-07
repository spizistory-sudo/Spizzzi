export interface Topic {
  id: string;
  title_he: string;
  short_description: string;
  core_message: string;
  required_points: string[];
  age_specific_notes: {
    '2-4': string;
    '4-6': string;
    '6-8': string;
    '8-12': string;
  };
  things_to_avoid: string[];
  best_traits: string[];
}

export interface Category {
  id: string;
  label_he: string;
  emoji: string;
  short_description: string;
  document: string;
  topics: Topic[];
  status: 'active' | 'coming_soon';
}
