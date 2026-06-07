'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCreationWizard } from '@/stores/creation-wizard';
import { createClient } from '@/lib/supabase/client';
import WizardProgress from '@/components/wizard/WizardProgress';
import { getStoriesByCategory, getStoryById, type StoryTemplate } from '@/lib/ai/prompts/en/story-catalog';
import type { CurationResult, StoryRecommendation } from '@/lib/ai/curation-en';
import { autoSelectFinalize } from '@/lib/auto-finalize';
import Image from 'next/image';

export default function StoriesPage() {
  const router = useRouter();
  const fetchRef = useRef(false);
  const {
    childName, childAge, childGender, childTraits, childInterests,
    categoryId,
    curationResult, curationCachedFor, setCurationResult,
    setStoryId, setStep,
    setGeneratedStory, setIsGenerating,
    setSelectedVoice, setSelectedMusic,
    photoDescription,
    selectedStyleKey,
    uploadedPhotos,
  } = useCreationWizard();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [pickedStory, setPickedStory] = useState<StoryTemplate | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    const story = getStoryById(storyId);
    if (!story) return;
    setStoryId(storyId);
    setPickedStory(story);
    setShowFinishModal(true);
  }

  function handleChooseMyself() {
    setShowFinishModal(false);
    setStep('finalize');
    router.push('/create/finalize');
  }

  function handleAutoChoose() {
    if (!pickedStory) return;
    setShowFinishModal(false);
    const selection = autoSelectFinalize(pickedStory);
    setSelectedVoice(selection.voiceId);
    setSelectedMusic(selection.musicId);
    setStep('finalize');
    router.push('/create/finalize?autostart=1');
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-3">
          {stories.map(({ storyId, reason }) => {
            const story = getStoryById(storyId);
            if (!story) return null;
            const isExpanded = expandedId === storyId;

            return (
              <div
                key={storyId}
                className="overflow-hidden transition-all duration-300"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: '1.25rem',
                  boxShadow: 'inset 0 0 20px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.25)',
                }}
              >
                {/* Image + Title — tapping selects the story */}
                <button
                  onClick={() => handlePickStory(storyId)}
                  className="w-full text-left transition-all duration-200 active:opacity-80"
                  style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                  {/* Story image */}
                  <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16 / 9' }}>
                    <Image
                      src={`/images/stories/${storyId}.webp`}
                      alt={story.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-cover"
                      loading="lazy"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                    {/* Gradient fallback behind image */}
                    <div className="absolute inset-0 -z-10" style={{ background: 'linear-gradient(135deg, rgba(155,125,212,0.20), rgba(126,200,227,0.15))' }}>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-10 h-10 text-white/15" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  {/* Title */}
                  <div style={{ padding: '10px 14px 4px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {story.title}
                    </h3>
                  </div>
                </button>

                {/* Details toggle — separate tap target */}
                <div style={{ padding: '0 14px 8px' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : storyId); }}
                    className="flex items-center gap-1 min-h-[44px] transition-colors"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', color: 'rgba(255,255,255,0.40)', fontSize: '0.78rem' }}
                  >
                    <svg
                      className="w-3 h-3 transition-transform duration-200"
                      style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                      fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                    Details
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="mt-1 mb-1" style={{ animation: 'fadeUp 0.2s ease-out' }}>
                      <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.50)', lineHeight: 1.5, marginBottom: reason ? 8 : 0 }}>
                        {story.description}
                      </p>
                      {reason && (
                        <p style={{ fontSize: '0.75rem', color: 'rgba(126,200,227,0.65)', fontStyle: 'italic', lineHeight: 1.4 }}>
                          {reason}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div style={{ marginTop: 16, padding: 12, background: 'rgba(220,50,50,0.15)', border: '1px solid rgba(220,50,50,0.30)', borderRadius: '1rem', color: 'rgba(255,150,150,0.95)', fontSize: '0.88rem' }}>
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-6 pb-8">
        <button onClick={() => router.push('/create/categories')} className="btn-secondary min-h-[44px]">
          &larr; Back
        </button>
      </div>

      {/* Finish modal */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="max-w-md w-full mx-4 rounded-2xl border border-white/10 p-8 shadow-2xl" style={{ background: 'rgba(15,10,42,0.90)', backdropFilter: 'blur(24px)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              How should we finish {childName}&apos;s book?
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 28, fontSize: '0.92rem' }}>
              Pick the narrator and music yourself, or let us choose what fits the story best.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleChooseMyself}
                className="w-full px-6 py-4 rounded-xl text-left transition"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
              >
                <p style={{ color: '#fff', fontWeight: 600, marginBottom: 2 }}>I&apos;ll choose</p>
                <p style={{ color: 'rgba(255,255,255,0.50)', fontSize: '0.84rem' }}>Pick the narrator voice and background music</p>
              </button>
              <button
                onClick={handleAutoChoose}
                className="w-full px-6 py-4 rounded-xl text-left transition"
                style={{ background: 'linear-gradient(135deg, rgba(155,125,212,0.85), rgba(120,90,190,0.85))' }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                <p style={{ color: '#fff', fontWeight: 600, marginBottom: 2 }}>Choose the best for me &#10024;</p>
                <p style={{ color: 'rgba(255,255,255,0.70)', fontSize: '0.84rem' }}>We&apos;ll match the voice and music to the story and start right away</p>
              </button>
            </div>
            <button
              onClick={() => setShowFinishModal(false)}
              className="mt-4 w-full text-center text-sm"
              style={{ color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
