'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

/* ── Types (mirrors detail page) ── */

interface TitleOption { title: string; recommended?: boolean }
interface PageEntry { n: number; title?: string; text: string; illustration_note?: string }
interface Story {
  title_options?: TitleOption[];
  metadata?: Record<string, unknown>;
  pages?: PageEntry[];
  cover_concept?: string;
}
interface ImageEntry {
  page_or_chapter_n: number;
  type: 'spread' | 'chapter_anchor' | 'cover';
  url: string;
  status: 'complete' | 'failed';
}
interface ImagesData {
  entries: ImageEntry[];
  anchor_url: string | null;
  total_expected: number;
  failed_count: number;
  cost_estimate: string;
}
interface LibraryBook {
  id: string;
  status: string;
  spark: { idea: string; age_band: string; category?: string };
  story: Story | null;
  images: ImagesData | null;
  review_verdict: string | null;
  review_notes: string | null;
}

/* ── Helpers ── */

function getTitle(book: LibraryBook): string {
  return book.story?.title_options?.find(t => t.recommended)?.title
    || book.story?.title_options?.[0]?.title
    || book.spark.idea;
}

function getCoverImage(images: ImagesData | null): string | null {
  const cover = images?.entries?.find(e => e.type === 'cover' && e.status === 'complete');
  return cover?.url || null;
}

function getSpreadImage(images: ImagesData | null, pageN: number): string | null {
  const entry = images?.entries?.find(
    e => (e.type === 'spread' || e.type === 'chapter_anchor') && e.page_or_chapter_n === pageN && e.status === 'complete'
  );
  return entry?.url || null;
}

function isChapterBook(book: LibraryBook): boolean {
  return book.spark.age_band === '6-8';
}

/* ── Main Component ── */

export default function StudioBookReader() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [book, setBook] = useState<LibraryBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionDir, setTransitionDir] = useState<'next' | 'prev'>('next');
  const [autoPlay, setAutoPlay] = useState(false);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // Review state
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/studio/books/${id}`);
        if (!res.ok) { setLoading(false); return; }
        const data = await res.json();
        setBook(data.book);
      } catch { /* silent */ }
      setLoading(false);
    }
    load();
  }, [id]);

  const pages = book?.story?.pages || [];
  // View 0 = cover, views 1..N = spreads, view N+1 = review/end
  const totalViews = pages.length + 2;
  const isLastPage = currentView === totalViews - 1;

  const goTo = useCallback((view: number, dir: 'next' | 'prev') => {
    if (transitioning) return;
    if (view < 0 || view >= totalViews) return;
    setTransitionDir(dir);
    setTransitioning(true);
    setTimeout(() => {
      setCurrentView(view);
      setTransitioning(false);
    }, 350);
  }, [transitioning, totalViews]);

  const goNext = useCallback(() => {
    if (currentView < totalViews - 1) goTo(currentView + 1, 'next');
  }, [currentView, totalViews, goTo]);

  const goPrev = useCallback(() => {
    if (currentView > 0) goTo(currentView - 1, 'prev');
  }, [currentView, goTo]);

  // Keyboard nav
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      if (e.key === 'Escape') router.push(`/studio/book/${id}`);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, router, id]);

  // Touch swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goNext(); else goPrev();
    }
    touchStart.current = null;
  }, [goNext, goPrev]);

  // Auto-play
  useEffect(() => {
    if (!autoPlay) { if (autoTimer.current) clearTimeout(autoTimer.current); return; }
    if (isLastPage) { setAutoPlay(false); return; }
    autoTimer.current = setTimeout(goNext, 5000);
    return () => { if (autoTimer.current) clearTimeout(autoTimer.current); };
  }, [autoPlay, currentView, isLastPage, goNext]);

  async function handleReview(verdict: 'approved' | 'rejected') {
    setReviewing(true);
    try {
      await fetch(`/api/studio/books/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_verdict: verdict, review_notes: reviewNotes }),
      });
      router.push(`/studio/book/${id}`);
    } catch {
      alert('Review failed');
    }
    setReviewing(false);
  }

  if (loading) return <div style={S.loadingScreen}>Loading...</div>;
  if (!book || !book.story) return <div style={S.loadingScreen}>Book not found or has no story.</div>;

  const title = getTitle(book);
  const coverUrl = getCoverImage(book.images);
  const canReview = book.status === 'ready' && !book.review_verdict;

  // Chapter book fallback
  if (isChapterBook(book)) {
    return <ChapterFallback book={book} title={title} onClose={() => router.push(`/studio/book/${id}`)} />;
  }

  return (
    <div style={S.root} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <style>{READER_CSS}</style>

      {/* Close button */}
      <button onClick={() => router.push(`/studio/book/${id}`)} style={S.closeBtn} aria-label="Close reader">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>

      {/* Book */}
      <div className="sr-book-wrapper" style={S.bookWrapper}>
        <div className="studio-reader-book" style={S.book}>
          {/* Spine shadow */}
          <div className="sr-spine" style={S.spine} />

          {/* Page thickness edges */}
          <div className="sr-edge-l" style={S.pageEdgeLeft} />
          <div className="sr-edge-r" style={S.pageEdgeRight} />

          {/* Content area with transition */}
          <div className={`sr-page-content ${transitioning ? `sr-turn-${transitionDir}` : ''}`}>
            {currentView === 0 ? (
              <CoverView title={title} coverUrl={coverUrl} ageBand={book.spark.age_band} />
            ) : currentView <= pages.length ? (
              <SpreadView
                page={pages[currentView - 1]}
                imageUrl={getSpreadImage(book.images, pages[currentView - 1].n)}
                pageNumber={currentView}
                totalPages={pages.length}
              />
            ) : (
              <EndView
                title={title}
                canReview={canReview}
                reviewNotes={reviewNotes}
                onNotesChange={setReviewNotes}
                reviewing={reviewing}
                onApprove={() => handleReview('approved')}
                onReject={() => handleReview('rejected')}
                reviewVerdict={book.review_verdict}
              />
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={S.controlBar}>
        <button
          onClick={goPrev}
          disabled={currentView === 0 || transitioning}
          style={{ ...S.navBtn, opacity: currentView === 0 ? 0.25 : 1 }}
          aria-label="Previous page"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>

        <button
          onClick={() => setAutoPlay(!autoPlay)}
          style={{ ...S.autoBtn, background: autoPlay ? 'rgba(155,125,212,0.25)' : 'rgba(255,255,255,0.06)' }}
          aria-label={autoPlay ? 'Stop auto-play' : 'Auto-play'}
        >
          {autoPlay ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>

        {/* Page dots */}
        <div style={S.dotsRow}>
          {Array.from({ length: totalViews }).map((_, i) => (
            <button
              key={i}
              onClick={() => { if (i !== currentView) goTo(i, i > currentView ? 'next' : 'prev'); }}
              style={{
                ...S.dot,
                width: i === currentView ? 18 : 6,
                background: i === currentView ? 'rgba(233,185,73,0.9)' : 'rgba(255,255,255,0.22)',
              }}
              aria-label={`Page ${i + 1}`}
            />
          ))}
        </div>

        <button
          onClick={goNext}
          disabled={isLastPage || transitioning}
          style={{ ...S.navBtn, opacity: isLastPage ? 0.25 : 1 }}
          aria-label="Next page"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
    </div>
  );
}

/* ── Cover View ── */
function CoverView({ title, coverUrl, ageBand }: { title: string; coverUrl: string | null; ageBand: string }) {
  return (
    <div className="sr-spread">
      {/* Left page: title page */}
      <div className="sr-page sr-page-left sr-paper">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 'clamp(32px, 8%, 56px) clamp(28px, 8%, 52px)', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(130,105,55,0.5)', marginBottom: 10 }}>
            A Spizzzy Book
          </div>
          {/* Flourish divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'clamp(20px, 5%, 36px)' }}>
            <div style={{ width: 20, height: 1, background: 'linear-gradient(90deg, transparent, rgba(160,130,70,0.25))' }} />
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(160,130,70,0.2)' }} />
            <div style={{ width: 20, height: 1, background: 'linear-gradient(270deg, transparent, rgba(160,130,70,0.25))' }} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.3rem, 3.5vw, 2.2rem)', fontWeight: 600, color: 'rgba(50,35,15,0.88)', lineHeight: 1.18, margin: '0 0 12px', maxWidth: 300 }}>
            {title}
          </h1>
          {/* Bottom flourish */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'clamp(12px, 3%, 24px)', marginBottom: 16 }}>
            <div style={{ width: 20, height: 1, background: 'linear-gradient(90deg, transparent, rgba(160,130,70,0.25))' }} />
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(160,130,70,0.2)' }} />
            <div style={{ width: 20, height: 1, background: 'linear-gradient(270deg, transparent, rgba(160,130,70,0.25))' }} />
          </div>
          <div style={{ fontSize: '0.66rem', color: 'rgba(130,105,55,0.4)', letterSpacing: '0.1em', fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic' }}>
            Ages {ageBand}
          </div>
        </div>
      </div>
      {/* Right page: cover image */}
      <div className="sr-page sr-page-right">
        {coverUrl ? (
          <img src={coverUrl} alt="Cover illustration" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', position: 'relative', zIndex: 1 }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(145deg, #2a2040, #1a1530)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '3rem', opacity: 0.3 }}>📖</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Spread View (picture book) ── */
function SpreadView({ page, imageUrl, pageNumber, totalPages }: {
  page: PageEntry;
  imageUrl: string | null;
  pageNumber: number;
  totalPages: number;
}) {
  return (
    <div className="sr-spread">
      {/* Left page: text */}
      <div className="sr-page sr-page-left sr-paper">
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 'clamp(24px, 5%, 44px) clamp(24px, 7%, 48px) clamp(18px, 3.5%, 28px)', position: 'relative', zIndex: 1 }}>
          {/* Small page header on first spread */}
          {pageNumber === 1 && (
            <div style={{ textAlign: 'center', marginBottom: 'clamp(12px, 3%, 24px)', flexShrink: 0 }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(110,85,45,0.45)' }}>
                {page.title || 'Chapter One'}
              </div>
              <div style={{ width: 28, height: 1, background: 'rgba(140,110,60,0.18)', margin: '10px auto 0' }} />
            </div>
          )}
          {/* Story text — vertically centered-to-upper */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', paddingTop: pageNumber === 1 ? 0 : 'clamp(8px, 4%, 28px)', overflow: 'auto' }}>
            <p className="sr-story-text">
              {page.text}
            </p>
          </div>
          {/* Page number */}
          <div style={{ textAlign: 'center', flexShrink: 0, paddingTop: 'clamp(6px, 2%, 14px)' }}>
            <span style={{ fontSize: '0.66rem', color: 'rgba(130,105,55,0.35)', fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic' }}>
              {pageNumber}
            </span>
          </div>
        </div>
      </div>
      {/* Right page: illustration — fills edge-to-edge inside binding */}
      <div className="sr-page sr-page-right">
        {imageUrl ? (
          <img src={imageUrl} alt={`Illustration for page ${pageNumber}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', position: 'relative', zIndex: 1 }} />
        ) : (
          <ImagePlaceholder pageNumber={pageNumber} totalPages={totalPages} />
        )}
      </div>
    </div>
  );
}

/* ── Image Placeholder ── */
function ImagePlaceholder({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(145deg, rgba(30,25,50,0.95), rgba(20,18,35,0.95))',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(155,125,212,0.3)" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="3"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
      </svg>
      <span style={{ fontSize: '0.7rem', color: 'rgba(155,125,212,0.3)' }}>
        Page {pageNumber} of {totalPages}
      </span>
    </div>
  );
}

/* ── End/Review View ── */
function EndView({ title, canReview, reviewNotes, onNotesChange, reviewing, onApprove, onReject, reviewVerdict }: {
  title: string;
  canReview: boolean;
  reviewNotes: string;
  onNotesChange: (v: string) => void;
  reviewing: boolean;
  onApprove: () => void;
  onReject: () => void;
  reviewVerdict: string | null;
}) {
  return (
    <div className="sr-spread">
      <div className="sr-page sr-page-left sr-paper">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 'clamp(32px, 8%, 56px) clamp(28px, 8%, 52px)', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(130,105,55,0.45)', marginBottom: 12 }}>
            The End
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <div style={{ width: 20, height: 1, background: 'linear-gradient(90deg, transparent, rgba(160,130,70,0.25))' }} />
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(160,130,70,0.2)' }} />
            <div style={{ width: 20, height: 1, background: 'linear-gradient(270deg, transparent, rgba(160,130,70,0.25))' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 600, color: 'rgba(50,35,15,0.72)', lineHeight: 1.2, maxWidth: 280 }}>
            {title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24 }}>
            <div style={{ width: 20, height: 1, background: 'linear-gradient(90deg, transparent, rgba(160,130,70,0.25))' }} />
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(160,130,70,0.2)' }} />
            <div style={{ width: 20, height: 1, background: 'linear-gradient(270deg, transparent, rgba(160,130,70,0.25))' }} />
          </div>
          <div style={{ fontSize: '0.6rem', color: 'rgba(130,105,55,0.35)', marginTop: 14, letterSpacing: '0.15em', fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic' }}>
            A Spizzzy Book
          </div>
        </div>
      </div>
      <div className="sr-page sr-page-right" style={{ background: 'linear-gradient(170deg, #141028, #0d0a1e)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', padding: '32px 28px' }}>
          {reviewVerdict ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: reviewVerdict === 'approved' ? 'rgba(100,220,140,0.9)' : 'rgba(255,100,80,0.9)',
                marginBottom: 8,
              }}>
                {reviewVerdict === 'approved' ? 'Approved' : 'Rejected'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>
                This book has been reviewed.
              </div>
            </div>
          ) : canReview ? (
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(233,185,73,0.7)', marginBottom: 14 }}>
                Review
              </div>
              <textarea
                value={reviewNotes}
                onChange={e => onNotesChange(e.target.value)}
                placeholder="Notes (optional)..."
                rows={3}
                style={{
                  width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, padding: '10px 12px', color: 'rgba(255,255,255,0.75)', fontSize: '0.82rem',
                  fontFamily: 'var(--font-body)', resize: 'vertical', minHeight: 60, outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button onClick={onApprove} disabled={reviewing} style={S.approveBtn}>
                  {reviewing ? '...' : 'Approve'}
                </button>
                <button onClick={onReject} disabled={reviewing} style={S.rejectBtn}>
                  {reviewing ? '...' : 'Reject'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: 12, opacity: 0.5 }}>✨</div>
              <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                Finish the pipeline to unlock review.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Chapter Book Fallback (6-8) ── */
function ChapterFallback({ book, title, onClose }: { book: LibraryBook; title: string; onClose: () => void }) {
  const pages = book.story?.pages || [];
  return (
    <div style={{ ...S.root, overflow: 'auto' }}>
      <style>{READER_CSS}</style>
      <button onClick={onClose} style={S.closeBtn} aria-label="Close reader">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(233,185,73,0.5)', marginBottom: 8 }}>A Spizzzy Book</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'rgba(255,255,255,0.9)', margin: 0, lineHeight: 1.15 }}>{title}</h1>
          <div style={{ width: 40, height: 1, background: 'rgba(255,255,255,0.1)', margin: '16px auto 0' }} />
        </div>
        {pages.map((page, i) => {
          const imgUrl = getSpreadImage(book.images, page.n);
          return (
            <div key={i} style={{ marginBottom: 48 }}>
              {page.title && (
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'rgba(255,255,255,0.8)', margin: '0 0 16px', fontWeight: 600 }}>
                  {page.title}
                </h2>
              )}
              {imgUrl && (
                <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 20, boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}>
                  <img src={imgUrl} alt={`Chapter ${i + 1}`} style={{ width: '100%', display: 'block' }} />
                </div>
              )}
              <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '1.05rem', lineHeight: 1.75, color: 'rgba(255,255,255,0.72)', whiteSpace: 'pre-wrap' }}>
                {page.text}
              </div>
            </div>
          );
        })}
        <div style={{ textAlign: 'center', padding: '32px 0 60px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>The End</div>
        </div>
      </div>
    </div>
  );
}

/* ── CSS ── */
const READER_CSS = `
  /* ══ Transitions ══ */
  @keyframes sr-fade-next {
    0%   { opacity: 1; transform: translateX(0); }
    40%  { opacity: 0; transform: translateX(-30px); }
    60%  { opacity: 0; transform: translateX(30px); }
    100% { opacity: 1; transform: translateX(0); }
  }
  @keyframes sr-fade-prev {
    0%   { opacity: 1; transform: translateX(0); }
    40%  { opacity: 0; transform: translateX(30px); }
    60%  { opacity: 0; transform: translateX(-30px); }
    100% { opacity: 1; transform: translateX(0); }
  }
  .sr-turn-next { animation: sr-fade-next 0.35s ease-in-out; }
  .sr-turn-prev { animation: sr-fade-prev 0.35s ease-in-out; }
  @media (prefers-reduced-motion: reduce) {
    .sr-turn-next, .sr-turn-prev { animation: none; }
  }

  .sr-page-content {
    width: 100%; height: 100%;
    overflow: hidden;
    position: relative;
  }

  /* ══ Spread layout ══ */
  .sr-spread {
    display: flex;
    width: 100%; height: 100%;
  }
  .sr-page {
    flex: 1; min-width: 0;
    overflow: hidden;
    position: relative;
  }

  /* ══ Paper texture — warm aged cream with grain ══ */
  .sr-paper {
    background-color: #f0e4cb;
    background-image:
      /* Subtle horizontal fiber lines */
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 23px,
        rgba(160,130,80,0.025) 23px,
        rgba(160,130,80,0.025) 24px
      ),
      /* Crosshatch grain */
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 31px,
        rgba(160,130,80,0.015) 31px,
        rgba(160,130,80,0.015) 32px
      ),
      /* Warm parchment gradient */
      linear-gradient(168deg,
        #f5ecd8 0%,
        #f2e7cf 20%,
        #eedfbf 50%,
        #ebd9b5 80%,
        #e8d4ae 100%
      );
  }

  /* Inner shadow on left page — darker toward spine + outer edge */
  .sr-page-left.sr-paper::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 2;
    background:
      /* Spine-side shadow (right edge of left page) */
      linear-gradient(to left,
        rgba(100,70,30,0.12) 0%,
        rgba(100,70,30,0.04) 8%,
        transparent 20%
      ),
      /* Outer-edge shadow (left edge) */
      linear-gradient(to right,
        rgba(100,70,30,0.06) 0%,
        transparent 12%
      ),
      /* Top edge */
      linear-gradient(to bottom,
        rgba(100,70,30,0.04) 0%,
        transparent 6%
      ),
      /* Bottom edge */
      linear-gradient(to top,
        rgba(100,70,30,0.05) 0%,
        transparent 6%
      );
  }

  /* Inner shadow on right page (image) — spine side gutter shadow */
  .sr-page-right::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 4;
    background:
      /* Spine-side shadow (left edge of right page) */
      linear-gradient(to right,
        rgba(0,0,0,0.18) 0%,
        rgba(0,0,0,0.06) 4%,
        transparent 15%
      ),
      /* Outer-edge shadow (right edge) */
      linear-gradient(to left,
        rgba(0,0,0,0.04) 0%,
        transparent 8%
      ),
      /* Top edge */
      linear-gradient(to bottom,
        rgba(0,0,0,0.03) 0%,
        transparent 4%
      ),
      /* Bottom edge */
      linear-gradient(to top,
        rgba(0,0,0,0.04) 0%,
        transparent 4%
      );
  }

  /* ══ Story text ══ */
  .sr-story-text {
    font-family: 'Lora', Georgia, 'Times New Roman', serif;
    font-size: clamp(0.92rem, 2vw, 1.15rem);
    line-height: 1.72;
    color: rgba(45,32,12,0.85);
    margin: 0;
    hyphens: auto;
    overflow-wrap: break-word;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    letter-spacing: 0.005em;
  }

  /* ══ Mobile: single-page stack ══ */
  @media (max-width: 767px) {
    .sr-spread {
      flex-direction: column-reverse;
    }
    .sr-page {
      flex: none;
    }
    .sr-page-right {
      height: 48%;
    }
    .sr-page-left {
      height: 52%;
    }
    /* On mobile, lighten the spine-side shadows since there's no spine */
    .sr-page-left.sr-paper::after {
      background:
        linear-gradient(to right,
          rgba(100,70,30,0.05) 0%,
          transparent 10%
        ),
        linear-gradient(to left,
          rgba(100,70,30,0.05) 0%,
          transparent 10%
        ),
        linear-gradient(to bottom,
          rgba(100,70,30,0.04) 0%,
          transparent 5%
        ),
        linear-gradient(to top,
          rgba(100,70,30,0.05) 0%,
          transparent 5%
        );
    }
    .sr-page-right::after {
      background:
        linear-gradient(to bottom,
          rgba(0,0,0,0.04) 0%,
          transparent 5%
        ),
        linear-gradient(to top,
          rgba(0,0,0,0.05) 0%,
          transparent 5%
        );
    }
    .sr-story-text {
      font-size: 0.95rem;
    }
  }

  /* ══ Book object ══ */
  .studio-reader-book {
    transition: box-shadow 0.3s ease;
  }

  /* Mobile bookWrapper override */
  @media (max-width: 767px) {
    .sr-book-wrapper {
      width: 94vw !important;
      height: calc(78vh - env(safe-area-inset-bottom, 0px)) !important;
    }
    .sr-spine { display: none !important; }
  }
`;

/* ── Inline styles ── */
const S: Record<string, React.CSSProperties> = {
  root: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    background: 'radial-gradient(ellipse at 50% 40%, #151025 0%, #0a0815 50%, #060510 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-body)',
  },
  loadingScreen: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    background: '#0a0815',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(255,255,255,0.3)',
    fontSize: '0.9rem',
  },
  closeBtn: {
    position: 'fixed',
    top: 16,
    right: 16,
    zIndex: 110,
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  bookWrapper: {
    width: 'min(92vw, 960px)',
    height: 'min(72vh, 600px)',
    position: 'relative',
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
  },
  book: {
    width: '100%',
    height: '100%',
    position: 'relative',
    borderRadius: 4,
    boxShadow: [
      '0 30px 80px rgba(0,0,0,0.6)',
      '0 12px 30px rgba(0,0,0,0.4)',
      '0 4px 10px rgba(0,0,0,0.3)',
      'inset 0 0 0 1px rgba(120,100,60,0.08)',
    ].join(', '),
    overflow: 'hidden',
  },
  spine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 30,
    marginLeft: -15,
    zIndex: 10,
    pointerEvents: 'none' as const,
    background: [
      'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.08) 15%, rgba(0,0,0,0.16) 40%, rgba(0,0,0,0.22) 50%, rgba(0,0,0,0.16) 60%, rgba(0,0,0,0.08) 85%, transparent 100%)',
    ].join(', '),
  },
  pageEdgeLeft: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: -6,
    width: 7,
    borderRadius: '3px 0 0 3px',
    zIndex: 5,
    pointerEvents: 'none' as const,
    background: 'linear-gradient(90deg, rgba(180,165,130,0.15) 0%, rgba(210,195,165,0.35) 30%, rgba(225,215,190,0.5) 60%, rgba(235,225,200,0.25) 100%)',
    boxShadow: '-2px 0 4px rgba(0,0,0,0.08)',
  },
  pageEdgeRight: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    right: -6,
    width: 7,
    borderRadius: '0 3px 3px 0',
    zIndex: 5,
    pointerEvents: 'none' as const,
    background: 'linear-gradient(270deg, rgba(180,165,130,0.15) 0%, rgba(210,195,165,0.35) 30%, rgba(225,215,190,0.5) 60%, rgba(235,225,200,0.25) 100%)',
    boxShadow: '2px 0 4px rgba(0,0,0,0.08)',
  },
  controlBar: {
    position: 'fixed' as const,
    bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 105,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 18px',
    background: 'rgba(12,10,22,0.75)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 999,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  autoBtn: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  dotsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '0 4px',
    maxWidth: 200,
    overflowX: 'auto',
  },
  dot: {
    height: 6,
    borderRadius: 999,
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
    transition: 'width 0.2s, background 0.2s',
  },
  approveBtn: {
    flex: 1,
    padding: '10px 16px',
    fontSize: '0.82rem',
    fontWeight: 600,
    fontFamily: 'var(--font-body)',
    color: '#fff',
    background: 'linear-gradient(135deg, rgba(100,220,140,0.6), rgba(80,180,120,0.5))',
    border: 'none',
    borderRadius: 999,
    cursor: 'pointer',
    minHeight: 44,
  },
  rejectBtn: {
    flex: 1,
    padding: '10px 16px',
    fontSize: '0.82rem',
    fontWeight: 600,
    fontFamily: 'var(--font-body)',
    color: 'rgba(255,100,80,0.85)',
    background: 'rgba(255,100,80,0.08)',
    border: '1px solid rgba(255,100,80,0.2)',
    borderRadius: 999,
    cursor: 'pointer',
    minHeight: 44,
  },
};
