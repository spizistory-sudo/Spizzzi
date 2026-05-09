'use client';

import { useRouter } from 'next/navigation';
import { useCreationWizard } from '@/stores/creation-wizard';
import WizardProgress from '@/components/wizard/WizardProgress';
import { CATEGORIES } from '@/lib/ai/prompts/en/story-catalog';
import Image from 'next/image';

const CATEGORY_IMAGES: Record<string, string> = {
  big_adventures: '/images/categories/big-adventures.jpg',
  animal_friends: '/images/categories/animal-friends.jpg',
  all_my_feelings: '/images/categories/all-my-feelings.jpg',
  i_can_do_it: '/images/categories/i-can-do-it.jpg',
  family_and_friends: '/images/categories/family-and-friends.jpg',
  wonders_of_the_world: '/images/categories/wonders-of-the-world.jpg',
  cozy_and_calm: '/images/categories/cozy-and-calm.jpg',
};

export default function CategoriesPage() {
  const router = useRouter();
  const { childName, childAge, childGender } = useCreationWizard();

  if (!childName || !childAge || !childGender) {
    router.replace('/create/details');
    return null;
  }

  const activeCategories = CATEGORIES.filter((c) => c.status === 'active');

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
          Choose a category for {childName}
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
          Pick a world to explore. We&apos;ll find the perfect story inside.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => router.push(`/create/categories/${cat.id}`)}
            className="group relative overflow-hidden text-left transition-all duration-300"
            style={{
              borderRadius: '1.25rem',
              border: '1px solid rgba(255,255,255,0.10)',
              background: 'rgba(255,255,255,0.04)',
              cursor: 'pointer',
              aspectRatio: '3 / 2',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px) scale(1.01)';
              e.currentTarget.style.borderColor = 'rgba(245,200,66,0.45)';
              e.currentTarget.style.boxShadow =
                '0 0 0 1px rgba(245,200,66,0.20), 0 16px 48px rgba(0,0,0,0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {CATEGORY_IMAGES[cat.id] && (
              <Image
                src={CATEGORY_IMAGES[cat.id]}
                alt={cat.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            )}

            {/* Gradient overlay for text readability */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to top, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.25) 40%, transparent 70%)',
              }}
            />

            {/* Category name + description */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.35rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  marginBottom: 4,
                  textShadow: '0 2px 8px rgba(0,0,0,0.50)',
                }}
              >
                {cat.emoji} {cat.name}
              </h2>
              <p
                style={{
                  fontSize: '0.82rem',
                  color: 'rgba(255,255,255,0.80)',
                  lineHeight: 1.4,
                  textShadow: '0 1px 4px rgba(0,0,0,0.40)',
                }}
              >
                {cat.description}
              </p>
            </div>
          </button>
        ))}
      </div>

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
          onClick={() => router.push('/create/details')}
          className="btn-secondary"
        >
          &larr; Back
        </button>
      </div>
    </div>
  );
}
