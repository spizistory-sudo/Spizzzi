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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(120,100,70,0.5)', marginBottom: 8 }}>
            A Spizzzy Book
          </div>
          <div style={{ width: 40, height: 1, background: 'rgba(120,100,70,0.18)', marginBottom: 24 }} />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem, 3.5vw, 2.2rem)', fontWeight: 600, color: 'rgba(60,45,25,0.88)', lineHeight: 1.15, margin: '0 0 16px', maxWidth: 320 }}>
            {title}
          </h1>
          <div style={{ width: 40, height: 1, background: 'rgba(120,100,70,0.18)', marginTop: 8, marginBottom: 16 }} />
          <div style={{ fontSize: '0.72rem', color: 'rgba(120,100,70,0.45)', letterSpacing: '0.08em' }}>
            Ages {ageBand}
          </div>
        </div>
      </div>
      {/* Right page: cover image */}
      <div className="sr-page sr-page-right">
        {coverUrl ? (
          <img src={coverUrl} alt="Cover illustration" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '32px 28px 24px' }}>
          {/* Small page header on first spread */}
          {pageNumber === 1 && (
            <div style={{ textAlign: 'center', marginBottom: 16, flexShrink: 0 }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(120,100,70,0.4)' }}>
                {page.title || 'Chapter One'}
              </div>
              <div style={{ width: 24, height: 1, background: 'rgba(120,100,70,0.15)', margin: '8px auto 0' }} />
            </div>
          )}
          {/* Story text */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
            <p className="sr-story-text">
              {page.text}
            </p>
          </div>
          {/* Page number */}
          <div style={{ textAlign: 'center', flexShrink: 0, paddingTop: 8 }}>
            <span style={{ fontSize: '0.68rem', color: 'rgba(120,100,70,0.35)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
              {pageNumber}
            </span>
          </div>
        </div>
      </div>
      {/* Right page: illustration */}
      <div className="sr-page sr-page-right">
        {imageUrl ? (
          <img src={imageUrl} alt={`Illustration for page ${pageNumber}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(120,100,70,0.4)', marginBottom: 12 }}>
            The End
          </div>
          <div style={{ width: 24, height: 1, background: 'rgba(120,100,70,0.15)', marginBottom: 20 }} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 600, color: 'rgba(60,45,25,0.75)', lineHeight: 1.2, maxWidth: 280 }}>
            {title}
          </div>
          <div style={{ width: 24, height: 1, background: 'rgba(120,100,70,0.15)', marginTop: 20 }} />
          <div style={{ fontSize: '0.62rem', color: 'rgba(120,100,70,0.35)', marginTop: 12, letterSpacing: '0.12em' }}>
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
    border-radius: 6px;
    overflow: hidden;
  }

  /* -- Spread layout -- */
  .sr-spread {
    display: flex;
    width: 100%; height: 100%;
  }
  .sr-page {
    flex: 1; min-width: 0;
    overflow: hidden;
    position: relative;
  }
  .sr-page-left { border-right: 1px solid rgba(120,100,70,0.08); }

  /* Paper texture */
  .sr-paper {
    background:
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 28px,
        rgba(120,100,70,0.018) 28px,
        rgba(120,100,70,0.018) 29px
      ),
      linear-gradient(168deg,
        #faf6ee 0%,
        #f7f2e8 30%,
        #f4edd9 70%,
        #f0e9d2 100%
      );
  }

  /* Story text */
  .sr-story-text {
    font-family: 'Lora', Georgia, serif;
    font-size: clamp(0.82rem, 1.8vw, 1.05rem);
    line-height: 1.72;
    color: rgba(50,38,20,0.82);
    margin: 0;
    hyphens: auto;
    overflow-wrap: break-word;
  }

  /* -- Mobile: single-page stack -- */
  @media (max-width: 767px) {
    .sr-spread {
      flex-direction: column-reverse;
    }
    .sr-page {
      flex: none;
    }
    .sr-page-right {
      height: 45%;
    }
    .sr-page-left {
      height: 55%;
      border-right: none;
      border-top: 1px solid rgba(120,100,70,0.08);
    }
    .sr-story-text {
      font-size: 0.92rem;
    }
  }

  .studio-reader-book {
    transition: box-shadow 0.3s ease;
  }

  /* Mobile bookWrapper override */
  @media (max-width: 767px) {
    .sr-book-wrapper {
      width: 94vw !important;
      height: calc(80vh - env(safe-area-inset-bottom, 0px)) !important;
    }
    .sr-spine { display: none !important; }
    .sr-edge-l, .sr-edge-r { display: none !important; }
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
  },
  book: {
    width: '100%',
    height: '100%',
    position: 'relative',
    borderRadius: 6,
    boxShadow: '0 20px 60px rgba(0,0,0,0.55), 0 6px 20px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.03)',
    overflow: 'hidden',
  },
  spine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 20,
    marginLeft: -10,
    zIndex: 10,
    pointerEvents: 'none' as const,
    background: 'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.12) 35%, rgba(0,0,0,0.18) 50%, rgba(0,0,0,0.12) 65%, rgba(0,0,0,0) 100%)',
  },
  pageEdgeLeft: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: -3,
    width: 4,
    borderRadius: '2px 0 0 2px',
    background: 'linear-gradient(90deg, rgba(200,190,170,0.12), rgba(200,190,170,0.04))',
    zIndex: 5,
    pointerEvents: 'none' as const,
  },
  pageEdgeRight: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    right: -3,
    width: 4,
    borderRadius: '0 2px 2px 0',
    background: 'linear-gradient(270deg, rgba(200,190,170,0.12), rgba(200,190,170,0.04))',
    zIndex: 5,
    pointerEvents: 'none' as const,
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
