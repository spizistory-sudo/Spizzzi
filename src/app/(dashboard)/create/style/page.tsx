'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCreationWizard } from '@/stores/creation-wizard';
import WizardProgress from '@/components/wizard/WizardProgress';
import { ART_STYLES, type ArtStyleKey } from '@/lib/ai/prompts/style-references';
import Image from 'next/image';

const styleEntries = Object.entries(ART_STYLES) as [ArtStyleKey, (typeof ART_STYLES)[ArtStyleKey]][];

export default function StylePage() {
  const router = useRouter();
  const { selectedStyleKey, setSelectedStyle, setStep } = useCreationWizard();
  const [selected, setSelected] = useState<ArtStyleKey | null>(selectedStyleKey);
  const navigatingRef = useRef(false);

  function handleSelect(key: ArtStyleKey) {
    if (navigatingRef.current) return;
    setSelected(key);
    setSelectedStyle(key);
    navigatingRef.current = true;
    setStep('details');
    setTimeout(() => router.push('/create/details'), 150);
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

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
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
              <div className="w-full overflow-hidden" style={{ aspectRatio: '1 / 1' }}>
                <Image
                  src={`/images/styles/${key}.png`}
                  alt={style.name}
                  width={400}
                  height={400}
                  className="w-full h-full object-cover"
                  unoptimized
                />
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-6 pb-8">
        <button onClick={() => router.push('/create')} className="btn-secondary min-h-[44px]">
          &larr; Back
        </button>
      </div>
    </div>
  );
}
