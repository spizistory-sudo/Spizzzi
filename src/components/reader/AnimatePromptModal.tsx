'use client';

interface Props {
  bookTitle: string;
  pageCount: number;
  onAccept: () => void;
  onDecline: () => void;
}

export default function AnimatePromptModal({ bookTitle, pageCount, onAccept, onDecline }: Props) {
  const estimatedMinutes = Math.ceil(pageCount * 1.5);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0, 0, 0, 0.70)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'rgba(15, 20, 45, 0.95)', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 28, padding: '48px 52px', maxWidth: 480, width: '100%',
        textAlign: 'center', boxShadow: '0 32px 80px rgba(0,0,0,0.60)',
      }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 20, display: 'inline-block', animation: 'gentleFloat 3s ease-in-out infinite' }}>
          &#10024;
        </div>

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', color: 'rgba(255,255,255,0.95)', marginBottom: 16, fontStyle: 'italic' }}>
          Animate Your Book?
        </h2>

        <p style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginBottom: 8, fontSize: '0.95rem' }}>
          Watch <strong style={{ color: 'white' }}>{bookTitle}</strong> come to life!
          We&apos;ll animate all {pageCount} pages in the background while you read.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', marginBottom: 36 }}>
          Takes about {estimatedMinutes}&ndash;{estimatedMinutes + 3} minutes. We&apos;ll notify you when it&apos;s ready. &#127881;
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={onDecline} style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.20)',
            color: 'rgba(255,255,255,0.55)', borderRadius: 9999, padding: '12px 28px',
            fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}>
            Not Now
          </button>
          <button onClick={onAccept} style={{
            background: 'linear-gradient(135deg, rgba(155,125,212,0.85), rgba(126,200,227,0.75))',
            border: '1px solid rgba(255,255,255,0.22)', color: '#ffffff', borderRadius: 9999,
            padding: '12px 32px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 24px rgba(155,125,212,0.40)', fontFamily: 'var(--font-body)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            &#10024; Yes, Animate It!
          </button>
        </div>
      </div>
    </div>
  );
}
