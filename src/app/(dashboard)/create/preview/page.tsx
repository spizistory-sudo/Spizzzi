'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCreationWizard } from '@/stores/creation-wizard';
import WizardProgress from '@/components/wizard/WizardProgress';
import type { CoverOption } from '@/types/book';

const styleLabels: Record<string, { name: string; desc: string }> = {
  watercolor: { name: 'Watercolor Dream', desc: 'Soft, dreamy watercolors with gentle pastel tones' },
  cartoon: { name: 'Bold & Bright', desc: 'Fun, colorful cartoon with bold outlines' },
  storybook: { name: 'Classic Storybook', desc: 'Rich, warm classic storybook feel' },
};

export default function PreviewPage() {
  const router = useRouter();
  const storyGenRef = useRef(false); // Guard against double story generation (React strict mode)
  const coverGenRef = useRef(false); // Guard against double cover generation
  const {
    selectedThemeSlug,
    childName,
    childAge,
    childTraits,
    uploadedPhotos,
    generatedStory,
    bookId,
    isGenerating,
    language,
    customPrompt,
    coverOptions,
    selectedCoverId,
    isGeneratingCovers,
    setGeneratedStory,
    setIsGenerating,
    setCoverOptions,
    setSelectedCover,
    setIsGeneratingCovers,
    setIsGeneratingIllustrations,
    setIllustrationProgress,
    setCharacterDescription,
  } = useCreationWizard();

  const [error, setError] = useState<string | null>(null);

  // Redirect if missing required data
  useEffect(() => {
    if (!selectedThemeSlug || !childName || !childAge) {
      router.replace('/create/theme');
    }
  }, [selectedThemeSlug, childName, childAge, router]);

  // Auto-generate story on first visit — ref guard prevents double execution in React strict mode
  useEffect(() => {
    if (generatedStory || isGenerating) return;
    if (!selectedThemeSlug || !childName || !childAge) return;
    if (storyGenRef.current) return;
    storyGenRef.current = true;

    async function generate() {
      setIsGenerating(true);
      setError(null);

      try {
        const res = await fetch('/api/generate-story', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            themeSlug: selectedThemeSlug,
            childName,
            childAge,
            childTraits,
            language,
            customPrompt: customPrompt || undefined,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to generate story');
        }

        const data = await res.json();
        console.log('[preview] Story generated, bookId:', data.bookId);
        setGeneratedStory(data.story, data.bookId);

        // Trigger covers (only if photos exist)
        if (uploadedPhotos.length > 0) {
          triggerPhotoAnalysisAndCovers(data.bookId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
        setIsGenerating(false);
      }
    }

    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check for existing covers when bookId becomes available
  useEffect(() => {
    if (!bookId || coverOptions.length > 0 || isGeneratingCovers) return;

    async function checkExistingCovers() {
      try {
        const supabase = (await import('@/lib/supabase/client')).createClient();
        const { data: existingCovers } = await supabase
          .from('cover_options')
          .select('*')
          .eq('book_id', bookId);

        if (existingCovers && existingCovers.length > 0) {
          setCoverOptions(existingCovers as CoverOption[]);
          const selected = existingCovers.find((c: CoverOption) => c.is_selected);
          if (selected) setSelectedCover(selected.id);
          coverGenRef.current = true; // Mark as done so we don't re-generate
        }
      } catch { /* Not critical */ }
    }

    checkExistingCovers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  // Fix 2: Ref-guarded cover generation — prevents double execution
  const triggerPhotoAnalysisAndCovers = useCallback(async (targetBookId: string) => {
    if (coverGenRef.current) return;
    coverGenRef.current = true;

    // Check DB first
    try {
      const supabase = (await import('@/lib/supabase/client')).createClient();
      const { data: existingCovers } = await supabase
        .from('cover_options')
        .select('*')
        .eq('book_id', targetBookId);

      if (existingCovers && existingCovers.length > 0) {
        setCoverOptions(existingCovers as CoverOption[]);
        const selected = existingCovers.find((c: CoverOption) => c.is_selected);
        if (selected) setSelectedCover(selected.id);
        return;
      }
    } catch { /* continue to generate */ }

    setIsGeneratingCovers(true);

    try {
      const childPhoto = uploadedPhotos.find((p) => p.label === 'child');
      if (childPhoto) {
        const analyzeRes = await fetch('/api/analyze-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId: targetBookId, storagePath: childPhoto.storagePath }),
        });
        if (analyzeRes.ok) {
          const { description } = await analyzeRes.json();
          setCharacterDescription(description);
        }
      }

      const coverRes = await fetch('/api/generate-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: targetBookId }),
      });

      if (!coverRes.ok) throw new Error('Failed to generate covers');
      const { covers } = await coverRes.json();
      setCoverOptions(covers);
    } catch (err) {
      console.error('Cover generation error:', err);
      setIsGeneratingCovers(false);
      coverGenRef.current = false; // Allow retry on error
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedPhotos]);

  // After selecting cover, persist and redirect to finalize
  async function handleGenerateAndContinue() {
    if (!bookId || !selectedCoverId) return;
    console.log('[preview] Persisting cover selection, bookId:', bookId, 'coverId:', selectedCoverId);

    try {
      const supabase = (await import('@/lib/supabase/client')).createClient();
      await supabase.from('cover_options').update({ is_selected: false }).eq('book_id', bookId);
      await supabase.from('cover_options').update({ is_selected: true }).eq('id', selectedCoverId);
    } catch (err) {
      console.error('[preview] Failed to persist cover:', err);
    }

    // Don't start illustrations here — finalize page will handle it
    router.push('/create/finalize');
  }

  if (!selectedThemeSlug || !childName || !childAge) return null;

  if (isGenerating) {
    return (
      <div>
        <WizardProgress currentStep="preview" />
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full mb-6" />
          <h2 className="text-xl font-semibold text-gray-900">Creating a magical story for {childName}...</h2>
          <p className="text-gray-500 mt-2">This usually takes 10-20 seconds</p>
        </div>
      </div>
    );
  }

  if (error && !generatedStory) {
    return (
      <div>
        <WizardProgress currentStep="preview" />
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Oops! Something went wrong</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => { setError(null); setIsGenerating(false); }}
            className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!generatedStory) return null;

  return (
    <div>
      <WizardProgress currentStep="preview" />

      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '2.2rem', fontWeight: 500, color: 'var(--text-primary)' }} dir="auto">{generatedStory.title}</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
          A personalized story for {childName} &middot; {generatedStory.pages.length} pages
        </p>
      </div>

      {/* Cover generation loading — glass */}
      {isGeneratingCovers && (
        <div className="mb-8" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px) saturate(150%)', WebkitBackdropFilter: 'blur(12px) saturate(150%)', border: '1px solid rgba(255,255,255,0.10)', boxShadow: 'inset 0 0 20px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.25)', borderRadius: '1.5rem', padding: '28px 32px' }}>
          <div className="flex items-center gap-3">
            <div className="animate-spin w-6 h-6 rounded-full" style={{ border: '3px solid rgba(126,200,227,0.25)', borderTopColor: 'rgba(126,200,227,0.80)' }} />
            <div>
              <p style={{ color: 'rgba(255,255,255,0.90)', fontWeight: 500 }}>Generating cover art...</p>
              <p style={{ color: 'rgba(255,255,255,0.50)', fontSize: '0.85rem' }}>Creating 3 unique styles for you to choose from</p>
            </div>
          </div>
        </div>
      )}

      {/* Cover selection — glass cards */}
      {coverOptions.length > 0 && !isGeneratingCovers && (
        <div className="mb-8">
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '1.3rem', marginBottom: 8 }}>Choose your book&apos;s style</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 16 }}>This style will be used for all illustrations in the book.</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {coverOptions.map((cover: CoverOption) => {
              const style = styleLabels[cover.style_name] || { name: cover.style_name, desc: '' };
              const isSelected = selectedCoverId === cover.id;
              return (
                <button
                  key={cover.id}
                  onClick={() => setSelectedCover(cover.id)}
                  className="text-left transition-all duration-300"
                  style={{
                    background: 'transparent',
                    border: isSelected ? '2px solid #F5C842' : '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '1.5rem',
                    boxShadow: isSelected ? '0 0 0 1px #F5C842, 0 0 28px rgba(245,200,66,0.30), 0 8px 32px rgba(0,0,0,0.30)' : '0 8px 32px rgba(0,0,0,0.30)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'rgba(245,200,66,0.45)'; } }}
                  onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; } }}
                >
                  <div style={{ aspectRatio: '3/4', position: 'relative', overflow: 'hidden' }}>
                    <img src={cover.image_url} alt={style.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    {isSelected && (
                      <div style={{ position: 'absolute', top: 12, right: 12, width: 24, height: 24, background: '#F5C842', color: '#1A1000', fontSize: '0.72rem', fontWeight: 700, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&#10003;</div>
                    )}
                  </div>
                  <div style={{ background: 'rgba(10,17,40,0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', padding: '14px 18px' }}>
                    <p style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 500 }}>{style.name}</p>
                    <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem' }}>{style.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedCoverId && (
            <button onClick={handleGenerateAndContinue} className="btn-primary" style={{ marginTop: 16 }}>
              Next: Add Narration &amp; Music
            </button>
          )}
        </div>
      )}

      {/* Bottom actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 32, paddingBottom: 32 }}>
        <button onClick={() => router.push('/create/photos')} className="btn-secondary">Back</button>
      </div>

      {/* Generate covers button if no photos were uploaded */}
      {uploadedPhotos.length === 0 && coverOptions.length === 0 && !isGeneratingCovers && bookId && (
        <div className="glass mb-8" style={{ padding: '24px 32px' }}>
          <p style={{ color: 'rgba(245,200,66,0.90)', fontWeight: 500, marginBottom: 8 }}>Want custom illustrations?</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 16 }}>Generate cover art and page illustrations to bring the story to life.</p>
          <button onClick={() => triggerPhotoAnalysisAndCovers(bookId)} className="btn-primary" style={{ fontSize: '0.88rem', padding: '10px 24px' }}>
            Generate Cover Art
          </button>
        </div>
      )}
    </div>
  );
}
