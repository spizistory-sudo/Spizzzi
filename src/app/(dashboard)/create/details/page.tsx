'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreationWizard } from '@/stores/creation-wizard';
import WizardProgress from '@/components/wizard/WizardProgress';
import PhotoUpload from '@/components/wizard/PhotoUpload';
import ComingSoon from '@/components/ui/ComingSoon';
import { PERSONALITY_TRAITS } from '@/lib/personality-traits-en';
import { INTERESTS, type Interest } from '@/lib/interests-en';

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
  fontSize: '16px',
  outline: 'none',
  transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
  minHeight: 48,
};

const pillStyle = (selected: boolean, disabled: boolean): React.CSSProperties => ({
  background: selected ? 'rgba(155,125,212,0.35)' : 'rgba(255,255,255,0.07)',
  backdropFilter: 'blur(8px)',
  border: selected ? '1px solid rgba(155,125,212,0.70)' : '1px solid rgba(255,255,255,0.14)',
  color: selected ? '#ffffff' : 'rgba(255,255,255,0.70)',
  borderRadius: '9999px', padding: '10px 18px',
  fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: 400,
  cursor: disabled && !selected ? 'not-allowed' : 'pointer',
  opacity: disabled && !selected ? 0.4 : 1,
  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: selected ? '0 0 16px rgba(155,125,212,0.25)' : 'none',
  minHeight: 44,
});

const interestPillStyle = (selected: boolean, disabled: boolean): React.CSSProperties => ({
  ...pillStyle(selected, disabled),
  background: selected ? 'rgba(126,200,227,0.25)' : 'rgba(255,255,255,0.07)',
  border: selected ? '1px solid rgba(126,200,227,0.60)' : '1px solid rgba(255,255,255,0.14)',
  boxShadow: selected ? '0 0 16px rgba(126,200,227,0.20)' : 'none',
  fontSize: '0.85rem',
  padding: '8px 14px',
  minHeight: 44,
});

const INTEREST_GROUPS: { key: Interest['group']; label: string }[] = [
  { key: 'animals', label: 'Animals' },
  { key: 'world', label: 'World & Exploration' },
  { key: 'creative', label: 'Creative' },
  { key: 'imagination', label: 'Imagination' },
  { key: 'activity', label: 'Activity' },
];

const AGE_MIN = 2;
const AGE_MAX = 12;
const AGE_DEFAULT = 6;
const GENDER_OPTIONS: { value: 'boy' | 'girl' | 'nonbinary'; label: string }[] = [
  { value: 'boy', label: 'Boy' },
  { value: 'girl', label: 'Girl' },
  { value: 'nonbinary', label: 'Other' },
];

export default function DetailsPage() {
  const router = useRouter();
  const {
    childName, childAge, childGender, childTraits, childInterests, uploadedPhotos,
    selectedStyleKey,
    setChildDetails, setChildGender, setChildInterests, setStep, setPhotoDescription,
  } = useCreationWizard();

  if (!selectedStyleKey) {
    router.replace('/create/style');
    return null;
  }

  const [name, setName] = useState(childName);
  const [age, setAge] = useState<number | null>(childAge);
  const [gender, setGender] = useState<'boy' | 'girl' | 'nonbinary' | null>(childGender);
  const [traits, setTraits] = useState<string[]>(childTraits);
  const [interests, setInterests] = useState<string[]>(childInterests);
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [showOptional, setShowOptional] = useState(childTraits.length > 0 || childInterests.length > 0);
  const [analyzing, setAnalyzing] = useState(false);

  const hasChildPhoto = uploadedPhotos.some((p) => p.label === 'child');

  function toggleTrait(id: string) {
    setTraits(prev => prev.includes(id) ? prev.filter(t => t !== id) : prev.length < 4 ? [...prev, id] : prev);
  }

  function toggleInterest(id: string) {
    setInterests(prev => prev.includes(id) ? prev.filter(i => i !== id) : prev.length < 5 ? [...prev, id] : prev);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("Please enter your child's name"); return; }
    if (!age || age < AGE_MIN || age > AGE_MAX) { setError(`Please select an age (${AGE_MIN}-${AGE_MAX})`); return; }
    if (!gender) { setError('Please select a gender'); return; }
    if (!hasChildPhoto) { setError('Please upload at least one photo of your child'); return; }

    setChildDetails(name.trim(), age, traits);
    setChildGender(gender);
    setChildInterests(interests);

    // Analyze uploaded child photo before advancing
    const childPhoto = uploadedPhotos.find((p) => p.label === 'child');
    if (childPhoto) {
      setAnalyzing(true);
      try {
        const res = await fetch('/api/analyze-photo-standalone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storagePath: childPhoto.storagePath }),
        });
        if (res.ok) {
          const { description } = await res.json();
          setPhotoDescription(description);
          setPhotoError(null);
          console.log('[details] Photo analyzed, stored in wizard state');
        } else {
          const errorData = await res.json().catch(() => ({}));
          if (errorData.error === 'NO_PERSON_DETECTED') {
            setPhotoError(errorData.message || "We couldn't find a person in this photo. Please upload a clear photo of the child.");
            setAnalyzing(false);
            return;
          }
          console.warn('[details] Photo analysis failed, continuing without');
        }
      } catch (err) {
        console.warn('[details] Photo analysis error:', err);
      } finally {
        setAnalyzing(false);
      }
    }

    setStep('category');
    router.push('/create/categories');
  }

  const isValid = name.trim() && age && gender && hasChildPhoto && !analyzing;

  return (
    <div>
      <WizardProgress currentStep="details" />

      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '2.2rem', fontWeight: 500, color: 'var(--text-primary)' }}>
          Tell us about your child
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
          These details help us create a story that feels truly personal.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-2xl" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Name */}
        <div>
          <label htmlFor="childName" style={labelStyle}>What&apos;s your child&apos;s name?</label>
          <input id="childName" type="text" value={name} onChange={(e) => setName(e.target.value)}
            style={inputStyle} placeholder="Enter your child's name" dir="auto"
            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(126,200,227,0.60)'; e.currentTarget.style.boxShadow = 'inset 0 0 16px rgba(126,200,227,0.06), 0 0 0 3px rgba(126,200,227,0.12)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Age */}
        <div>
          <label style={labelStyle}>How old is your child?</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAge(Math.max(AGE_MIN, (age || AGE_DEFAULT) - 1))}
              disabled={age !== null && age <= AGE_MIN}
              className="flex items-center justify-center transition active:bg-white/10 disabled:opacity-25"
              style={{
                width: 44, height: 44, borderRadius: '0.75rem',
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.70)', cursor: age !== null && age <= AGE_MIN ? 'not-allowed' : 'pointer',
              }}
              aria-label="Decrease age"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
              </svg>
            </button>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={age ?? ''}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '');
                if (v === '') { setAge(null); return; }
                const n = parseInt(v, 10);
                if (n >= AGE_MIN && n <= AGE_MAX) setAge(n);
                else if (n > AGE_MAX) setAge(AGE_MAX);
              }}
              onBlur={() => {
                if (age === null) setAge(AGE_DEFAULT);
                else if (age < AGE_MIN) setAge(AGE_MIN);
                else if (age > AGE_MAX) setAge(AGE_MAX);
              }}
              className="text-center"
              style={{
                width: 64, minHeight: 48, borderRadius: '0.75rem',
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.95)', fontFamily: 'var(--font-body)',
                fontSize: '18px', fontWeight: 600, outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(126,200,227,0.60)'; }}
              aria-label="Child's age"
            />
            <button
              type="button"
              onClick={() => setAge(Math.min(AGE_MAX, (age || AGE_DEFAULT) + 1))}
              disabled={age !== null && age >= AGE_MAX}
              className="flex items-center justify-center transition active:bg-white/10 disabled:opacity-25"
              style={{
                width: 44, height: 44, borderRadius: '0.75rem',
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.70)', cursor: age !== null && age >= AGE_MAX ? 'not-allowed' : 'pointer',
              }}
              aria-label="Increase age"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
              </svg>
            </button>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem', marginLeft: 4 }}>years old</span>
          </div>
        </div>

        {/* Gender */}
        <div>
          <label style={labelStyle}>Gender</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {GENDER_OPTIONS.map((g) => (
              <button key={g.value} type="button" onClick={() => setGender(g.value)}
                style={pillStyle(gender === g.value, false)}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Optional: Personality + Interests (collapsible) */}
        <div>
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="flex items-center gap-2 transition-colors"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: 500,
            }}
          >
            <span style={{ fontSize: '0.7rem', transition: 'transform 0.2s', transform: showOptional ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>&#9654;</span>
            Tell us more (optional)
          </button>

          {showOptional && (
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Personality Traits */}
              <div>
                <label style={labelStyle}>
                  What&apos;s your child like?
                  <span style={{ textTransform: 'none', letterSpacing: 'normal', fontWeight: 400, color: 'rgba(255,255,255,0.35)', marginLeft: 6 }}>
                    (pick up to 4)
                  </span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {PERSONALITY_TRAITS.map((trait) => (
                    <button key={trait.id} type="button" onClick={() => toggleTrait(trait.id)}
                      style={pillStyle(traits.includes(trait.id), traits.length >= 4)}
                      title={trait.description}
                    >
                      {trait.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interests */}
              <div>
                <label style={labelStyle}>
                  What does your child love?
                  <span style={{ textTransform: 'none', letterSpacing: 'normal', fontWeight: 400, color: 'rgba(255,255,255,0.35)', marginLeft: 6 }}>
                    (pick up to 5)
                  </span>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {INTEREST_GROUPS.map((group) => {
                    const groupInterests = INTERESTS.filter(i => i.group === group.key);
                    return (
                      <div key={group.key}>
                        <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: '0.75rem', fontWeight: 500, marginBottom: 6, fontFamily: 'var(--font-body)' }}>
                          {group.label}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {groupInterests.map((interest) => (
                            <button key={interest.id} type="button" onClick={() => toggleInterest(interest.id)}
                              style={interestPillStyle(interests.includes(interest.id), interests.length >= 5)}
                            >
                              {interest.emoji} {interest.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Photo upload */}
        <div>
          <label style={labelStyle}>Add photos of your child (1–3)</label>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.84rem', marginBottom: 12, fontFamily: 'var(--font-body)' }}>
            Clear solo photos from different angles help the AI match your child best.
          </p>
          <PhotoUpload childName={name.trim() || undefined} />
          <div className="mt-3">
            <ComingSoon title="Family & Pets" description="Add photos of your family or pets and include them in the story." />
          </div>
          {photoError && (
            <div style={{ marginTop: 12, padding: 12, background: 'rgba(220,50,50,0.15)', border: '1px solid rgba(220,50,50,0.30)', borderRadius: '0.75rem', color: 'rgba(255,150,150,0.95)', fontSize: '0.84rem' }}>
              {photoError}
            </div>
          )}
        </div>

        {error && (
          <div style={{ padding: 12, background: 'rgba(220,50,50,0.15)', border: '1px solid rgba(220,50,50,0.30)', borderRadius: '1rem', color: 'rgba(255,150,150,0.95)', fontSize: '0.88rem' }}>
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 pb-8">
          <button type="button" onClick={() => router.push('/create/style')} className="btn-secondary min-h-[44px]">
            &larr; Back
          </button>
          <button type="submit" className="btn-primary min-h-[44px] flex-1 sm:flex-initial" disabled={!isValid}
            style={{ opacity: isValid ? 1 : 0.5, cursor: isValid ? 'pointer' : 'not-allowed' }}
          >
            {analyzing ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                Analyzing photo...
              </span>
            ) : (
              <>Continue &rarr;</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
