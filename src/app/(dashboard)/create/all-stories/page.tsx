'use client';

import { useRouter } from 'next/navigation';
import { useCreationWizard } from '@/stores/creation-wizard';
import WizardProgress from '@/components/wizard/WizardProgress';
import { STORIES, CATEGORIES } from '@/lib/ai/prompts/en/story-catalog';

export default function AllStoriesPage() {
  const router = useRouter();
  const { childName, childAge, childGender, setStoryId, setStep } = useCreationWizard();

  if (!childName || !childAge || !childGender) {
    router.replace('/create/details');
    return null;
  }

  function handleSelect(storyId: string) {
    setStoryId(storyId);
    setStep('photos');
    router.push('/create/photos');
  }

  return (
    <div>
      <WizardProgress currentStep="stories" />

      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '2.2rem', fontWeight: 500, color: 'var(--text-primary)' }}>
          All Stories
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
          Browse our full catalog of 72 stories. Click one to start creating a book for {childName}!
        </p>
      </div>

      {CATEGORIES.filter(c => c.status === 'active').map((cat) => {
        const catStories = STORIES.filter(s => s.category_id === cat.id);
        return (
          <div key={cat.id} style={{ marginBottom: 28 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: 10 }}>
              {cat.emoji} {cat.name}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {catStories.map((story) => (
                <button
                  key={story.id}
                  onClick={() => handleSelect(story.id)}
                  className="text-left transition-all duration-200"
                  style={{
                    padding: '16px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: '1rem',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(245,200,66,0.40)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {story.title}
                  </h3>
                  <p style={{ fontSize: '0.80rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
                    {story.description}
                  </p>
                  <span style={{ fontSize: '0.70rem', color: 'rgba(255,255,255,0.35)', marginTop: 6, display: 'inline-block' }}>
                    Ages {story.age_min}-{story.age_max}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <div style={{ paddingBottom: 32 }}>
        <button onClick={() => router.push('/create/recommendations')} className="btn-secondary">
          &larr; Back to recommendations
        </button>
      </div>
    </div>
  );
}
