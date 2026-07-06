'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Spark {
  idea: string;
  age_band: string;
  category?: string;
  value_primary?: string;
}

interface LibraryBook {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  spark: Spark;
  story: { title?: string } | null;
  brief: { title?: string } | null;
  last_error: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  spark: 'rgba(245,200,66,0.85)',
  developing_idea: 'rgba(126,200,227,0.85)',
  idea_ready: 'rgba(126,200,227,0.85)',
  writing: 'rgba(155,125,212,0.85)',
  checking: 'rgba(155,125,212,0.85)',
  needs_revision: 'rgba(255,160,60,0.85)',
  illustrating: 'rgba(155,125,212,0.85)',
  ready: 'rgba(100,220,140,0.85)',
  approved: 'rgba(100,220,140,0.85)',
  rejected: 'rgba(255,100,80,0.85)',
  failed: 'rgba(255,100,80,0.85)',
};

const COLUMNS = [
  { key: 'spark', label: 'Spark', statuses: ['spark'] },
  { key: 'production', label: 'In Production', statuses: ['developing_idea', 'idea_ready', 'writing', 'checking', 'needs_revision', 'illustrating'] },
  { key: 'review', label: 'Ready for Review', statuses: ['ready'] },
  { key: 'approved', label: 'Approved', statuses: ['approved'] },
  { key: 'rejected', label: 'Rejected', statuses: ['rejected'] },
  { key: 'failed', label: 'Failed', statuses: ['failed'] },
];

function getTitle(book: LibraryBook): string {
  if (book.story?.title) return book.story.title;
  if (book.brief?.title) return book.brief.title;
  const idea = book.spark.idea;
  return idea.length > 60 ? idea.slice(0, 57) + '...' : idea;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span style={{
      fontSize: '0.68rem',
      fontWeight: 600,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: STATUS_COLORS[status] || 'rgba(255,255,255,0.5)',
      background: (STATUS_COLORS[status] || 'rgba(255,255,255,0.5)').replace(/[\d.]+\)$/, '0.12)'),
      padding: '3px 8px',
      borderRadius: 6,
      whiteSpace: 'nowrap',
    }}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function BookCard({ book }: { book: LibraryBook }) {
  return (
    <Link href={`/studio/book/${book.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div className="glass" style={{
        padding: '14px 16px',
        borderRadius: 14,
        cursor: 'pointer',
        transition: 'border-color 0.2s, transform 0.15s',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'rgba(245,200,66,0.35)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
          e.currentTarget.style.transform = 'none';
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'rgba(255,255,255,0.92)', lineHeight: 1.3 }}>
            {getTitle(book)}
          </span>
          <StatusBadge status={book.status} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
          <span style={{
            fontSize: '0.7rem', fontWeight: 600,
            background: 'rgba(126,200,227,0.12)', color: 'rgba(126,200,227,0.85)',
            padding: '2px 7px', borderRadius: 5,
          }}>
            {book.spark.age_band}
          </span>
          {book.spark.category && (
            <span style={{
              fontSize: '0.7rem', fontWeight: 500,
              color: 'rgba(255,255,255,0.45)',
            }}>
              {book.spark.category}
            </span>
          )}
        </div>
        {book.spark.value_primary && (
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
            {book.spark.value_primary}
          </div>
        )}
        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.28)' }}>
          {timeAgo(book.updated_at)}
        </div>
        {book.last_error && book.status === 'failed' && (
          <div style={{
            fontSize: '0.7rem', color: 'rgba(255,100,80,0.75)',
            marginTop: 6, padding: '6px 8px',
            background: 'rgba(255,100,80,0.06)', borderRadius: 6,
            lineHeight: 1.35,
          }}>
            {book.last_error.length > 100 ? book.last_error.slice(0, 97) + '...' : book.last_error}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function StudioBoard() {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBooks = useCallback(async () => {
    try {
      const res = await fetch('/api/studio/books');
      if (!res.ok) return;
      const data = await res.json();
      setBooks(data.books || []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBooks();
    const interval = setInterval(fetchBooks, 15000);
    return () => clearInterval(interval);
  }, [fetchBooks]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.4)' }}>
        Loading pipeline...
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 20,
        alignItems: 'start',
      }}>
        {COLUMNS.map(col => {
          const columnBooks = books.filter(b => col.statuses.includes(b.status));
          return (
            <div key={col.key}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 12, padding: '0 4px',
              }}>
                <span style={{
                  fontSize: '0.75rem', fontWeight: 600,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.45)',
                }}>
                  {col.label}
                </span>
                <span style={{
                  fontSize: '0.68rem', fontWeight: 600,
                  color: 'rgba(255,255,255,0.25)',
                  background: 'rgba(255,255,255,0.06)',
                  padding: '1px 7px', borderRadius: 8,
                  minWidth: 20, textAlign: 'center',
                }}>
                  {columnBooks.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {columnBooks.length === 0 && (
                  <div style={{
                    padding: 20, textAlign: 'center',
                    color: 'rgba(255,255,255,0.15)',
                    fontSize: '0.78rem',
                    border: '1px dashed rgba(255,255,255,0.08)',
                    borderRadius: 14,
                  }}>
                    Empty
                  </div>
                )}
                {columnBooks.map(book => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {books.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          color: 'rgba(255,255,255,0.4)',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>No books yet</div>
          <div style={{ fontSize: '0.95rem', marginBottom: 24 }}>Create your first library book to get started.</div>
          <Link href="/studio/new" className="btn-primary">+ New Book</Link>
        </div>
      )}
    </div>
  );
}
