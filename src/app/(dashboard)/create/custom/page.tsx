'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreationWizard } from '@/stores/creation-wizard';
import WizardProgress from '@/components/wizard/WizardProgress';
import EducationalTab from '@/components/create/EducationalTab';

type InputMode = 'freetext' | 'guided' | 'educational';

const ADVENTURE_OPTIONS = ['Space', 'Underwater', 'Forest', 'City', 'Magical kingdom', 'School', 'Home'];
const CHALLENGE_OPTIONS = ['Lost item', 'Helping a friend', 'Solving a mystery', 'Learning something new', 'Overcoming a fear', 'Winning a competition'];
const SIDEKICK_OPTIONS = ['A talking animal', 'A magical creature', 'A best friend', 'A robot', 'A wise old character', 'No sidekick'];
const MOOD_OPTIONS = ['Silly and fun', 'Magical and dreamy', 'Brave and exciting', 'Calm and cozy'];

const labelStyle: React.CSSProperties = { display: 'block', marginBottom: 8, color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-body)', fontWeight: 600 };
const textareaStyle: React.CSSProperties = { width: '100%', minHeight: 180, background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '1rem', padding: '16px 18px', color: 'rgba(255,255,255,0.90)', fontFamily: 'var(--font-body)', fontSize: '0.95rem', resize: 'vertical', outline: 'none', transition: 'border-color 0.3s ease, box-shadow 0.3s ease' };
const inputStyle: React.CSSProperties = { ...textareaStyle, minHeight: 'auto', padding: '14px 18px' };

function focusHandler(e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'rgba(126,200,227,0.60)';
  e.currentTarget.style.boxShadow = 'inset 0 0 16px rgba(126,200,227,0.06), 0 0 0 3px rgba(126,200,227,0.12)';
}
function blurHandler(e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
  e.currentTarget.style.boxShadow = 'none';
}

export default function CustomStoryPage() {
  const router = useRouter();
  const { setCustomPrompt, setStep } = useCreationWizard();
  const [mode, setMode] = useState<InputMode>('freetext');
  const [freeText, setFreeText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [adventure, setAdventure] = useState('');
  const [challenge, setChallenge] = useState('');
  const [sidekick, setSidekick] = useState('');
  const [mood, setMood] = useState('');
  const [specialElements, setSpecialElements] = useState('');

  function handleSubmit() {
    setError(null);
    if (mode === 'freetext') {
      if (freeText.trim().length < 20) { setError('Please describe your story idea in at least 20 characters'); return; }
      setCustomPrompt(freeText.trim());
    } else {
      if (!adventure || !challenge || !sidekick || !mood) { setError('Please answer all required questions'); return; }
      setCustomPrompt(`Setting: ${adventure}. Main challenge: ${challenge}. Sidekick: ${sidekick}. Mood: ${mood}.${specialElements ? ` Special elements: ${specialElements}.` : ''}`);
    }
    useCreationWizard.setState({ selectedThemeSlug: '__custom__' });
    setStep('details');
    router.push('/create/details');
  }

  return (
    <div>
      <WizardProgress currentStep="theme" />

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '2.2rem', fontWeight: 500, color: 'var(--text-primary)' }}>Create your own story</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Describe the story you want, or answer guided questions to build it step by step.</p>
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {([
          { key: 'freetext', label: 'Free text' },
          { key: 'guided', label: 'Guided questions' },
          { key: 'educational', label: '📚 Real-world topic' },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setMode(key)} style={{
            background: mode === key ? 'linear-gradient(135deg, rgba(155,125,212,0.70), rgba(126,200,227,0.60))' : 'rgba(255,255,255,0.07)',
            border: mode === key ? '1px solid rgba(255,255,255,0.20)' : '1px solid rgba(255,255,255,0.15)',
            color: mode === key ? 'white' : 'rgba(255,255,255,0.55)',
            borderRadius: 9999, padding: '8px 24px', fontSize: '0.88rem', fontFamily: 'var(--font-body)',
            fontWeight: 500, cursor: 'pointer', transition: 'all 0.25s ease',
            boxShadow: mode === key ? '0 4px 16px rgba(155,125,212,0.30)' : 'none',
          }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 560 }}>
        {mode === 'educational' ? (
          <EducationalTab
            onUseConcept={(concept, title) => {
              setCustomPrompt(`[Educational Story] Title: "${title}"\n\n${concept}`);
              useCreationWizard.setState({ selectedThemeSlug: '__custom__' });
              setStep('details');
              router.push('/create/details');
            }}
          />
        ) : mode === 'freetext' ? (
          <div>
            <label htmlFor="storyIdea" style={labelStyle}>Describe your story idea</label>
            <textarea id="storyIdea" value={freeText} onChange={(e) => setFreeText(e.target.value)} maxLength={500}
              style={textareaStyle} placeholder="Describe your story idea... For example: 'A brave little girl who discovers she can talk to animals and helps save a forest from a mysterious fog'"
              dir="auto" onFocus={focusHandler} onBlur={blurHandler} />
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem', marginTop: 4, textAlign: 'right' }}>
              {freeText.length}/500 characters (min 20)
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SelectField label="What kind of adventure?" value={adventure} onChange={setAdventure} options={ADVENTURE_OPTIONS} />
            <SelectField label="What's the main challenge?" value={challenge} onChange={setChallenge} options={CHALLENGE_OPTIONS} />
            <SelectField label="Who's the sidekick?" value={sidekick} onChange={setSidekick} options={SIDEKICK_OPTIONS} />
            <SelectField label="What's the mood?" value={mood} onChange={setMood} options={MOOD_OPTIONS} />
            <div>
              <label htmlFor="special" style={{ ...labelStyle, fontWeight: 400 }}>
                Any special elements to include? <span style={{ textTransform: 'none', letterSpacing: 'normal', color: 'rgba(255,255,255,0.35)' }}>(optional)</span>
              </label>
              <input id="special" type="text" value={specialElements} onChange={(e) => setSpecialElements(e.target.value)}
                style={inputStyle} placeholder="e.g., a rainbow bridge, a pet dragon named Sparky..." dir="auto"
                onFocus={focusHandler} onBlur={blurHandler} />
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: 16, padding: 12, background: 'rgba(220,50,50,0.15)', border: '1px solid rgba(220,50,50,0.30)', borderRadius: '1rem', color: 'rgba(255,150,150,0.95)', fontSize: '0.88rem' }}>{error}</div>
        )}

        {mode !== 'educational' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24 }}>
            <button onClick={() => router.push('/create')} className="btn-secondary">Back</button>
            <button onClick={handleSubmit} className="btn-primary">Next: Child Details</button>
          </div>
        )}
        {mode === 'educational' && (
          <div style={{ marginTop: 24 }}>
            <button onClick={() => router.push('/create')} className="btn-secondary">Back</button>
          </div>
        )}
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <button key={opt} type="button" onClick={() => onChange(opt)} style={{
              background: selected ? 'rgba(155,125,212,0.35)' : 'rgba(255,255,255,0.07)',
              border: selected ? '1px solid rgba(155,125,212,0.70)' : '1px solid rgba(255,255,255,0.14)',
              color: selected ? 'white' : 'rgba(255,255,255,0.70)',
              borderRadius: 9999, padding: '8px 18px', fontSize: '0.88rem',
              fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'all 0.2s ease',
              boxShadow: selected ? '0 0 16px rgba(155,125,212,0.25)' : 'none',
            }}>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
