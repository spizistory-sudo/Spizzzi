'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreationWizard } from '@/stores/creation-wizard';
import WizardProgress from '@/components/wizard/WizardProgress';
import { CATEGORIES, getStoriesByCategory } from '@/lib/ai/prompts/en/story-catalog';
import type { CurationResult, StoryRecommendation } from '@/lib/ai/curation-en';
import { Compass, PawPrint, Heart, Rocket, Users, Globe, Moon } from 'lucide-react';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  big_adventures: <Compass size={32} />,
  animal_friends: <PawPrint size={32} />,
  all_my_feelings: <Heart size={32} />,
  i_can_do_it: <Rocket size={32} />,
  family_and_friends: <Users size={32} />,
  wonders_of_the_world: <Globe size={32} />,
  cozy_and_calm: <Moon size={32} />,
};

export default function CategoriesPage() {
  const router = useRouter();
  const {
    childName, childAge, childGender, childTraits, childInterests,
    categoryId, setCategoryId, setStoryId, setStep,
    curationResult, curationCachedFor, setCurationResult,
  } = useCreationWizard();

  const [selected, setSelected] = useState<string | null>(categoryId);
  const [curating, setCurating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!childName || !childAge || !childGender) {
    router.replace('/create/details');
    return null;
  }

  const activeCategories = CATEGORIES.filter((c) => c.status === 'active');

  function handleSelect(id: string) {
    if (curating) return;
    setSelected(id);
    setCategoryId(id);
  }

  function pickTopStoryForCategory(result: CurationResult, catId: string): string | null {
    const categoryStoryIds = new Set(getStoriesByCategory(catId).map((s) => s.id));
    const match = result.all_stories_ranked?.find(
      (r: StoryRecommendation) => categoryStoryIds.has(r.story_id)
    );
    return match?.story_id || null;
  }

  async function handleContinue() {
    if (!selected) return;
    setError(null);
    setCurating(true);

    try {
      const cacheKey = `${childAge}-${childGender}-${childTraits.sort().join(',')}-${childInterests.sort().join(',')}`;
      let result = (curationCachedFor === cacheKey && curationResult) as CurationResult | null;

      if (!result) {
        const res = await fetch('/api/curate-stories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: childName,
            age: childAge,
            gender: childGender,
            traits: childTraits,
            interests: childInterests,
          }),
        });

        if (!res.ok) throw new Error('Curation failed');
        result = await res.json() as CurationResult;
        setCurationResult(result, cacheKey);
      }

      let storyId = pickTopStoryForCategory(result, selected);

      if (!storyId) {
        const fallbackStories = getStoriesByCategory(selected);
        if (fallbackStories.length > 0) {
          storyId = fallbackStories[0].id;
        }
      }

      if (!storyId) {
        setError("Couldn't find a story for this category. Please try another.");
        setCurating(false);
        return;
      }

      setStoryId(storyId);
      setCategoryId(selected);
      setStep('finalize');
      router.push('/create/finalize');
    } catch (e) {
      console.error('[categories] Curation error:', e);
      setError("Couldn't pick a story right now. Please try again.");
      setCurating(false);
    }
  }

  return (
    <div>
      <WizardProgress currentStep="category" />

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
          Choose a category for {childName}
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
          Pick a world to explore. We&apos;ll find the perfect story inside.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeCategories.map((cat) => {
          const isSelected = selected === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleSelect(cat.id)}
              disabled={curating}
              className="text-left transition-all duration-300"
              style={{
                borderRadius: '1rem',
                border: isSelected ? '2px solid rgba(155,125,212,0.70)' : '1px solid rgba(255,255,255,0.10)',
                background: isSelected ? 'rgba(155,125,212,0.10)' : 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(12px)',
                boxShadow: isSelected ? '0 0 0 1px rgba(155,125,212,0.40), 0 0 20px rgba(155,125,212,0.15)' : 'none',
                padding: '24px',
                cursor: curating ? 'wait' : 'pointer',
                minHeight: 140,
                opacity: curating && !isSelected ? 0.5 : 1,
              }}
              onMouseEnter={(e) => { if (!isSelected && !curating) { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.borderColor = 'rgba(155,125,212,0.40)'; } }}
              onMouseLeave={(e) => { if (!isSelected && !curating) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; } }}
            >
              <div style={{ color: isSelected ? 'rgba(200,180,255,0.90)' : 'rgba(255,255,255,0.30)', marginBottom: 12 }}>
                {CATEGORY_ICONS[cat.id] || <Compass size={32} />}
              </div>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.15rem',
                fontWeight: 600,
                color: isSelected ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.85)',
                marginBottom: 4,
              }}>
                {cat.emoji} {cat.name}
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.50)', lineHeight: 1.4 }}>
                {cat.description}
              </p>
            </button>
          );
        })}
      </div>

      {error && (
        <div style={{ marginTop: 16, padding: 12, background: 'rgba(220,50,50,0.15)', border: '1px solid rgba(220,50,50,0.30)', borderRadius: '1rem', color: 'rgba(255,150,150,0.95)', fontSize: '0.88rem' }}>
          {error}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 24, paddingBottom: 32 }}>
        <button onClick={() => router.push('/create/style')} className="btn-secondary" disabled={curating}>
          &larr; Back
        </button>
        <button onClick={handleContinue} className="btn-primary" disabled={!selected || curating}
          style={{ opacity: selected && !curating ? 1 : 0.5, cursor: selected && !curating ? 'pointer' : 'not-allowed' }}
        >
          {curating ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              Picking your story...
            </span>
          ) : (
            <>Continue &rarr;</>
          )}
        </button>
      </div>
    </div>
  );
}
