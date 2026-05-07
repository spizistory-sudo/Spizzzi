import { create } from 'zustand';
import type { GeneratedStory } from '@/types/ai';
import type { CoverOption } from '@/types/book';

export type WizardStep = 'theme' | 'details' | 'stories' | 'photos' | 'preview' | 'finalize';

interface UploadedPhoto {
  id: string;
  storagePath: string;
  label: 'child' | 'parent' | 'sibling' | 'pet';
  previewUrl: string;
}

interface WizardState {
  // Current step
  currentStep: WizardStep;

  // Step 1: Theme (or custom) / Category+Topic (structured Hebrew)
  selectedThemeSlug: string | null;
  customPrompt: string | null;
  categoryId: string | null;
  topicId: string | null;
  storyMode: 'structured' | 'custom';

  // Step 1 (new flow): Child details
  childName: string;
  childAge: number | null;
  childGender: 'boy' | 'girl' | 'nonbinary' | null;
  childTraits: string[];       // trait IDs (e.g. 'sensitive', 'creative')
  childInterests: string[];    // interest IDs (e.g. 'horses', 'art_and_creativity')
  traitDetails: Record<string, string>;

  // Step 2 (new flow): Story selection
  storyId: string | null;      // selected story template ID from catalog
  curationResult: unknown;     // cached CurationResult from /api/curate-stories
  curationCachedFor: string | null; // hash key to invalidate cache if profile changes

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
  setTraitDetails: (details: Record<string, string>) => void;
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
  setChildGender: (g: 'boy' | 'girl' | 'nonbinary' | null) => void;
  setChildInterests: (i: string[]) => void;
  setStoryId: (id: string | null) => void;
  setCurationResult: (r: unknown, cacheKey: string) => void;
  setCustomPrompt: (prompt: string) => void;
  setCategoryId: (id: string | null) => void;
  setTopicId: (id: string | null) => void;
  setStoryMode: (mode: 'structured' | 'custom') => void;
  reset: () => void;
}

const initialState = {
  currentStep: 'theme' as WizardStep,
  selectedThemeSlug: null,
  categoryId: null as string | null,
  topicId: null as string | null,
  storyMode: 'structured' as const,
  childName: '',
  childAge: null,
  childGender: null as 'boy' | 'girl' | 'nonbinary' | null,
  childTraits: [],
  childInterests: [] as string[],
  traitDetails: {} as Record<string, string>,
  storyId: null as string | null,
  curationResult: null as unknown,
  curationCachedFor: null as string | null,
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

  setTraitDetails: (details) => set({ traitDetails: details }),

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

  setChildGender: (g) => set({ childGender: g }),
  setChildInterests: (i) => set({ childInterests: i }),
  setStoryId: (id) => set({ storyId: id }),
  setCurationResult: (r, cacheKey) => set({ curationResult: r, curationCachedFor: cacheKey }),

  setCustomPrompt: (prompt) => set({ customPrompt: prompt }),

  setCategoryId: (id) => set({ categoryId: id }),
  setTopicId: (id) => set({ topicId: id }),
  setStoryMode: (mode) => set({ storyMode: mode }),

  reset: () => set(initialState),
}));
