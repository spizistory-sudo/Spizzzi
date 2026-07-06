'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  'Big Feelings',
  'I Can!',
  'Friends & Family',
  'Adventure & Imagination',
  'My World',
  'Roots & Holidays',
];

const TONES = [
  { value: 'romp', label: 'Romp' },
  { value: 'warm', label: 'Warm' },
  { value: 'comfort', label: 'Comfort' },
  { value: 'balanced', label: 'Balanced' },
];

const AGE_BANDS = ['2-4', '4-6', '6-8'];

const fieldStyle: React.CSSProperties = {
  marginBottom: 20,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.5)',
  marginBottom: 6,
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.07)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 16,
  padding: '13px 18px',
  fontSize: '0.95rem',
  color: 'rgba(255,255,255,0.92)',
  outline: 'none',
  appearance: 'none',
  cursor: 'pointer',
};

export default function NewBookPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const spark = {
      idea: (form.get('idea') as string).trim(),
      age_band: form.get('age_band') as string,
      category: (form.get('category') as string) || undefined,
      value_primary: (form.get('value_primary') as string)?.trim() || undefined,
      value_secondary: (form.get('value_secondary') as string)?.trim() || undefined,
      tone: (form.get('tone') as string) || undefined,
      notes: (form.get('notes') as string)?.trim() || undefined,
    };

    if (!spark.idea) {
      setError('Idea is required');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/studio/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(spark),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create');
      }
      const data = await res.json();
      router.push(`/studio/book/${data.book.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.6rem', marginBottom: 8, color: 'rgba(255,255,255,0.95)' }}>
        New Book Spark
      </h1>
      <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.4)', marginBottom: 32 }}>
        Plant the seed. The agents will grow it.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Idea *</label>
          <textarea
            name="idea"
            className="input-field"
            placeholder="What's the story about? A feeling, a situation, an adventure..."
            rows={4}
            style={{ minHeight: 120 }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, ...fieldStyle }}>
          <div>
            <label style={labelStyle}>Age Band *</label>
            <select name="age_band" defaultValue="4-6" style={selectStyle}>
              {AGE_BANDS.map(ab => (
                <option key={ab} value={ab} style={{ background: '#1a1a2e', color: '#fff' }}>{ab}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <select name="category" defaultValue="" style={selectStyle}>
              <option value="" style={{ background: '#1a1a2e', color: '#fff' }}>Choose...</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c} style={{ background: '#1a1a2e', color: '#fff' }}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, ...fieldStyle }}>
          <div>
            <label style={labelStyle}>Primary Value</label>
            <input name="value_primary" className="input-field" placeholder="e.g. Resilience, Kindness" />
          </div>
          <div>
            <label style={labelStyle}>Secondary Value</label>
            <input name="value_secondary" className="input-field" placeholder="Optional" />
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Tone</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {TONES.map(t => (
              <label key={t.value} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10,
                cursor: 'pointer',
                fontSize: '0.88rem',
                color: 'rgba(255,255,255,0.75)',
                minHeight: 44,
              }}>
                <input type="radio" name="tone" value={t.value} defaultChecked={t.value === 'balanced'}
                  style={{ accentColor: 'var(--gold)' }} />
                {t.label}
              </label>
            ))}
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Notes</label>
          <textarea
            name="notes"
            className="input-field"
            placeholder="Any specific direction, constraints, inspiration..."
            rows={3}
            style={{ minHeight: 80 }}
          />
        </div>

        {error && (
          <div style={{
            padding: '10px 14px', marginBottom: 16,
            background: 'rgba(255,100,80,0.1)',
            border: '1px solid rgba(255,100,80,0.25)',
            borderRadius: 10,
            color: 'rgba(255,100,80,0.85)',
            fontSize: '0.85rem',
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary"
          style={{ width: '100%', padding: '14px 28px', fontSize: '1rem' }}
        >
          {submitting ? 'Creating...' : 'Create Spark'}
        </button>
      </form>
    </div>
  );
}
