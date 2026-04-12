import { create } from 'zustand';
import type { GeneratedStory } from '@/types/ai';
import type { CoverOption } from '@/types/book';

export type WizardStep = 'theme' | 'details' | 'photos' | 'preview' | 'finalize';

interface UploadedPhoto {
  id: string;
  storagePath: string;
  label: 'child' | 'parent' | 'sibling' | 'pet';
  previewUrl: string;
}

interface WizardState {
  // Current step
  currentStep: WizardStep;

  // Step 1: Theme (or custom)
  selectedThemeSlug: string | null;
  customPrompt: string | null;

  // Step 2: Child details
  childName: string;
  childAge: number | null;
  childTraits: string[];

  // Step 3: Photos
  uploadedPhotos: UploadedPhoto[];
  characterDescription: string | null;

  // Step 4: Generated story + covers
  generatedStory: GeneratedStory | null;
  bookId: string | null;
  isGenerating: boolean;
  coverOptions: CoverOption[];
  selectedCoverId: string | null;
  isGeneratingCovers: boolean;
  isGeneratingIllustrations: boolean;
  illustrationProgress: { complete: number; total: number };

  // Step 5: Finalize (narration + music)
  selectedVoiceId: string | null;
  selectedMusicId: string | null;
  isGeneratingNarration: boolean;

  // Language
  language: 'en' | 'he';

  // Actions
  setStep: (step: WizardStep) => void;
  setTheme: (slug: string) => void;
  setChildDetails: (name: string, age: number, traits: string[]) => void;
  addPhoto: (photo: UploadedPhoto) => void;
  removePhoto: (id: string) => void;
  setCharacterDescription: (desc: string) => void;
  setGeneratedStory: (story: GeneratedStory, bookId: string) => void;
  setIsGenerating: (generating: boolean) => void;
  setCoverOptions: (covers: CoverOption[]) => void;
  setSelectedCover: (coverId: string) => void;
  setIsGeneratingCovers: (generating: boolean) => void;
  setIsGeneratingIllustrations: (generating: boolean) => void;
  setIllustrationProgress: (progress: { complete: number; total: number }) => void;
  setSelectedVoice: (voiceId: string) => void;
  setSelectedMusic: (musicId: string) => void;
  setIsGeneratingNarration: (generating: boolean) => void;
  setLanguage: (lang: 'en' | 'he') => void;
  setCustomPrompt: (prompt: string) => void;
  reset: () => void;
}

const initialState = {
  currentStep: 'theme' as WizardStep,
  selectedThemeSlug: null,
  childName: '',
  childAge: null,
  childTraits: [],
  uploadedPhotos: [] as UploadedPhoto[],
  characterDescription: null as string | null,
  generatedStory: null,
  bookId: null,
  isGenerating: false,
  coverOptions: [] as CoverOption[],
  selectedCoverId: null as string | null,
  isGeneratingCovers: false,
  isGeneratingIllustrations: false,
  illustrationProgress: { complete: 0, total: 0 },
  selectedVoiceId: null as string | null,
  selectedMusicId: null as string | null,
  isGeneratingNarration: false,
  customPrompt: null as string | null,
  language: 'en' as const,
};

export const useCreationWizard = create<WizardState>((set) => ({
  ...initialState,

  setStep: (step) => set({ currentStep: step }),

  setTheme: (slug) => set({ selectedThemeSlug: slug, currentStep: 'details' }),

  setChildDetails: (name, age, traits) =>
    set({ childName: name, childAge: age, childTraits: traits }),

  addPhoto: (photo) =>
    set((state) => ({ uploadedPhotos: [...state.uploadedPhotos, photo] })),

  removePhoto: (id) =>
    set((state) => ({
      uploadedPhotos: state.uploadedPhotos.filter((p) => p.id !== id),
    })),

  setCharacterDescription: (desc) => set({ characterDescription: desc }),

  setGeneratedStory: (story, bookId) =>
    set({ generatedStory: story, bookId, isGenerating: false }),

  setIsGenerating: (generating) => set({ isGenerating: generating }),

  setCoverOptions: (covers) =>
    set({ coverOptions: covers, isGeneratingCovers: false }),

  setSelectedCover: (coverId) => set({ selectedCoverId: coverId }),

  setIsGeneratingCovers: (generating) => set({ isGeneratingCovers: generating }),

  setIsGeneratingIllustrations: (generating) =>
    set({ isGeneratingIllustrations: generating }),

  setIllustrationProgress: (progress) =>
    set({ illustrationProgress: progress }),

  setSelectedVoice: (voiceId) => set({ selectedVoiceId: voiceId }),

  setSelectedMusic: (musicId) => set({ selectedMusicId: musicId }),

  setIsGeneratingNarration: (generating) => set({ isGeneratingNarration: generating }),

  setLanguage: (lang) => set({ language: lang }),

  setCustomPrompt: (prompt) => set({ customPrompt: prompt }),

  reset: () => set(initialState),
}));
