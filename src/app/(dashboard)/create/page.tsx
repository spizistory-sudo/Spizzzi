'use client';

import { useRouter } from 'next/navigation';
import { useCreationWizard } from '@/stores/creation-wizard';
import { Sparkles, PenLine } from 'lucide-react';

export default function CreatePage() {
  const router = useRouter();
  const reset = useCreationWizard((s) => s.reset);

  function handleGuided() {
    reset();
    router.push('/create/style');
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="text-center mb-10">
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: '2.2rem',
          fontWeight: 500,
          color: 'var(--text-primary)',
        }}>
          Create a new book
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
          How would you like to start?
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full max-w-[720px]">
        {/* Guided card */}
        <button
          onClick={handleGuided}
          className="text-left transition-all duration-300"
          style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: '1.5rem',
            padding: '32px 28px',
            cursor: 'pointer',
            minHeight: 280,
            display: 'flex',
            flexDirection: 'column',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.borderColor = 'rgba(155,125,212,0.50)';
            e.currentTarget.style.boxShadow = '0 0 0 1px rgba(155,125,212,0.30), 0 16px 48px rgba(0,0,0,0.30)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ color: 'rgba(155,125,212,0.80)', marginBottom: 16 }}>
            <Sparkles size={48} />
          </div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.6rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: 8,
          }}>
            Guided
          </h2>
          <p style={{
            fontSize: '0.92rem',
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.6,
            flex: 1,
          }}>
            Answer a few quick questions about your child and we&apos;ll suggest a perfect story. Best for first-time creators.
          </p>
          <div style={{ marginTop: 20 }}>
            <span className="btn-primary" style={{ padding: '10px 24px', fontSize: '0.92rem' }}>
              Start guided &rarr;
            </span>
          </div>
        </button>

        {/* Write Your Own card (coming soon) */}
        <div
          className="text-left relative"
          style={{
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '1.5rem',
            padding: '32px 28px',
            cursor: 'not-allowed',
            opacity: 0.45,
            minHeight: 280,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Coming soon badge */}
          <div style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'rgba(155,125,212,0.60)',
            color: '#fff',
            fontSize: '0.68rem',
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: '9999px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            Coming soon
          </div>

          <div style={{ color: 'rgba(255,255,255,0.30)', marginBottom: 16 }}>
            <PenLine size={48} />
          </div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.6rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: 8,
          }}>
            Write Your Own Story
          </h2>
          <p style={{
            fontSize: '0.92rem',
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.6,
            flex: 1,
          }}>
            Type your own story idea and we&apos;ll bring it to life. Full creative control over the plot, characters, and ending.
          </p>
        </div>
      </div>
    </div>
  );
}
