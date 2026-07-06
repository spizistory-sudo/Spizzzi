'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface StageEntry { status: string; timestamp: string }

interface LibraryBook {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  spark: {
    idea: string;
    age_band: string;
    category?: string;
    value_primary?: string;
    value_secondary?: string;
    tone?: string;
    notes?: string;
  };
  brief: Record<string, unknown> | null;
  story: Record<string, unknown> | null;
  checker_report: Record<string, unknown> | null;
  revision_count: number;
  images: Record<string, unknown> | null;
  review_verdict: string | null;
  review_notes: string | null;
  last_error: string | null;
  stage_history: StageEntry[];
}

const PIPELINE_STAGES = [
  'spark', 'developing_idea', 'idea_ready',
  'writing', 'checking', 'needs_revision',
  'illustrating', 'ready', 'approved',
];

const STAGE_LABELS: Record<string, string> = {
  spark: 'Spark',
  developing_idea: 'Developing',
  idea_ready: 'Idea Ready',
  writing: 'Writing',
  checking: 'Checking',
  needs_revision: 'Revision',
  illustrating: 'Illustrating',
  ready: 'Ready',
  approved: 'Approved',
  rejected: 'Rejected',
  failed: 'Failed',
};

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

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function JsonSection({ title, data, emptyText }: { title: string; data: unknown; emptyText: string }) {
  if (!data) {
    return (
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', marginBottom: 10 }}>{title}</h3>
        <div className="glass" style={{
          padding: '24px 20px', borderRadius: 14,
          textAlign: 'center', color: 'rgba(255,255,255,0.25)',
          fontSize: '0.85rem', fontStyle: 'italic',
        }}>
          {emptyText}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', marginBottom: 10 }}>{title}</h3>
      <div className="glass" style={{
        padding: '16px 18px', borderRadius: 14,
        overflowX: 'auto',
      }}>
        <pre style={{
          fontSize: '0.78rem',
          color: 'rgba(255,255,255,0.7)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          lineHeight: 1.5,
          margin: 0,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        }}>
          {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function PipelineTimeline({ currentStatus, history }: { currentStatus: string; history: StageEntry[] }) {
  const historyMap = new Map<string, string>();
  for (const entry of history) {
    historyMap.set(entry.status, entry.timestamp);
  }

  const currentIdx = PIPELINE_STAGES.indexOf(currentStatus);
  const isTerminal = currentStatus === 'rejected' || currentStatus === 'failed';

  return (
    <div style={{
      overflowX: 'auto',
      paddingBottom: 8,
      marginBottom: 28,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0,
        minWidth: 'max-content',
      }}>
        {PIPELINE_STAGES.map((stage, i) => {
          const isActive = stage === currentStatus;
          const isPast = currentIdx >= 0 ? i < currentIdx : historyMap.has(stage);
          const timestamp = historyMap.get(stage);
          const color = isActive
            ? (STATUS_COLORS[stage] || 'rgba(255,255,255,0.6)')
            : isPast
              ? 'rgba(255,255,255,0.35)'
              : 'rgba(255,255,255,0.12)';

          return (
            <div key={stage} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 72 }}>
                <div style={{
                  width: isActive ? 14 : 10,
                  height: isActive ? 14 : 10,
                  borderRadius: '50%',
                  background: isActive ? color : isPast ? color : 'transparent',
                  border: `2px solid ${color}`,
                  boxShadow: isActive ? `0 0 12px ${color}` : 'none',
                  transition: 'all 0.3s',
                }} />
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? color : 'rgba(255,255,255,0.35)',
                  marginTop: 6,
                  textAlign: 'center',
                  lineHeight: 1.2,
                }}>
                  {STAGE_LABELS[stage]}
                </span>
                {timestamp && (
                  <span style={{
                    fontSize: '0.58rem',
                    color: 'rgba(255,255,255,0.2)',
                    marginTop: 2,
                    textAlign: 'center',
                  }}>
                    {formatTime(timestamp)}
                  </span>
                )}
              </div>
              {i < PIPELINE_STAGES.length - 1 && (
                <div style={{
                  width: 24,
                  height: 2,
                  background: isPast ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
                  marginTop: -16,
                }} />
              )}
            </div>
          );
        })}
        {isTerminal && (
          <>
            <div style={{ width: 24, height: 2, background: 'rgba(255,100,80,0.2)', marginTop: -16 }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 72 }}>
              <div style={{
                width: 14, height: 14, borderRadius: '50%',
                background: STATUS_COLORS[currentStatus],
                border: `2px solid ${STATUS_COLORS[currentStatus]}`,
                boxShadow: `0 0 12px ${STATUS_COLORS[currentStatus]}`,
              }} />
              <span style={{
                fontSize: '0.65rem', fontWeight: 700,
                color: STATUS_COLORS[currentStatus],
                marginTop: 6,
              }}>
                {STAGE_LABELS[currentStatus]}
              </span>
              {historyMap.get(currentStatus) && (
                <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>
                  {formatTime(historyMap.get(currentStatus)!)}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [book, setBook] = useState<LibraryBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchBook = useCallback(async () => {
    try {
      const res = await fetch(`/api/studio/books/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setBook(data.book);
    } catch { /* silent */ }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchBook();
    const interval = setInterval(fetchBook, 15000);
    return () => clearInterval(interval);
  }, [fetchBook]);

  async function handleReview(verdict: 'approved' | 'rejected') {
    setReviewing(true);
    try {
      await fetch(`/api/studio/books/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_verdict: verdict, review_notes: reviewNotes }),
      });
      await fetchBook();
    } catch { /* silent */ }
    setReviewing(false);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/studio/books/${id}`, { method: 'DELETE' });
      router.push('/studio');
    } catch {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.4)' }}>
        Loading...
      </div>
    );
  }

  if (!book) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.4)' }}>
        Book not found
      </div>
    );
  }

  const title = (book.story as { title?: string })?.title
    || (book.brief as { title?: string })?.title
    || book.spark.idea;

  const canReview = book.status === 'ready';
  const devOverride = true;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.95)', margin: 0 }}>
            {typeof title === 'string' && title.length > 80 ? title.slice(0, 77) + '...' : title}
          </h1>
          <span style={{
            fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: STATUS_COLORS[book.status] || 'rgba(255,255,255,0.5)',
            background: (STATUS_COLORS[book.status] || 'rgba(255,255,255,0.5)').replace(/[\d.]+\)$/, '0.15)'),
            padding: '4px 10px', borderRadius: 8,
          }}>
            {book.status.replace(/_/g, ' ')}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', flexWrap: 'wrap' }}>
          <span>Age: {book.spark.age_band}</span>
          {book.spark.category && <span>Category: {book.spark.category}</span>}
          {book.spark.tone && <span>Tone: {book.spark.tone}</span>}
          {book.revision_count > 0 && <span>Revisions: {book.revision_count}</span>}
          <span>Created: {formatTime(book.created_at)}</span>
        </div>
      </div>

      {/* Pipeline */}
      <PipelineTimeline currentStatus={book.status} history={book.stage_history || []} />

      {/* Error */}
      {book.last_error && (
        <div className="glass" style={{
          padding: '14px 18px', borderRadius: 14, marginBottom: 24,
          borderColor: 'rgba(255,100,80,0.25)',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,100,80,0.85)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Last Error
          </div>
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,100,80,0.7)', lineHeight: 1.5 }}>
            {book.last_error}
          </div>
        </div>
      )}

      {/* Spark */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', marginBottom: 10 }}>Spark</h3>
        <div className="glass" style={{ padding: '16px 18px', borderRadius: 14 }}>
          <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, margin: '0 0 10px' }}>
            {book.spark.idea}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
            {book.spark.value_primary && <span>Value: {book.spark.value_primary}</span>}
            {book.spark.value_secondary && <span>Secondary: {book.spark.value_secondary}</span>}
            {book.spark.notes && <span>Notes: {book.spark.notes}</span>}
          </div>
        </div>
      </div>

      {/* Brief */}
      <JsonSection title="Brief" data={book.brief} emptyText="Waiting for Idea agent..." />

      {/* Story */}
      <JsonSection title="Story" data={book.story} emptyText="Waiting for Writer agent..." />

      {/* Checker Report */}
      <JsonSection title="Checker Report" data={book.checker_report} emptyText="Waiting for Checker agent..." />

      {/* Illustrations */}
      <JsonSection title="Illustrations" data={book.images} emptyText="Waiting for illustration stage..." />

      {/* Review */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', marginBottom: 10 }}>Review</h3>
        <div className="glass" style={{ padding: '18px 20px', borderRadius: 14 }}>
          {book.review_verdict ? (
            <div>
              <div style={{
                fontSize: '0.85rem', fontWeight: 600,
                color: book.review_verdict === 'approved' ? 'rgba(100,220,140,0.85)' : 'rgba(255,100,80,0.85)',
                marginBottom: 8,
              }}>
                {book.review_verdict === 'approved' ? 'Approved' : 'Rejected'}
              </div>
              {book.review_notes && (
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.5 }}>
                  {book.review_notes}
                </p>
              )}
            </div>
          ) : (
            <div>
              <textarea
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                placeholder="Review notes (optional)..."
                className="input-field"
                rows={3}
                style={{ marginBottom: 14, minHeight: 80 }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => handleReview('approved')}
                  disabled={reviewing || (!canReview && !devOverride)}
                  className="btn-primary"
                  style={{
                    padding: '10px 24px', fontSize: '0.88rem',
                    background: 'linear-gradient(135deg, rgba(100,220,140,0.7), rgba(80,180,120,0.6))',
                    boxShadow: '0 4px 24px rgba(100,220,140,0.25)',
                  }}
                >
                  {reviewing ? '...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleReview('rejected')}
                  disabled={reviewing || (!canReview && !devOverride)}
                  style={{
                    padding: '10px 24px', fontSize: '0.88rem',
                    background: 'rgba(255,100,80,0.12)',
                    border: '1px solid rgba(255,100,80,0.3)',
                    color: 'rgba(255,100,80,0.85)',
                    borderRadius: 9999,
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {reviewing ? '...' : 'Reject'}
                </button>
                {!canReview && devOverride && (
                  <span style={{
                    fontSize: '0.7rem', color: 'rgba(255,160,60,0.6)',
                    alignSelf: 'center', fontStyle: 'italic',
                  }}>
                    dev override active
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Danger zone */}
      <div style={{
        borderTop: '1px solid rgba(255,100,80,0.12)',
        paddingTop: 20, marginTop: 40,
      }}>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              fontSize: '0.82rem', color: 'rgba(255,100,80,0.6)',
              background: 'transparent', border: 'none',
              cursor: 'pointer', padding: '6px 0',
              fontFamily: 'var(--font-body)',
            }}
          >
            Delete this book...
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '0.82rem', color: 'rgba(255,100,80,0.75)' }}>
              Are you sure? This cannot be undone.
            </span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                fontSize: '0.82rem', fontWeight: 600,
                color: '#fff',
                background: 'rgba(255,80,60,0.7)',
                border: 'none', borderRadius: 8,
                padding: '8px 18px', cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              {deleting ? 'Deleting...' : 'Yes, delete'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              style={{
                fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)',
                background: 'transparent', border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
