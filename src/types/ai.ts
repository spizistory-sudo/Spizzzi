export interface GenerateStoryRequest {
  themSlug: string;
  childName: string;
  childAge: number;
  childTraits: string[];
  language?: 'en' | 'he';
}

export interface GeneratedPage {
  page_number: number;
  text: string;
  illustration_prompt: string;
  mood: 'happy' | 'adventurous' | 'calm' | 'excited' | 'magical' | 'cozy' | 'triumphant';
}

export interface GeneratedStory {
  title: string;
  pages: GeneratedPage[];
}

export interface GenerateStoryResponse {
  bookId: string;
  story: GeneratedStory;
}
