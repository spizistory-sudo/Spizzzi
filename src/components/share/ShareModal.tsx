'use client';

import { useState, useCallback } from 'react';
import type { Book } from '@/types/book';

interface ShareModalProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareModal({ book, isOpen, onClose }: ShareModalProps) {
  const [isPublic, setIsPublic] = useState(book.is_public);
  const [shareSlug, setShareSlug] = useState(book.share_slug);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://spizzzy.vercel.app');
  const shareUrl = shareSlug ? `${appUrl}/share/${shareSlug}` : null;

  const togglePublic = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/books/${book.id}/share`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !isPublic }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsPublic(data.is_public);
        setShareSlug(data.share_slug);
      }
    } catch (err) {
      console.error('Failed to toggle share:', err);
    } finally {
      setLoading(false);
    }
  }, [book.id, isPublic]);

  const copyLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  const handleShare = useCallback(async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: book.title,
          text: `ספר מותאם אישית עבור ${book.child_name}!`,
          url: shareUrl,
        });
      } catch { /* cancelled */ }
    }
  }, [book.title, book.child_name, shareUrl]);

  const downloadPdf = useCallback(async () => {
    setPdfLoading(true);
    try {
      const res = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book.id }),
      });
      if (!res.ok) throw new Error('PDF generation failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${book.title.replace(/[^a-zA-Z0-9\u0590-\u05FF ]/g, '')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download failed:', err);
    } finally {
      setPdfLoading(false);
    }
  }, [book.id, book.title]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md mx-4 glass" style={{ padding: '32px', borderRadius: 'var(--radius-lg)' }}>
        <button onClick={onClose} className="absolute top-4 left-4" style={{ color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16, fontFamily: 'var(--font-display)' }}>שיתוף</h2>

        {/* Public toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-sm)', marginBottom: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <p style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.92rem' }}>הפכו את הספר לציבורי</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>כל מי שיש לו את הקישור יוכל לקרוא</p>
          </div>
          <button
            onClick={togglePublic}
            disabled={loading}
            style={{
              position: 'relative', width: 48, height: 28, borderRadius: 9999, border: 'none', cursor: 'pointer',
              background: isPublic ? 'var(--purple)' : 'rgba(255,255,255,0.15)',
              opacity: loading ? 0.5 : 1, transition: 'background 0.2s',
            }}
          >
            <div style={{
              position: 'absolute', top: 2, width: 24, height: 24, background: 'white', borderRadius: '50%',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'transform 0.2s',
              transform: isPublic ? 'translateX(-22px)' : 'translateX(22px)',
            }} />
          </button>
        </div>

        {/* Share URL */}
        {isPublic && shareUrl && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text" readOnly value={shareUrl} dir="ltr"
                className="input-field" style={{ flex: 1, fontSize: '0.82rem', padding: '10px 12px' }}
              />
              <button onClick={copyLink} className="btn-primary" style={{ padding: '10px 16px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                {copied ? 'הועתק!' : 'העתקה'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button onClick={handleShare} className="btn-primary" style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}>
                  שיתוף
                </button>
              )}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${book.title} — ${shareUrl}`)}`}
                target="_blank" rel="noopener noreferrer"
                style={{ flex: 1, padding: '10px', background: '#25D366', color: 'white', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}
              >
                ווטסאפ
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent(book.title)}&body=${encodeURIComponent(`ספר מותאם אישית: ${shareUrl}`)}`}
                style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.10)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontWeight: 500, textAlign: 'center', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                אימייל
              </a>
            </div>
          </div>
        )}

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '16px 0' }} />

        <button
          onClick={downloadPdf}
          disabled={pdfLoading}
          className="btn-secondary"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px' }}
        >
          {pdfLoading ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 rounded-full" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'var(--cyan)' }} />
              מייצרים PDF...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              הורדת PDF
            </>
          )}
        </button>
      </div>
    </div>
  );
}
