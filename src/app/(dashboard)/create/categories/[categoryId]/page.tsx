'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useCreationWizard } from '@/stores/creation-wizard';
import WizardProgress from '@/components/wizard/WizardProgress';
import {
  getCategoryById,
  getStoriesByCategory,
  getStoryById,
} from '@/lib/ai/prompts/en/story-catalog';
import type {
  CurationResult,
  StoryRecommendation,
} from '@/lib/ai/curation-en';

export default function CategoryStoriesPage() {
  const router = useRouter();
  const { categoryId } = useParams<{ categoryId: string }>();
  const fetchRef = useRef(false);
  const {
    childName,
    childAge,
    childGender,
    childTraits,
    childInterests,
    curationResult,
    curationCachedFor,
    setCurationResult,
    setStoryId,
    setStep,
  } = useCreationWizard();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guard: must have child details
  if (!childName || !childAge || !childGender) {
    router.replace('/create/details');
    return null;
  }

  const category = getCategoryById(categoryId);
  if (!category) {
    router.replace('/create/categories');
    return null;
  }

  const cacheKey = `${childAge}-${childGender}-${childTraits.sort().join(',')}-${childInterests.sort().join(',')}`;
  const cached = curationCachedFor === cacheKey && curationResult;

  // Fetch curation if not cached
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
        console.error('[category-stories] Curation error:', e);
        setError(
          "We couldn't load personalized recommendations right now."
        );
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelectStory(storyId: string) {
    setStoryId(storyId);
    setStep('photos');
    router.push('/create/photos');
  }

  // Get stories for this category, ranked by curation if available
  const result = (cached || curationResult) as CurationResult | null;
  const allCategoryStories = getStoriesByCategory(categoryId);

  let rankedStories: { storyId: string; reason?: string }[];
  if (result?.all_stories_ranked) {
    // Filter curation results to this category, keep curation order
    const categoryStoryIds = new Set(allCategoryStories.map((s) => s.id));
    rankedStories = result.all_stories_ranked
      .filter((r: StoryRecommendation) => categoryStoryIds.has(r.story_id))
      .map((r: StoryRecommendation) => ({
        storyId: r.story_id,
        reason: r.reason,
      }));
  } else {
    // No curation — show in catalog order
    rankedStories = allCategoryStories.map((s) => ({ storyId: s.id }));
  }

  return (
    <div>
      <WizardProgress currentStep="stories" />

      <div className="mb-8">
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: '2.2rem',
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}
        >
          {category.emoji} {category.name} for {childName}
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
          {category.description}
        </p>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full mb-4" />
          <p style={{ color: 'var(--text-secondary)' }}>
            Finding the best stories for {childName}...
          </p>
        </div>
      )}

      {error && !result && (
        <div
          style={{
            padding: 16,
            marginBottom: 16,
            background: 'rgba(255,100,100,0.10)',
            borderRadius: '1rem',
            color: 'rgba(255,180,180,0.90)',
            fontSize: '0.88rem',
          }}
        >
          {error} Showing stories in catalog order.
        </div>
      )}

      {!loading && (
        <div className="flex flex-col gap-3">
          {rankedStories.map(({ storyId, reason }) => {
            const story = getStoryById(storyId);
            if (!story) return null;

            return (
              <button
                key={storyId}
                onClick={() => handleSelectStory(storyId)}
                className="text-left transition-all duration-300"
                style={{
                  padding: '20px 24px',
                  background: 'rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: '1.25rem',
                  cursor: 'pointer',
                  boxShadow:
                    'inset 0 0 20px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.25)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.borderColor =
                    'rgba(245,200,66,0.45)';
                  e.currentTarget.style.boxShadow =
                    'inset 0 0 20px rgba(255,255,255,0.04), 0 0 0 1px rgba(245,200,66,0.20), 0 12px 40px rgba(0,0,0,0.30)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor =
                    'rgba(255,255,255,0.10)';
                  e.currentTarget.style.boxShadow =
                    'inset 0 0 20px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.25)';
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 16,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.05rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        marginBottom: 4,
                      }}
                    >
                      {story.title}
                    </h3>
                    <p
                      style={{
                        fontSize: '0.84rem',
                        color: 'rgba(255,255,255,0.60)',
                        lineHeight: 1.5,
                        marginBottom: reason ? 6 : 0,
                      }}
                    >
                      {story.description}
                    </p>
                    {reason && (
                      <p
                        style={{
                          fontSize: '0.75rem',
                          color: 'rgba(126,200,227,0.70)',
                          fontStyle: 'italic',
                          lineHeight: 1.4,
                        }}
                      >
                        {reason}
                      </p>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: '0.70rem',
                      color: 'rgba(255,255,255,0.35)',
                      whiteSpace: 'nowrap',
                      marginTop: 4,
                    }}
                  >
                    Ages {story.age_min}-{story.age_max}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Back button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          paddingTop: 24,
          paddingBottom: 32,
        }}
      >
        <button
          onClick={() => router.push('/create/categories')}
          className="btn-secondary"
        >
          &larr; Back to categories
        </button>
      </div>
    </div>
  );
}
