'use client';

import { useRouter } from 'next/navigation';
import { useCreationWizard } from '@/stores/creation-wizard';
import { getActiveCategories, COMING_SOON_CATEGORIES } from '@/lib/ai/prompts/categories';
import WizardProgress from './WizardProgress';

export function CategorySelector() {
  const router = useRouter();
  const setCategoryId = useCreationWizard((s) => s.setCategoryId);
  const setStoryMode = useCreationWizard((s) => s.setStoryMode);

  const handleSelect = (categoryId: string) => {
    setCategoryId(categoryId);
    router.push('/create/topic');
  };

  const active = getActiveCategories();
  const comingSoon = COMING_SOON_CATEGORIES;

  return (
    <div>
      <WizardProgress currentStep="theme" />

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
          על מה הסיפור?
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>בחרו את סוג הסיפור שתרצו ליצור</p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        maxWidth: 800,
        margin: '0 auto',
      }}>
        {active.map((cat) => (
          <CategoryCard
            key={cat.id}
            label={cat.label_he}
            emoji={cat.emoji}
            description={cat.short_description}
            onClick={() => handleSelect(cat.id)}
            disabled={false}
          />
        ))}
        {comingSoon.map((cat) => (
          <CategoryCard
            key={cat.id}
            label={cat.label_he}
            emoji={cat.emoji}
            description={cat.short_description}
            onClick={() => {}}
            disabled={true}
          />
        ))}
      </div>

      {/* Legacy custom flow link */}
      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <button
          onClick={() => {
            setStoryMode('custom');
            router.push('/create/theme');
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.45)',
            fontSize: '0.85rem',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          מעדיפים סיפור מותאם אישית? לחצו כאן
        </button>
      </div>
    </div>
  );
}

function CategoryCard({
  label,
  emoji,
  description,
  onClick,
  disabled,
}: {
  label: string;
  emoji: string;
  description: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        position: 'relative',
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px) saturate(150%)',
        WebkitBackdropFilter: 'blur(12px) saturate(150%)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 20,
        padding: 24,
        textAlign: 'start',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        color: 'rgba(255,255,255,0.95)',
        boxShadow: 'inset 0 0 20px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.25)',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.borderColor = 'rgba(245, 200, 66, 0.45)';
          e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(255,255,255,0.04), 0 0 0 1px rgba(245,200,66,0.20), 0 12px 40px rgba(0,0,0,0.30)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
        e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.25)';
      }}
    >
      {disabled && (
        <span style={{
          position: 'absolute', top: 12, left: 12,
          fontSize: '0.7rem', padding: '2px 10px', borderRadius: 9999,
          background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)',
        }}>
          בקרוב
        </span>
      )}
      <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{emoji}</div>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 6, fontFamily: 'var(--font-display)' }}>{label}</h3>
      <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
        {description}
      </p>
    </button>
  );
}
