'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreationWizard } from '@/stores/creation-wizard';
import WizardProgress from '@/components/wizard/WizardProgress';
import { ART_STYLES, type ArtStyleKey } from '@/lib/ai/prompts/style-references';
import Image from 'next/image';

const styleEntries = Object.entries(ART_STYLES) as [ArtStyleKey, (typeof ART_STYLES)[ArtStyleKey]][];

export default function StylePage() {
  const router = useRouter();
  const { childName, childAge, childGender, selectedStyleKey, setSelectedStyle, setStep } = useCreationWizard();
  const [selected, setSelected] = useState<ArtStyleKey | null>(selectedStyleKey);

  if (!childName || !childAge || !childGender) {
    router.replace('/create/details');
    return null;
  }

  function handleSelect(key: ArtStyleKey) {
    setSelected(key);
    setSelectedStyle(key);
  }

  function handleContinue() {
    if (!selected) return;
    setStep('category');
    router.push('/create/categories');
  }

  function handleSurprise() {
    setSelectedStyle('pixar');
    setStep('category');
    router.push('/create/categories');
  }

  return (
    <div>
      <WizardProgress currentStep="style" />

      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '2.2rem', fontWeight: 500, color: 'var(--text-primary)' }}>
          Pick your style
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
          Each style creates a different kind of world for your story.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {styleEntries.map(([key, style]) => {
          const isSelected = selected === key;
          return (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              className="group text-left transition-all duration-300 overflow-hidden"
              style={{
                borderRadius: '1rem',
                border: isSelected ? '2px solid rgba(155,125,212,0.70)' : '1px solid rgba(255,255,255,0.10)',
                background: isSelected ? 'rgba(155,125,212,0.10)' : 'rgba(255,255,255,0.04)',
                boxShadow: isSelected ? '0 0 0 1px rgba(155,125,212,0.40), 0 0 20px rgba(155,125,212,0.15)' : 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.borderColor = 'rgba(155,125,212,0.40)'; } }}
              onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = isSelected ? 'rgba(155,125,212,0.70)' : 'rgba(255,255,255,0.10)'; } }}
            >
              {/* Preview image or gradient fallback */}
              <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16 / 9' }}>
                <Image
                  src={`/images/styles/${key}.jpg`}
                  alt={style.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
                {/* Gradient fallback behind image */}
                <div className="absolute inset-0 -z-10" style={{
                  background: 'linear-gradient(135deg, rgba(155,125,212,0.30), rgba(126,200,227,0.20))',
                }} />
              </div>

              <div style={{ padding: '14px 16px' }}>
                <h3 style={{
                  fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600,
                  color: isSelected ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.85)', marginBottom: 4,
                }}>
                  {style.name}
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.50)', lineHeight: 1.4 }}>
                  {style.previewDescription}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 24, paddingBottom: 32 }}>
        <button onClick={() => router.push('/create/details')} className="btn-secondary">
          &larr; Back
        </button>
        <button onClick={handleContinue} className="btn-primary" disabled={!selected}
          style={{ opacity: selected ? 1 : 0.5, cursor: selected ? 'pointer' : 'not-allowed' }}
        >
          Continue &rarr;
        </button>
        <button onClick={handleSurprise}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.50)', fontSize: '0.88rem', fontFamily: 'var(--font-body)',
            textDecoration: 'underline', textUnderlineOffset: '3px',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.50)'; }}
        >
          Surprise me &#10024;
        </button>
      </div>
    </div>
  );
}
