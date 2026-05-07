'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useCreationWizard } from '@/stores/creation-wizard';

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  backdropFilter: 'blur(12px) saturate(150%)',
  WebkitBackdropFilter: 'blur(12px) saturate(150%)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: '1.5rem',
  boxShadow: 'inset 0 0 20px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.25)',
  padding: '48px 40px',
  width: 280,
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  textDecoration: 'none',
  display: 'block',
};

export default function CreatePage() {
  const reset = useCreationWizard((s) => s.reset);
  useEffect(() => { reset(); }, [reset]);

  return (
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'rgba(255,255,255,0.95)', marginBottom: 48, textAlign: 'center', fontStyle: 'italic' }}>
        Create a new book
      </h1>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/create/theme" style={cardStyle}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.borderColor = 'rgba(245,200,66,0.45)'; e.currentTarget.style.boxShadow = '0 0 0 1px rgba(245,200,66,0.20), 0 16px 48px rgba(0,0,0,0.35)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.25)'; }}
        >
          <span style={{ fontSize: '3rem', marginBottom: 16, display: 'block' }}>&#127912;</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'rgba(255,255,255,0.95)', marginBottom: 10 }}>Choose a Theme</h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.88rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
            Pick from premade story themes — superheroes, underwater adventures, magical kitchens, and more.
          </p>
        </Link>

        <Link href="/create/custom" style={cardStyle}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.borderColor = 'rgba(245,200,66,0.45)'; e.currentTarget.style.boxShadow = '0 0 0 1px rgba(245,200,66,0.20), 0 16px 48px rgba(0,0,0,0.35)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.25)'; }}
        >
          <span style={{ fontSize: '3rem', marginBottom: 16, display: 'block' }}>&#9997;&#65039;</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'rgba(255,255,255,0.95)', marginBottom: 10 }}>Create Your Own</h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.88rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
            Write a free-text storyline or answer guided questions to build a fully original story.
          </p>
        </Link>
      </div>
    </div>
  );
}
