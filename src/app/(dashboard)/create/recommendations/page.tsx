'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCreationWizard } from '@/stores/creation-wizard';
import WizardProgress from '@/components/wizard/WizardProgress';
import { getStoryById } from '@/lib/ai/prompts/en/story-catalog';
import type { CurationResult, StoryRecommendation, CategoryRecommendation } from '@/lib/ai/curation-en';

const FIT_LABELS: Record<string, string> = {
  perfect_match: 'perfect match',
  great_fit: 'great fit',
  good_fit: 'good fit',
  fits: 'fits',
};

export default function RecommendationsPage() {
  const router = useRouter();
  const fetchRef = useRef(false);
  const {
    childName, childAge, childGender, childTraits, childInterests,
    curationResult, curationCachedFor,
    setCurationResult, setStoryId, setStep,
  } = useCreationWizard();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guard: must have child details
  if (!childName || !childAge || !childGender) {
    router.replace('/create/details');
    return null;
  }

  const cacheKey = `${childAge}-${childGender}-${childTraits.sort().join(',')}-${childInterests.sort().join(',')}`;
  const cached = curationCachedFor === cacheKey && curationResult;

  // Fetch curation on mount (if not cached)
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
        console.error('[recommendations] Curation error:', e);
        setError('We couldn\'t load personalized recommendations right now.');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelectStory(storyId: string) {
    setStoryId(storyId);
    setStep('photos');
    router.push('/create/photos');
  }

  const result = (cached || curationResult) as CurationResult | null;

  return (
    <div>
      <WizardProgress currentStep="stories" />

      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '2.2rem', fontWeight: 500, color: 'var(--text-primary)' }}>
          Stories for {childName}
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
          We picked these based on {childName}&apos;s personality and interests. Click one to start creating!
        </p>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full mb-4" />
          <p style={{ color: 'var(--text-secondary)' }}>Finding the perfect stories for {childName}...</p>
        </div>
      )}

      {error && !result && (
        <div className="flex flex-col items-center justify-center py-16">
          <p style={{ color: 'rgba(255,150,150,0.95)', marginBottom: 16 }}>{error}</p>
          <button onClick={() => router.push('/create/all-stories')} className="btn-primary">
            Browse all stories &rarr;
          </button>
        </div>
      )}

      {result && (
        <>
          {/* Top picks */}
          {result.top_picks.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '1.3rem', marginBottom: 12 }}>
                &#10024; Top picks for {childName}
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {result.top_picks.slice(0, 4).map((rec) => (
                  <StoryCard key={rec.story_id} rec={rec} onSelect={handleSelectStory} />
                ))}
              </div>
            </div>
          )}

          {/* By category */}
          {result.by_category.map((cat) => (
            <div key={cat.category_id} style={{ marginBottom: 28 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: 8 }}>
                {cat.category_emoji} {cat.category_name}
                <span style={{ color: 'rgba(126,200,227,0.80)', fontSize: '0.78rem', fontWeight: 400, marginLeft: 8, fontFamily: 'var(--font-body)' }}>
                  {FIT_LABELS[cat.fit_label] || cat.fit_label}
                </span>
              </h2>
              <div className="grid sm:grid-cols-3 gap-3">
                {cat.stories.slice(0, 3).map((rec) => (
                  <StoryCard key={rec.story_id} rec={rec} onSelect={handleSelectStory} small />
                ))}
              </div>
            </div>
          ))}

          {/* See all link */}
          <div style={{ textAlign: 'center', marginTop: 24, paddingBottom: 32 }}>
            <button
              onClick={() => router.push('/create/all-stories')}
              style={{
                background: 'transparent', border: 'none',
                color: 'rgba(255,255,255,0.45)', fontSize: '0.88rem',
                textDecoration: 'underline', cursor: 'pointer',
              }}
            >
              See all 72 stories &rarr;
            </button>
          </div>
        </>
      )}

      {/* Back button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 32 }}>
        <button onClick={() => router.push('/create/details')} className="btn-secondary">
          &larr; Back
        </button>
      </div>
    </div>
  );
}

function StoryCard({ rec, onSelect, small }: { rec: StoryRecommendation; onSelect: (id: string) => void; small?: boolean }) {
  const story = getStoryById(rec.story_id);
  if (!story) return null;

  return (
    <button
      onClick={() => onSelect(rec.story_id)}
      className="text-left transition-all duration-300"
      style={{
        padding: small ? '16px' : '20px',
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: '1.25rem',
        cursor: 'pointer',
        boxShadow: 'inset 0 0 20px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.25)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.borderColor = 'rgba(245,200,66,0.45)';
        e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(255,255,255,0.04), 0 0 0 1px rgba(245,200,66,0.20), 0 12px 40px rgba(0,0,0,0.30)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
        e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.25)';
      }}
    >
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: small ? '0.95rem' : '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
        {story.title}
      </h3>
      <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.60)', lineHeight: 1.5, marginBottom: rec.reason ? 6 : 0 }}>
        {story.description}
      </p>
      {rec.reason && (
        <p style={{ fontSize: '0.75rem', color: 'rgba(126,200,227,0.70)', fontStyle: 'italic', lineHeight: 1.4 }}>
          {rec.reason}
        </p>
      )}
    </button>
  );
}
