'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'spizzzy_library_announcement_v1';
const SHOW_FREQUENCY: 'session' | 'always' | 'once' = 'session';

export default function LibraryAnnouncementModal() {
  const [visible, setVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);

    if (SHOW_FREQUENCY === 'always') {
      setVisible(true);
      return;
    }
    const store = SHOW_FREQUENCY === 'once' ? localStorage : sessionStorage;
    if (!store.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    const store = SHOW_FREQUENCY === 'once' ? localStorage : sessionStorage;
    store.setItem(STORAGE_KEY, '1');
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, dismiss]);

  if (!visible) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background: 'rgba(5, 8, 22, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Spizzzy Library announcement"
        className={reduceMotion ? '' : 'el-announce-enter'}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 600,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'rgba(255, 255, 255, 0.07)',
          backdropFilter: 'blur(40px) saturate(150%)',
          WebkitBackdropFilter: 'blur(40px) saturate(150%)',
          border: '1px solid rgba(155, 125, 212, 0.35)',
          borderRadius: 28,
          boxShadow: '0 0 80px rgba(155, 125, 212, 0.12), 0 24px 60px rgba(0, 0, 0, 0.4)',
          padding: '48px 36px 40px',
          textAlign: 'center',
        }}
      >
        {/* Close button */}
        <button
          onClick={dismiss}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            color: 'rgba(255, 255, 255, 0.50)',
            fontSize: 18,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s, background 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.50)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
        >
          ✕
        </button>

        {/* Sparkle accent */}
        <div style={{
          fontSize: 56,
          lineHeight: 1,
          marginBottom: 20,
          filter: 'drop-shadow(0 0 24px rgba(233, 185, 73, 0.5))',
        }}>
          ✨
        </div>

        {/* Eyebrow */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '1.2px',
          textTransform: 'uppercase',
          color: '#e9b949',
          background: 'rgba(233, 185, 73, 0.12)',
          border: '1px solid rgba(233, 185, 73, 0.25)',
          padding: '6px 14px',
          borderRadius: 999,
          marginBottom: 20,
        }}>
          ✦ Spizzzy Library
        </div>

        {/* Heading */}
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontStyle: 'italic',
          fontSize: 'clamp(1.8rem, 5vw, 2.6rem)',
          lineHeight: 1.1,
          color: '#fff',
          marginBottom: 16,
          textShadow: '0 2px 20px rgba(155, 125, 212, 0.3)',
        }}>
          Something magical is coming
        </h2>

        {/* Body */}
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)',
          lineHeight: 1.65,
          color: 'rgba(220, 225, 245, 0.85)',
          maxWidth: 440,
          margin: '0 auto 32px',
        }}>
          We&apos;re building the biggest, most magical book library in the Milky Way. Stay tuned.
        </p>

        {/* Primary button */}
        <button
          onClick={dismiss}
          className="btn-primary"
          style={{
            padding: '14px 36px',
            fontSize: '1rem',
            background: 'linear-gradient(135deg, rgba(155, 125, 212, 0.85), rgba(126, 200, 227, 0.75))',
            boxShadow: '0 6px 28px rgba(155, 125, 212, 0.35)',
          }}
        >
          Stay tuned
        </button>
      </div>

      <style>{`
        @keyframes el-announce-in {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .el-announce-enter { animation: el-announce-in 0.35s cubic-bezier(0.2, 0.8, 0.2, 1); }
        @media (prefers-reduced-motion: reduce) { .el-announce-enter { animation: none; } }
      `}</style>
    </div>
  );
}
