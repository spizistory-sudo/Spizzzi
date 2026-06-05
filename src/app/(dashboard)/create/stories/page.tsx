'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCreationWizard } from '@/stores/creation-wizard';
import { createClient } from '@/lib/supabase/client';
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
    selectedStyleKey,
    uploadedPhotos,
  } = useCreationWizard();

  const [loading, setLoading] = useState(false);
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

  function handlePickStory(storyId: string) {
    setStoryId(storyId);
    setStep('finalize');
    router.push('/create/finalize');
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

            return (
              <button
                key={storyId}
                onClick={() => handlePickStory(storyId)}
                className="text-left transition-all duration-300"
                style={{
                  padding: '24px',
                  background: 'rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: '1.25rem',
                  cursor: 'pointer',
                  boxShadow: 'inset 0 0 20px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.25)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'rgba(155,125,212,0.40)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; }}
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
        <button onClick={() => router.push('/create/categories')} className="btn-secondary">
          &larr; Back
        </button>
      </div>
    </div>
  );
}
