'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreationWizard } from '@/stores/creation-wizard';
import WizardProgress from '@/components/wizard/WizardProgress';

const TRAIT_OPTIONS = [
  'Brave', 'Curious', 'Kind', 'Funny', 'Creative',
  'Adventurous', 'Shy', 'Energetic', 'Gentle', 'Smart',
  'Musical', 'Loves animals', 'Loves dinosaurs', 'Loves space',
  'Loves cooking', 'Athletic', 'Bookworm', 'Leader',
];

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 8,
  color: 'rgba(255, 255, 255, 0.55)',
  fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase',
  fontFamily: 'var(--font-body)', fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255, 255, 255, 0.07)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '1rem',
  padding: '14px 18px',
  color: 'rgba(255, 255, 255, 0.95)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.95rem',
  outline: 'none',
  transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
};

export default function DetailsPage() {
  const router = useRouter();
  const {
    selectedThemeSlug, childName, childAge, childTraits,
    setChildDetails, setStep, language, setLanguage,
  } = useCreationWizard();

  const [name, setName] = useState(childName);
  const [age, setAge] = useState(childAge?.toString() || '');
  const [traits, setTraits] = useState<string[]>(childTraits);
  const [error, setError] = useState<string | null>(null);

  if (!selectedThemeSlug) { router.replace('/create/theme'); return null; }

  function toggleTrait(trait: string) {
    setTraits((prev) => prev.includes(trait) ? prev.filter((t) => t !== trait) : prev.length < 5 ? [...prev, trait] : prev);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("Please enter your child's name"); return; }
    const ageNum = parseInt(age);
    if (!ageNum || ageNum < 1 || ageNum > 12) { setError('Please enter a valid age (1-12)'); return; }
    if (traits.length === 0) { setError('Please select at least one trait'); return; }
    setChildDetails(name.trim(), ageNum, traits);
    setStep('photos');
    router.push('/create/photos');
  }

  return (
    <div>
      <WizardProgress currentStep="details" />

      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '2.2rem', fontWeight: 500, color: 'var(--text-primary)' }}>Tell us about your child</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>These details will make the story truly personal and magical.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Language */}
        <div>
          <label style={labelStyle}>Story language</label>
          <div style={{ display: 'flex', gap: 12 }}>
            {(['en', 'he'] as const).map((lang) => (
              <button key={lang} type="button" onClick={() => setLanguage(lang)}
                style={{
                  background: language === lang ? 'linear-gradient(135deg, rgba(155,125,212,0.70), rgba(126,200,227,0.60))' : 'rgba(255,255,255,0.07)',
                  backdropFilter: 'blur(8px)',
                  border: language === lang ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(255,255,255,0.15)',
                  color: language === lang ? '#ffffff' : 'rgba(255,255,255,0.65)',
                  borderRadius: '9999px', padding: '10px 24px',
                  fontFamily: 'var(--font-body)', fontWeight: 500, cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  boxShadow: language === lang ? '0 4px 20px rgba(155,125,212,0.35)' : 'none',
                }}
              >
                {lang === 'en' ? 'English' : 'Hebrew'}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label htmlFor="childName" style={labelStyle}>Child&apos;s name</label>
          <input id="childName" type="text" value={name} onChange={(e) => setName(e.target.value)}
            style={inputStyle} placeholder="Enter your child's name" dir="auto"
            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(126,200,227,0.60)'; e.currentTarget.style.boxShadow = 'inset 0 0 16px rgba(126,200,227,0.06), 0 0 0 3px rgba(126,200,227,0.12)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Age */}
        <div>
          <label htmlFor="childAge" style={labelStyle}>Age</label>
          <input id="childAge" type="number" min={1} max={12} value={age} onChange={(e) => setAge(e.target.value)}
            style={{ ...inputStyle, width: '120px' }} placeholder="Age"
            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(126,200,227,0.60)'; e.currentTarget.style.boxShadow = 'inset 0 0 16px rgba(126,200,227,0.06), 0 0 0 3px rgba(126,200,227,0.12)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Traits */}
        <div>
          <label style={labelStyle}>Personality traits <span style={{ textTransform: 'none', letterSpacing: 'normal', fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>(pick up to 5)</span></label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {TRAIT_OPTIONS.map((trait) => {
              const selected = traits.includes(trait);
              return (
                <button key={trait} type="button" onClick={() => toggleTrait(trait)}
                  style={{
                    background: selected ? 'rgba(155,125,212,0.35)' : 'rgba(255,255,255,0.07)',
                    backdropFilter: 'blur(8px)',
                    border: selected ? '1px solid rgba(155,125,212,0.70)' : '1px solid rgba(255,255,255,0.14)',
                    color: selected ? '#ffffff' : 'rgba(255,255,255,0.70)',
                    borderRadius: '9999px', padding: '8px 18px',
                    fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: 400,
                    cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: selected ? '0 0 16px rgba(155,125,212,0.25)' : 'none',
                  }}
                >
                  {trait}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div style={{ padding: 12, background: 'rgba(220,50,50,0.15)', border: '1px solid rgba(220,50,50,0.30)', borderRadius: '1rem', color: 'rgba(255,150,150,0.95)', fontSize: '0.88rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 8 }}>
          <button type="button" onClick={() => router.push('/create/theme')} className="btn-secondary">
            Back
          </button>
          <button type="submit" className="btn-primary">
            Next: Upload Photos
          </button>
        </div>
      </form>
    </div>
  );
}
