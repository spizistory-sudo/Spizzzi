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

/* ── Reusable ornaments ── */

function LeafOrnament() {
  return (
    <svg width="28" height="16" viewBox="0 0 28 16" fill="none" style={{ display: 'block', margin: '0 auto', opacity: 0.45 }}>
      <path d="M14 2c-3 0-6 2-8 5 2.5-1 5-1.2 8 .5 3-.7 5.5-.5 8-.5-2-3-5-5-8-5z" fill="rgba(175,145,75,0.5)"/>
      <path d="M14 8c-3 1.7-6 1.5-8 .5C8 11 11 13 14 14c3-1 6-3 8-5.5-2.5 1-5 1.2-8-.5z" fill="rgba(175,145,75,0.35)"/>
      <line x1="14" y1="2" x2="14" y2="14" stroke="rgba(175,145,75,0.3)" strokeWidth="0.5"/>
    </svg>
  );
}

function Flourish() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      <div style={{ width: 24, height: 1, background: 'linear-gradient(90deg, transparent, rgba(175,145,75,0.3))' }} />
      <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(175,145,75,0.35)' }} />
      <div style={{ width: 24, height: 1, background: 'linear-gradient(270deg, transparent, rgba(175,145,75,0.3))' }} />
    </div>
  );
}

function TextDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, margin: '16px 0' }}>
      <div style={{ width: 18, height: 1, background: 'linear-gradient(90deg, transparent, rgba(175,145,75,0.22))' }} />
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ opacity: 0.35 }}>
        <path d="M4 0.5L5.5 3H7.5L6 4.5L6.5 7L4 5.8L1.5 7L2 4.5L0.5 3H2.5L4 0.5Z" fill="rgba(175,145,75,1)"/>
      </svg>
      <div style={{ width: 18, height: 1, background: 'linear-gradient(270deg, transparent, rgba(175,145,75,0.22))' }} />
    </div>
  );
}

function PageNum({ n }: { n: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ opacity: 0.3 }}>
        <path d="M9 3H2M2 3L4.5 0.8M2 3L4.5 5.2" stroke="rgba(150,125,65,1)" strokeWidth="0.7" strokeLinecap="round"/>
      </svg>
      <span style={{ fontSize: '0.68rem', color: 'rgba(140,115,60,0.4)', fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', letterSpacing: '0.05em' }}>
        {n}
      </span>
      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ opacity: 0.3, transform: 'scaleX(-1)' }}>
        <path d="M9 3H2M2 3L4.5 0.8M2 3L4.5 5.2" stroke="rgba(150,125,65,1)" strokeWidth="0.7" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

function splitTextBlocks(text: string): string[] {
  const sentences = text.replace(/([.!?])\s+/g, '$1\n').split('\n').filter(s => s.trim());
  if (sentences.length <= 1) return [text];
  if (sentences.length <= 3) {
    const mid = Math.ceil(sentences.length / 2);
    return [sentences.slice(0, mid).join(' '), sentences.slice(mid).join(' ')];
  }
  const third = Math.ceil(sentences.length / 3);
  return [
    sentences.slice(0, third).join(' '),
    sentences.slice(third, third * 2).join(' '),
    sentences.slice(third * 2).join(' '),
  ].filter(s => s.trim());
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

  if (loading) return <div className="sr-loading">Loading...</div>;
  if (!book || !book.story) return <div className="sr-loading">Book not found or has no story.</div>;

  const title = getTitle(book);
  const coverUrl = getCoverImage(book.images);
  const canReview = book.status === 'ready' && !book.review_verdict;

  // Chapter book fallback
  if (isChapterBook(book)) {
    return <ChapterFallback book={book} title={title} onClose={() => router.push(`/studio/book/${id}`)} />;
  }

  return (
    <div className="sr-root" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <style>{READER_CSS}</style>

      {/* Close button */}
      <button onClick={() => router.push(`/studio/book/${id}`)} className="sr-close" aria-label="Close reader">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>

      {/* Book case */}
      <div className="sr-book-case">
        {/* Spine crease */}
        <div className="sr-spine" />

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

      {/* Controls */}
      <div className="sr-controls">
        <button
          onClick={goPrev}
          disabled={currentView === 0 || transitioning}
          className="sr-nav-btn"
          style={{ opacity: currentView === 0 ? 0.25 : 1 }}
          aria-label="Previous page"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>

        <button
          onClick={() => setAutoPlay(!autoPlay)}
          className="sr-auto-btn"
          style={{ background: autoPlay ? 'rgba(155,125,212,0.25)' : 'rgba(255,255,255,0.06)' }}
          aria-label={autoPlay ? 'Stop auto-play' : 'Auto-play'}
        >
          {autoPlay ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>

        {/* Page dots */}
        <div className="sr-dots">
          {Array.from({ length: totalViews }).map((_, i) => (
            <button
              key={i}
              onClick={() => { if (i !== currentView) goTo(i, i > currentView ? 'next' : 'prev'); }}
              className="sr-dot"
              style={{
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
          className="sr-nav-btn"
          style={{ opacity: isLastPage ? 0.25 : 1 }}
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
        <div className="sr-keyline">
          <div className="sr-text-compose">
            <LeafOrnament />
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: '0.58rem', fontWeight: 600, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(150,125,65,0.5)' }}>
                A Spizzzy Book
              </div>
            </div>
            <div style={{ marginTop: 16 }}><Flourish /></div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 4vw, 2.4rem)', fontWeight: 600, color: 'rgba(48,32,10,0.88)', lineHeight: 1.15, margin: '20px 0 0', maxWidth: 320, textAlign: 'center' }}>
              {title}
            </h1>
            <div style={{ marginTop: 20 }}><Flourish /></div>
            <div style={{ fontSize: '0.64rem', color: 'rgba(150,125,65,0.42)', letterSpacing: '0.12em', fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', marginTop: 16 }}>
              Ages {ageBand}
            </div>
          </div>
        </div>
      </div>
      {/* Right page: cover image */}
      <div className="sr-page sr-page-right">
        {coverUrl ? (
          <img src={coverUrl} alt="Cover illustration" className="sr-page-img" />
        ) : (
          <div className="sr-img-placeholder">
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
  const blocks = splitTextBlocks(page.text);
  return (
    <div className="sr-spread">
      {/* Left page: text */}
      <div className="sr-page sr-page-left sr-paper">
        <div className="sr-keyline">
          <div className="sr-text-compose">
            <LeafOrnament />
            <div className="sr-text-body">
              {blocks.map((block, i) => (
                <div key={i}>
                  {i > 0 && <TextDivider />}
                  <p className="sr-story-text">{block}</p>
                </div>
              ))}
            </div>
            <PageNum n={pageNumber} />
          </div>
        </div>
      </div>
      {/* Right page: illustration */}
      <div className="sr-page sr-page-right">
        {imageUrl ? (
          <img src={imageUrl} alt={`Illustration for page ${pageNumber}`} className="sr-page-img" />
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
    <div className="sr-img-placeholder">
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
        <div className="sr-keyline">
          <div className="sr-text-compose">
            <LeafOrnament />
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: '0.58rem', fontWeight: 600, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(150,125,65,0.45)' }}>
                The End
              </div>
            </div>
            <div style={{ marginTop: 16 }}><Flourish /></div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 600, color: 'rgba(48,32,10,0.7)', lineHeight: 1.2, maxWidth: 280, textAlign: 'center', marginTop: 20 }}>
              {title}
            </div>
            <div style={{ marginTop: 20 }}><Flourish /></div>
            <div style={{ fontSize: '0.58rem', color: 'rgba(150,125,65,0.35)', marginTop: 16, letterSpacing: '0.18em', fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic' }}>
              A Spizzzy Book
            </div>
          </div>
        </div>
      </div>
      <div className="sr-page sr-page-right sr-review-page">
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
                className="sr-review-textarea"
              />
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button onClick={onApprove} disabled={reviewing} className="sr-approve-btn">
                  {reviewing ? '...' : 'Approve'}
                </button>
                <button onClick={onReject} disabled={reviewing} className="sr-reject-btn">
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
    <div className="sr-root" style={{ overflow: 'auto' }}>
      <style>{READER_CSS}</style>
      <button onClick={onClose} className="sr-close" aria-label="Close reader">
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

/* ═══════════════════════════════════════════════════════════════
   CSS — all styling lives here
   ═══════════════════════════════════════════════════════════════ */
const READER_CSS = `
  /* ══ Root & loading ══ */
  .sr-root {
    position: fixed; inset: 0; z-index: 100;
    background: radial-gradient(ellipse at 50% 45%, #151020 0%, #0b0912 55%, #060510 100%);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    font-family: var(--font-body);
  }
  .sr-loading {
    position: fixed; inset: 0; z-index: 100;
    background: #0a0815;
    display: flex; align-items: center; justify-content: center;
    color: rgba(255,255,255,0.3); font-size: 0.9rem;
  }

  /* ══ Close button ══ */
  .sr-close {
    position: fixed; top: 16px; right: 16px; z-index: 110;
    width: 40px; height: 40px; border-radius: 50%;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.55);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
  }

  /* ══ Book case — the dark hardcover shell ══ */
  .sr-book-case {
    width: min(92vw, 980px);
    height: min(72vh, 600px);
    position: relative;
    background: linear-gradient(170deg, #2a2a2e 0%, #1c1c20 40%, #141416 100%);
    border-radius: 12px;
    padding: 10px;
    box-shadow:
      0 40px 100px rgba(0,0,0,0.6),
      0 15px 40px rgba(0,0,0,0.45),
      0 4px 12px rgba(0,0,0,0.35),
      inset 0 1px 0 rgba(255,255,255,0.04),
      inset 0 -1px 0 rgba(0,0,0,0.3);
  }
  /* Subtle leather/cloth grain on the case */
  .sr-book-case::before {
    content: "";
    position: absolute; inset: 0;
    border-radius: 12px;
    pointer-events: none;
    opacity: 0.12;
    background-image:
      repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 3px),
      repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(255,255,255,0.02) 3px, rgba(255,255,255,0.02) 4px);
  }

  /* ══ Spine crease — down the center gutter ══ */
  .sr-spine {
    position: absolute;
    top: 10px; bottom: 10px;
    left: 50%; width: 24px; margin-left: -12px;
    z-index: 10; pointer-events: none;
    background:
      linear-gradient(90deg,
        transparent 0%,
        rgba(0,0,0,0.06) 20%,
        rgba(0,0,0,0.15) 42%,
        rgba(0,0,0,0.22) 50%,
        rgba(0,0,0,0.15) 58%,
        rgba(0,0,0,0.06) 80%,
        transparent 100%
      );
  }

  /* ══ Page content area ══ */
  .sr-page-content {
    width: 100%; height: 100%;
    overflow: hidden;
    position: relative;
    border-radius: 6px;
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
  /* Left page inner radius */
  .sr-page-left { border-radius: 6px 0 0 6px; }
  /* Right page inner radius + outer corner of case */
  .sr-page-right { border-radius: 0 6px 6px 0; }

  /* ══ Paper — clean warm ivory with delicate grain ══ */
  .sr-paper {
    background-color: #f5eeda;
    background-image:
      /* Very fine fiber — barely visible */
      repeating-linear-gradient(
        0deg, transparent, transparent 40px,
        rgba(170,145,90,0.015) 40px, rgba(170,145,90,0.015) 41px
      ),
      repeating-linear-gradient(
        90deg, transparent, transparent 55px,
        rgba(170,145,90,0.01) 55px, rgba(170,145,90,0.01) 56px
      ),
      /* Smooth warm fill */
      linear-gradient(175deg, #f7f0de 0%, #f5ecd6 50%, #f2e8cf 100%);
  }

  /* Gutter shadow on left page (toward spine) */
  .sr-page-left::after {
    content: "";
    position: absolute; inset: 0;
    pointer-events: none; z-index: 3;
    border-radius: 6px 0 0 6px;
    background:
      linear-gradient(to left,
        rgba(90,65,25,0.09) 0%, rgba(90,65,25,0.03) 6%, transparent 16%);
  }

  /* Gutter shadow on right page (toward spine) */
  .sr-page-right::after {
    content: "";
    position: absolute; inset: 0;
    pointer-events: none; z-index: 4;
    border-radius: 0 6px 6px 0;
    background:
      linear-gradient(to right,
        rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.05) 4%, transparent 14%);
  }

  /* ══ Gold keyline border ══ */
  .sr-keyline {
    position: absolute;
    inset: 18px;
    border: 1px solid rgba(185,155,80,0.18);
    border-radius: 3px;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* ══ Text composition — centered typographic block ══ */
  .sr-text-compose {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 24px 20px;
    max-width: 100%;
    max-height: 100%;
    overflow-y: auto;
  }
  .sr-text-body {
    margin: 16px 0;
    max-width: 340px;
  }

  /* ══ Story text — large, elegant, centered ══ */
  .sr-story-text {
    font-family: 'Lora', Georgia, 'Times New Roman', serif;
    font-size: clamp(1.05rem, 2.4vw, 1.5rem);
    line-height: 1.75;
    color: rgba(42,30,10,0.82);
    margin: 0;
    text-align: center;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    letter-spacing: 0.008em;
    hyphens: none;
  }

  /* ══ Image page ══ */
  .sr-page-img {
    width: 100%; height: 100%;
    object-fit: cover; display: block;
    position: relative; z-index: 1;
  }
  .sr-img-placeholder {
    width: 100%; height: 100%;
    background: linear-gradient(145deg, rgba(30,25,50,0.95), rgba(20,18,35,0.95));
    display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 8px;
  }

  /* ══ Review page (right side on end view) ══ */
  .sr-review-page {
    background: linear-gradient(170deg, #141028, #0d0a1e) !important;
    border-radius: 0 6px 6px 0;
  }
  .sr-review-page::after { display: none !important; }
  .sr-review-textarea {
    width: 100%; box-sizing: border-box;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px; padding: 10px 12px;
    color: rgba(255,255,255,0.75); font-size: 0.82rem;
    font-family: var(--font-body);
    resize: vertical; min-height: 60px; outline: none;
  }
  .sr-approve-btn {
    flex: 1; padding: 10px 16px;
    font-size: 0.82rem; font-weight: 600;
    font-family: var(--font-body); color: #fff;
    background: linear-gradient(135deg, rgba(100,220,140,0.6), rgba(80,180,120,0.5));
    border: none; border-radius: 999px; cursor: pointer; min-height: 44px;
  }
  .sr-reject-btn {
    flex: 1; padding: 10px 16px;
    font-size: 0.82rem; font-weight: 600;
    font-family: var(--font-body);
    color: rgba(255,100,80,0.85);
    background: rgba(255,100,80,0.08);
    border: 1px solid rgba(255,100,80,0.2);
    border-radius: 999px; cursor: pointer; min-height: 44px;
  }

  /* ══ Controls bar ══ */
  .sr-controls {
    position: fixed;
    bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    left: 50%; transform: translateX(-50%);
    z-index: 105;
    display: flex; align-items: center; gap: 12px;
    padding: 10px 18px;
    background: rgba(12,10,22,0.75);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 999px;
  }
  .sr-nav-btn {
    width: 38px; height: 38px; border-radius: 50%;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.7);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; flex-shrink: 0;
  }
  .sr-auto-btn {
    width: 32px; height: 32px; border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.55);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; flex-shrink: 0;
  }
  .sr-dots {
    display: flex; align-items: center; gap: 5px;
    padding: 0 4px; max-width: 200px; overflow-x: auto;
  }
  .sr-dot {
    height: 6px; border-radius: 999px; border: none;
    cursor: pointer; padding: 0; flex-shrink: 0;
    transition: width 0.2s, background 0.2s;
  }

  /* ══ Page-turn transitions ══ */
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

  /* ══ Mobile ══ */
  @media (max-width: 767px) {
    .sr-book-case {
      width: 94vw;
      height: calc(78vh - env(safe-area-inset-bottom, 0px));
      padding: 6px;
      border-radius: 10px;
    }
    .sr-spread {
      flex-direction: column-reverse;
    }
    .sr-page { flex: none; }
    .sr-page-right {
      height: 48%;
      border-radius: 6px 6px 0 0;
    }
    .sr-page-left {
      height: 52%;
      border-radius: 0 0 6px 6px;
    }
    .sr-page-left::after {
      border-radius: 0 0 6px 6px;
      background: none;
    }
    .sr-page-right::after {
      border-radius: 6px 6px 0 0;
      background: linear-gradient(to top, rgba(0,0,0,0.06) 0%, transparent 8%);
    }
    .sr-spine { display: none; }
    .sr-keyline { inset: 12px; }
    .sr-story-text {
      font-size: clamp(0.95rem, 4vw, 1.2rem);
    }
    .sr-text-body { max-width: 90%; }
  }
`;
