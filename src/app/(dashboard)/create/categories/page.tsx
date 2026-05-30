'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreationWizard } from '@/stores/creation-wizard';
import WizardProgress from '@/components/wizard/WizardProgress';
import { CATEGORIES } from '@/lib/ai/prompts/en/story-catalog';
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
  const { childName, childAge, childGender, categoryId, setCategoryId, setStep } = useCreationWizard();
  const [selected, setSelected] = useState<string | null>(categoryId);

  if (!childName || !childAge || !childGender) {
    router.replace('/create/details');
    return null;
  }

  const activeCategories = CATEGORIES.filter((c) => c.status === 'active');

  function handleSelect(id: string) {
    setSelected(id);
    setCategoryId(id);
  }

  function handleContinue() {
    if (!selected) return;
    setStep('stories');
    router.push('/create/stories');
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
              className="text-left transition-all duration-300"
              style={{
                borderRadius: '1rem',
                border: isSelected ? '2px solid rgba(155,125,212,0.70)' : '1px solid rgba(255,255,255,0.10)',
                background: isSelected ? 'rgba(155,125,212,0.10)' : 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(12px)',
                boxShadow: isSelected ? '0 0 0 1px rgba(155,125,212,0.40), 0 0 20px rgba(155,125,212,0.15)' : 'none',
                padding: '24px',
                cursor: 'pointer',
                minHeight: 140,
              }}
              onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.borderColor = 'rgba(155,125,212,0.40)'; } }}
              onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = isSelected ? 'rgba(155,125,212,0.70)' : 'rgba(255,255,255,0.10)'; } }}
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

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 24, paddingBottom: 32 }}>
        <button onClick={() => router.push('/create/style')} className="btn-secondary">
          &larr; Back
        </button>
        <button onClick={handleContinue} className="btn-primary" disabled={!selected}
          style={{ opacity: selected ? 1 : 0.5, cursor: selected ? 'pointer' : 'not-allowed' }}
        >
          Continue &rarr;
        </button>
      </div>
    </div>
  );
}
