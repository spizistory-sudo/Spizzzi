'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Book } from '@/types/book';
import ShareModal from '@/components/share/ShareModal';

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: '#FFF0E8', text: '#C4713A', label: 'Draft' },
  generating: { bg: '#EDF6FF', text: '#4A8BC2', label: 'Creating...' },
  review: { bg: '#FFF8E0', text: '#B8960A', label: 'In Review' },
  complete: { bg: '#E8FFE8', text: '#3DA55C', label: 'Complete' },
  error: { bg: '#FFE8E8', text: '#C44A4A', label: 'Error' },
};

interface BookCardProps {
  book: Book & { cover_url?: string | null };
}

export default function BookCard({ book }: BookCardProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${book.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/books/${book.id}`, { method: 'DELETE' });
      if (res.ok) router.refresh();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(false);
      setShowMenu(false);
    }
  }

  const status = statusStyles[book.status] || statusStyles.draft;

  return (
    <>
      <div
        className="group relative overflow-hidden selection-card"
        style={{ padding: 0 }}
      >
        {/* Cover image */}
        <div className="h-52 relative overflow-hidden" style={{ borderRadius: 'var(--radius-md) var(--radius-md) 0 0' }}>
          {book.cover_url ? (
            <img src={book.cover_url} alt={book.title} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(155,125,212,0.3), rgba(126,200,227,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '48px', opacity: 0.4 }}>&#128218;</span>
            </div>
          )}

          {/* Hover overlay with action buttons */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-250"
            style={{
              background: 'rgba(4, 6, 18, 0.78)',
              borderRadius: 'inherit',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              zIndex: 5,
            }}
          >
            <Link href={`/reader/${book.id}`} style={{
              background: 'rgba(255, 255, 255, 0.14)',
              border: '1px solid rgba(255, 255, 255, 0.30)',
              color: '#ffffff',
              borderRadius: 9999,
              padding: '9px 28px',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              width: 160,
              textAlign: 'center',
              textDecoration: 'none',
              display: 'block',
            }}>Read</Link>
            <button onClick={(e) => { e.stopPropagation(); setShowShareModal(true); }} style={{
              background: 'rgba(255, 255, 255, 0.14)',
              border: '1px solid rgba(255, 255, 255, 0.30)',
              color: '#ffffff',
              borderRadius: 9999,
              padding: '9px 28px',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              width: 160,
              textAlign: 'center',
            }}>Share &amp; Export</button>
            <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} disabled={deleting} style={{
              background: 'rgba(255, 80, 60, 0.12)',
              border: '1px solid rgba(255, 100, 80, 0.35)',
              color: 'rgba(255, 140, 120, 0.95)',
              borderRadius: 9999,
              padding: '9px 28px',
              fontSize: '0.88rem',
              fontWeight: 500,
              cursor: 'pointer',
              width: 160,
              textAlign: 'center',
            }}>{deleting ? 'Deleting...' : 'Delete'}</button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '14px 18px', background: 'rgba(10,17,40,0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 500, color: 'rgba(255,255,255,0.95)', marginBottom: 4, lineHeight: 1.3 }} dir="auto">
            {book.title}
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-body)', fontSize: '0.82rem' }}>
            For {book.child_name}{book.child_age ? `, age ${book.child_age}` : ''}
          </p>

          <div className="flex items-center justify-between mt-4">
            <span className="text-xs font-semibold px-3 py-1" style={{ backgroundColor: status.bg, color: status.text, borderRadius: 'var(--radius-pill)', fontFamily: 'var(--font-body)' }}>
              {status.label}
            </span>
            <div className="flex items-center gap-2">
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', fontFamily: 'var(--font-body)' }}>
                {new Date(book.created_at).toLocaleDateString()}
              </span>
              <Link
                href={`/reader/${book.id}`}
                className="btn-primary"
                style={{ fontSize: '0.82rem', fontWeight: 600, padding: '7px 18px', gap: 6, boxShadow: '0 2px 12px rgba(155,125,212,0.30)' }}
              >
                &#9654; Read
              </Link>
            </div>
          </div>
        </div>
      </div>

      <ShareModal book={book} isOpen={showShareModal} onClose={() => setShowShareModal(false)} />
    </>
  );
}
