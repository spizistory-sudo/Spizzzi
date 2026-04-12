'use client';

import { useRouter } from 'next/navigation';
import { useCreationWizard } from '@/stores/creation-wizard';
import { THEME_LIST } from '@/lib/ai/prompts/story-themes';
import WizardProgress from '@/components/wizard/WizardProgress';

export default function ThemePickerPage() {
  const router = useRouter();
  const { selectedThemeSlug, setTheme } = useCreationWizard();

  function handleSelectTheme(slug: string) {
    setTheme(slug);
    router.push('/create/details');
  }

  return (
    <div>
      <WizardProgress currentStep="theme" />

      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '2.2rem', fontWeight: 500, color: 'var(--text-primary)' }}>Choose a story theme</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
          Pick the perfect adventure for your child. Each theme creates a unique personalized story.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {THEME_LIST.map((theme) => {
          const isSelected = selectedThemeSlug === theme.slug;
          return (
            <button
              key={theme.slug}
              onClick={() => handleSelectTheme(theme.slug)}
              className="text-left transition-all duration-300"
              style={{
                padding: '24px',
                background: 'rgba(255, 255, 255, 0.06)',
                backdropFilter: 'blur(12px) saturate(150%)',
                WebkitBackdropFilter: 'blur(12px) saturate(150%)',
                border: isSelected ? '2px solid #F5C842' : '1px solid rgba(255, 255, 255, 0.10)',
                boxShadow: isSelected
                  ? 'inset 0 0 20px rgba(255,255,255,0.04), 0 0 0 1px #F5C842, 0 0 28px rgba(245,200,66,0.30)'
                  : 'inset 0 0 20px rgba(255, 255, 255, 0.04), 0 8px 32px rgba(0, 0, 0, 0.25)',
                borderRadius: '1.5rem',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = 'rgba(245, 200, 66, 0.45)';
                  e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(255,255,255,0.04), 0 12px 40px rgba(0,0,0,0.30), 0 0 0 1px rgba(245,200,66,0.20)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.10)';
                  e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(255, 255, 255, 0.04), 0 8px 32px rgba(0, 0, 0, 0.25)';
                }
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{theme.emoji}</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{theme.name}</h3>
              <p style={{ fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.80)', lineHeight: 1.5 }}>
                {theme.description}
              </p>
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: 'rgba(255, 255, 255, 0.70)',
                  borderRadius: '9999px',
                  padding: '3px 10px',
                  fontSize: '0.72rem',
                }}>
                  {theme.category}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.45)' }}>
                  Ages {theme.ageRange[0]}-{theme.ageRange[1]}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
