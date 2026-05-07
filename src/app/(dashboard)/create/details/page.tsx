'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreationWizard } from '@/stores/creation-wizard';
import WizardProgress from '@/components/wizard/WizardProgress';
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
  fontSize: '0.95rem',
  outline: 'none',
  transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
};

const pillStyle = (selected: boolean, disabled: boolean): React.CSSProperties => ({
  background: selected ? 'rgba(155,125,212,0.35)' : 'rgba(255,255,255,0.07)',
  backdropFilter: 'blur(8px)',
  border: selected ? '1px solid rgba(155,125,212,0.70)' : '1px solid rgba(255,255,255,0.14)',
  color: selected ? '#ffffff' : 'rgba(255,255,255,0.70)',
  borderRadius: '9999px', padding: '8px 18px',
  fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: 400,
  cursor: disabled && !selected ? 'not-allowed' : 'pointer',
  opacity: disabled && !selected ? 0.4 : 1,
  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: selected ? '0 0 16px rgba(155,125,212,0.25)' : 'none',
});

const interestPillStyle = (selected: boolean, disabled: boolean): React.CSSProperties => ({
  ...pillStyle(selected, disabled),
  background: selected ? 'rgba(126,200,227,0.25)' : 'rgba(255,255,255,0.07)',
  border: selected ? '1px solid rgba(126,200,227,0.60)' : '1px solid rgba(255,255,255,0.14)',
  boxShadow: selected ? '0 0 16px rgba(126,200,227,0.20)' : 'none',
  fontSize: '0.82rem',
  padding: '6px 14px',
});

const INTEREST_GROUPS: { key: Interest['group']; label: string }[] = [
  { key: 'animals', label: 'Animals' },
  { key: 'world', label: 'World & Exploration' },
  { key: 'creative', label: 'Creative' },
  { key: 'imagination', label: 'Imagination' },
  { key: 'activity', label: 'Activity' },
];

const AGE_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const GENDER_OPTIONS: { value: 'boy' | 'girl' | 'nonbinary'; label: string }[] = [
  { value: 'boy', label: 'Boy' },
  { value: 'girl', label: 'Girl' },
  { value: 'nonbinary', label: 'Other' },
];

export default function DetailsPage() {
  const router = useRouter();
  const {
    childName, childAge, childGender, childTraits, childInterests,
    setChildDetails, setChildGender, setChildInterests, setStep,
  } = useCreationWizard();

  const [name, setName] = useState(childName);
  const [age, setAge] = useState<number | null>(childAge);
  const [gender, setGender] = useState<'boy' | 'girl' | 'nonbinary' | null>(childGender);
  const [traits, setTraits] = useState<string[]>(childTraits);
  const [interests, setInterests] = useState<string[]>(childInterests);
  const [error, setError] = useState<string | null>(null);

  function toggleTrait(id: string) {
    setTraits(prev => prev.includes(id) ? prev.filter(t => t !== id) : prev.length < 4 ? [...prev, id] : prev);
  }

  function toggleInterest(id: string) {
    setInterests(prev => prev.includes(id) ? prev.filter(i => i !== id) : prev.length < 5 ? [...prev, id] : prev);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("Please enter your child's name"); return; }
    if (!age || age < 3 || age > 12) { setError('Please select an age (3-12)'); return; }
    if (!gender) { setError('Please select a gender'); return; }
    if (traits.length === 0) { setError('Please select at least one personality trait'); return; }
    if (interests.length === 0) { setError('Please select at least one interest'); return; }

    setChildDetails(name.trim(), age, traits);
    setChildGender(gender);
    setChildInterests(interests);
    setStep('stories');
    router.push('/create/recommendations');
  }

  const isValid = name.trim() && age && gender && traits.length > 0 && interests.length > 0;

  return (
    <div>
      <WizardProgress currentStep="details" />

      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '2.2rem', fontWeight: 500, color: 'var(--text-primary)' }}>
          Tell us about your child
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
          These details help us find the perfect story and make it truly personal.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {AGE_OPTIONS.map((a) => (
              <button key={a} type="button" onClick={() => setAge(a)}
                style={{ ...pillStyle(age === a, false), minWidth: 44, textAlign: 'center' }}
              >
                {a}
              </button>
            ))}
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

        {error && (
          <div style={{ padding: 12, background: 'rgba(220,50,50,0.15)', border: '1px solid rgba(220,50,50,0.30)', borderRadius: '1rem', color: 'rgba(255,150,150,0.95)', fontSize: '0.88rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 8 }}>
          <button type="submit" className="btn-primary" disabled={!isValid}
            style={{ opacity: isValid ? 1 : 0.5, cursor: isValid ? 'pointer' : 'not-allowed' }}
          >
            Continue &rarr;
          </button>
        </div>
      </form>
    </div>
  );
}
