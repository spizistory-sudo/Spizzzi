'use client';

import { useState } from 'react';

const TONES = [
  { id: 'peaceful', label: '🕊 Peaceful', desc: 'Finding harmony' },
  { id: 'hopeful', label: '🌟 Hopeful', desc: 'Good things ahead' },
  { id: 'brave', label: '🦁 Brave', desc: 'Courage helps' },
  { id: 'kind', label: '💛 Kind', desc: 'Empathy & care' },
];

interface GeneratedConcept {
  title: string;
  concept: string;
  lesson: string;
  metaphorExplanation: string;
}

interface Props {
  childAge?: number;
  onUseConcept: (concept: string, title: string) => void;
}

export default function EducationalTab({ childAge = 6, onUseConcept }: Props) {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('hopeful');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedConcept | null>(null);
  const [error, setError] = useState('');

  async function handleGenerate() {
    if (topic.trim().length < 3) return;
    setIsGenerating(true);
    setResult(null);
    setError('');

    try {
      const res = await fetch('/api/generate-educational-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), tone, childAge }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>
        Type any real-world topic — news events, history, science, social issues —
        and we&apos;ll transform it into a gentle, age-appropriate story your child will understand.
      </p>

      {/* Topic input */}
      <div>
        <label style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10, fontFamily: 'var(--font-body)', fontWeight: 600 }}>
          What would you like your child to understand?
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          placeholder='e.g. "climate change", "why people get sick", "divorce"'
          style={{
            width: '100%', background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: '1rem', padding: '13px 18px',
            color: 'rgba(255,255,255,0.90)', fontFamily: 'var(--font-body)', fontSize: '0.95rem',
            outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'rgba(126,200,227,0.60)'; e.target.style.boxShadow = '0 0 0 3px rgba(126,200,227,0.12)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.15)'; e.target.style.boxShadow = 'none'; }}
        />
      </div>

      {/* Tone selector */}
      <div>
        <label style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10, fontFamily: 'var(--font-body)', fontWeight: 600 }}>
          Story tone
        </label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {TONES.map((t) => (
            <button key={t.id} onClick={() => setTone(t.id)} style={{
              background: tone === t.id ? 'rgba(155,125,212,0.35)' : 'rgba(255,255,255,0.07)',
              border: tone === t.id ? '1px solid rgba(155,125,212,0.70)' : '1px solid rgba(255,255,255,0.14)',
              color: tone === t.id ? 'white' : 'rgba(255,255,255,0.65)',
              borderRadius: 9999, padding: '8px 18px', fontSize: '0.88rem', cursor: 'pointer',
              transition: 'all 0.2s ease', fontFamily: 'var(--font-body)',
              boxShadow: tone === t.id ? '0 0 16px rgba(155,125,212,0.25)' : 'none',
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button onClick={handleGenerate} disabled={topic.trim().length < 3 || isGenerating} style={{
        background: topic.trim().length < 3 ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, rgba(155,125,212,0.80), rgba(126,200,227,0.70))',
        border: '1px solid rgba(255,255,255,0.20)',
        color: topic.trim().length < 3 ? 'rgba(255,255,255,0.30)' : 'white',
        borderRadius: 9999, padding: '13px 36px', fontSize: '0.95rem', fontWeight: 600,
        cursor: topic.trim().length < 3 ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)',
        boxShadow: topic.trim().length >= 3 ? '0 4px 24px rgba(155,125,212,0.35)' : 'none',
        transition: 'all 0.2s ease', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {isGenerating ? (
          <><span style={{ animation: 'spin 1.2s linear infinite', display: 'inline-block' }}>&#9676;</span> Crafting your story...</>
        ) : (
          '✨ Generate Story Idea'
        )}
      </button>

      {error && <p style={{ color: 'rgba(240,100,80,0.90)', fontSize: '0.85rem', margin: 0 }}>{error}</p>}

      {/* Result card */}
      {result && (
        <div className="fade-up" style={{
          background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(126,200,227,0.25)', borderRadius: '1.5rem',
          padding: '28px 32px', boxShadow: 'inset 0 0 20px rgba(255,255,255,0.03), 0 8px 32px rgba(0,0,0,0.25)',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(126,200,227,0.80)', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
            &#10024; Here&apos;s your story concept
          </div>

          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'rgba(255,255,255,0.95)', margin: 0, fontStyle: 'italic' }}>
            &ldquo;{result.title}&rdquo;
          </h3>

          <p style={{ color: 'rgba(255,255,255,0.80)', lineHeight: 1.75, fontSize: '0.95rem', margin: 0 }}>
            {result.concept}
          </p>

          <div style={{ background: 'rgba(155,125,212,0.15)', border: '1px solid rgba(155,125,212,0.30)', borderRadius: '0.75rem', padding: '10px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>&#128218;</span>
            <div>
              <div style={{ color: 'rgba(155,125,212,0.90)', fontSize: '0.70rem', fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 4 }}>Lesson for your child</div>
              <div style={{ color: 'rgba(255,255,255,0.70)', fontSize: '0.85rem', lineHeight: 1.5 }}>{result.lesson}</div>
            </div>
          </div>

          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', fontStyle: 'italic', lineHeight: 1.5 }}>
            &#128161; {result.metaphorExplanation}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
            <button onClick={handleGenerate} style={{
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.18)',
              color: 'rgba(255,255,255,0.65)', borderRadius: 9999, padding: '10px 24px',
              fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.2s',
            }}>
              &#8634; Regenerate
            </button>
            <button onClick={() => onUseConcept(result.concept, result.title)} style={{
              background: 'linear-gradient(135deg, rgba(155,125,212,0.80), rgba(126,200,227,0.70))',
              border: '1px solid rgba(255,255,255,0.20)', color: 'white', borderRadius: 9999,
              padding: '10px 28px', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-body)', boxShadow: '0 4px 20px rgba(155,125,212,0.35)', transition: 'all 0.2s',
            }}>
              Use This Story &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
