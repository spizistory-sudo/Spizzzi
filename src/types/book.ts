export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  subscription_tier: 'free' | 'basic' | 'premium';
  monthly_credits: number;
  credits_used_this_month: number;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: string;
  user_id: string;
  theme_id: string | null;
  title: string;
  child_name: string;
  child_age: number | null;
  child_traits: string[] | null;
  creation_mode: 'template' | 'custom';
  custom_prompt: string | null;
  cover_style: string | null;
  status: 'draft' | 'generating' | 'review' | 'complete' | 'error';
  is_public: boolean;
  share_slug: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Page {
  id: string;
  book_id: string;
  page_number: number;
  text_content: string;
  illustration_prompt: string | null;
  illustration_url: string | null;
  illustration_status: 'pending' | 'generating' | 'complete' | 'error';
  animation_url: string | null;
  narration_url: string | null;
  narration_duration_ms: number | null;
  mood: string | null;
  created_at: string;
}

export interface CoverOption {
  id: string;
  book_id: string;
  style_name: string;
  image_url: string;
  style_prompt: string;
  is_selected: boolean;
  created_at: string;
}

export interface Photo {
  id: string;
  book_id: string;
  user_id: string;
  storage_path: string;
  label: string | null;
  created_at: string;
}

export interface BookWithPages extends Book {
  pages: Page[];
}
