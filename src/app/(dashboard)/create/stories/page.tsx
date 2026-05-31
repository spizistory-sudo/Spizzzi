'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCreationWizard } from '@/stores/creation-wizard';
import WizardProgress from '@/components/wizard/WizardProgress';
import { getStoriesByCategory, getStoryById } from '@/lib/ai/prompts/en/story-catalog';
import type { CurationResult, StoryRecommendation } from '@/lib/ai/curation-en';

export default function StoriesPage() {
  const router = useRouter();
  const fetchRef = useRef(false);
  const {
    childName, childAge, childGender, childTraits, childInterests,
    categoryId,
    curationResult, curationCachedFor, setCurationResult,
    setStoryId, setStep,
    setGeneratedStory, setIsGenerating,
    photoDescription,
  } = useCreationWizard();

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!childName || !childAge || !childGender) {
    router.replace('/create/details');
    return null;
  }

  if (!categoryId) {
    router.replace('/create/categories');
    return null;
  }

  const cacheKey = `${childAge}-${childGender}-${childTraits.sort().join(',')}-${childInterests.sort().join(',')}`;
  const cached = curationCachedFor === cacheKey && curationResult;

  useEffect(() => {
    if (cached || loading || fetchRef.current) return;
    fetchRef.current = true;
    setLoading(true);

    fetch('/api/curate-stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: childName,
        age: childAge,
        gender: childGender,
        traits: childTraits,
        interests: childInterests,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Curation failed');
        const data = await res.json();
        setCurationResult(data, cacheKey);
      })
      .catch((e) => {
        console.error('[stories] Curation error:', e);
        setError("We couldn't find stories right now. Please try again.");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const result = (cached || curationResult) as CurationResult | null;
  const allCategoryStories = getStoriesByCategory(categoryId);
  const categoryStoryIds = new Set(allCategoryStories.map((s) => s.id));

  let stories: { storyId: string; reason?: string }[] = [];
  if (result?.all_stories_ranked) {
    stories = result.all_stories_ranked
      .filter((r: StoryRecommendation) => categoryStoryIds.has(r.story_id))
      .slice(0, 6)
      .map((r: StoryRecommendation) => ({ storyId: r.story_id, reason: r.reason }));
  }
  if (stories.length === 0 && !loading) {
    stories = allCategoryStories.slice(0, 6).map((s) => ({ storyId: s.id }));
  }

  async function handlePickStory(storyId: string) {
    setError(null);
    setGenerating(storyId);
    setStoryId(storyId);

    try {
      const res = await fetch('/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: 'en',
          storyId,
          name: childName,
          age: childAge,
          gender: childGender || 'boy',
          traits: childTraits,
          interests: childInterests,
          photoDescription: photoDescription || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Story generation failed');
      }

      const data = await res.json();
      setGeneratedStory(data.story, data.bookId);
      setStep('finalize');
      router.push('/create/finalize');
    } catch (e) {
      console.error('[stories] Generation error:', e);
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setGenerating(null);
    }
  }

  return (
    <div>
      <WizardProgress currentStep="stories" />

      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '2.2rem', fontWeight: 500, color: 'var(--text-primary)' }}>
          Pick a story for {childName}
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
          We picked these based on {childName}&apos;s personality and interests.
        </p>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full mb-4" />
          <p style={{ color: 'var(--text-secondary)' }}>Picking the perfect stories for {childName}...</p>
        </div>
      )}

      {!loading && stories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <p style={{ color: 'rgba(255,255,255,0.70)', marginBottom: 16 }}>
            We couldn&apos;t find a perfect match. Try a different category.
          </p>
          <button onClick={() => router.push('/create/categories')} className="btn-primary">
            Back to categories
          </button>
        </div>
      )}

      {!loading && stories.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stories.map(({ storyId, reason }) => {
            const story = getStoryById(storyId);
            if (!story) return null;
            const isGenerating = generating === storyId;
            const isDisabled = generating !== null && !isGenerating;

            return (
              <button
                key={storyId}
                onClick={() => handlePickStory(storyId)}
                disabled={isDisabled || isGenerating}
                className="text-left transition-all duration-300"
                style={{
                  padding: '24px',
                  background: isGenerating ? 'rgba(155,125,212,0.12)' : 'rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(12px)',
                  border: isGenerating ? '2px solid rgba(155,125,212,0.70)' : '1px solid rgba(255,255,255,0.10)',
                  borderRadius: '1.25rem',
                  cursor: isDisabled ? 'not-allowed' : isGenerating ? 'wait' : 'pointer',
                  opacity: isDisabled ? 0.4 : 1,
                  boxShadow: isGenerating ? '0 0 20px rgba(155,125,212,0.15)' : 'inset 0 0 20px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.25)',
                }}
                onMouseEnter={(e) => { if (!isDisabled && !isGenerating) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'rgba(155,125,212,0.40)'; } }}
                onMouseLeave={(e) => { if (!isDisabled && !isGenerating) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; } }}
              >
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                  {story.title}
                </h3>
                <p style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, marginBottom: reason ? 8 : 0 }}>
                  {story.description}
                </p>
                {reason && (
                  <p style={{ fontSize: '0.75rem', color: 'rgba(126,200,227,0.70)', fontStyle: 'italic', lineHeight: 1.4 }}>
                    {reason}
                  </p>
                )}
                {isGenerating && (
                  <div className="flex items-center gap-2 mt-3">
                    <div className="animate-spin w-4 h-4 border-2 border-purple-300/30 border-t-purple-300 rounded-full" />
                    <span style={{ fontSize: '0.82rem', color: 'rgba(200,180,255,0.80)' }}>Creating your story...</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div style={{ marginTop: 16, padding: 12, background: 'rgba(220,50,50,0.15)', border: '1px solid rgba(220,50,50,0.30)', borderRadius: '1rem', color: 'rgba(255,150,150,0.95)', fontSize: '0.88rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 24, paddingBottom: 32 }}>
        <button onClick={() => router.push('/create/categories')} className="btn-secondary" disabled={generating !== null}>
          &larr; Back
        </button>
      </div>
    </div>
  );
}
