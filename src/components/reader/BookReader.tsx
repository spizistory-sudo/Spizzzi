'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Book, Page } from '@/types/book';
import ReaderControls from './ReaderControls';
import { useAudioController } from './AudioController';
import ShareModal from '../share/ShareModal';
import ReaderSettings from './ReaderSettings';
import { FALLBACK_TRACKS } from '@/lib/music/tracks';
import CoverImage from './CoverImage';
import { MagicReaderBackground } from '../ui/MagicReaderBackground';
import AnimatePromptModal from './AnimatePromptModal';
import AnimationProgress from './AnimationProgress';
import ReaderPanel from './ReaderPanel';

interface BookReaderProps {
  book: Book;
  pages: Page[];
  coverUrl: string | null;
  musicUrl: string | null;
  skipCover?: boolean;
}

// VIEW 0: Cover | VIEW 1..N: Story spreads | VIEW N+1: The End

export default function BookReader({ book, pages: initialPages, coverUrl, musicUrl: initialMusicUrl, skipCover }: BookReaderProps) {
  const router = useRouter();
  const pageTurnAudioRef = useRef<HTMLAudioElement | null>(null);

  // Local pages state — allows force-refresh after edits
  const [pages, setPages] = useState<Page[]>(initialPages);
  const [audioKey, setAudioKey] = useState(0); // increment to force audio reload
  const [view, setView] = useState(skipCover ? 1 : 0); // Skip cover if coming from building screen
  const [pendingView, setPendingView] = useState<number | null>(null); // next view during animation
  const [flipDir, setFlipDir] = useState<'next' | 'prev' | null>(null);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(skipCover || false);
  const [activeMusicUrl, setActiveMusicUrl] = useState(initialMusicUrl);
  const [activeMusicId, setActiveMusicId] = useState<string | null>(null);
  const [isRegeneratingNarration, setIsRegeneratingNarration] = useState(false);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});
  const [dirtyPageIds, setDirtyPageIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 });
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Book-level animation state
  const [showAnimateModal, setShowAnimateModal] = useState(false);
  const [animationJobs, setAnimationJobs] = useState<Array<{ pageId: string; requestId: string; pageNumber: number }>>([]);
  const [animationTotalPages, setAnimationTotalPages] = useState(0);
  const [animationStarted, setAnimationStarted] = useState(false);
  const [animatedVersionReady, setAnimatedVersionReady] = useState(false);
  const [viewMode, setViewMode] = useState<'static' | 'animated'>('static');
  const [pageVideos, setPageVideos] = useState<Record<string, string>>({});
  const [animationJustCompleted, setAnimationJustCompleted] = useState(false);

  // Check animation state on mount
  useEffect(() => {
    // Always pre-populate any completed videos from DB
    const completedVideos: Record<string, string> = {};
    pages.forEach((p) => {
      const pg = p as Page & { video_status?: string; video_url?: string };
      if (pg.video_status === 'complete' && pg.video_url && !pg.video_url.startsWith('fal:')) {
        completedVideos[p.id] = pg.video_url;
      }
    });
    if (Object.keys(completedVideos).length > 0) {
      setPageVideos(completedVideos);
      setAnimatedVersionReady(true);
    }

    const bookMeta = book as Book & { animation_prompted?: boolean; animation_status?: string };
    const hasIllustrations = pages.some((p) => p.illustration_url);
    const alreadyComplete = bookMeta.animation_status === 'complete';
    const alreadyGenerating = bookMeta.animation_status === 'generating';

    if (!bookMeta.animation_prompted && hasIllustrations && !alreadyComplete && !alreadyGenerating) {
      const timer = setTimeout(() => setShowAnimateModal(true), 1500);
      return () => clearTimeout(timer);
    }

    if (alreadyGenerating) {
      // Resume progress tracking for pages still generating
      const generating = pages.filter((p) => {
        const pg = p as Page & { video_status?: string; video_url?: string };
        return pg.video_status === 'generating' && pg.video_url?.startsWith('fal:');
      });
      if (generating.length > 0) {
        const jobs = generating.map((p) => ({
          pageId: p.id,
          requestId: ((p as Page & { video_url?: string }).video_url || '').replace('fal:', ''),
          pageNumber: p.page_number,
        }));
        setAnimationJobs(jobs);
        setAnimationTotalPages(jobs.length);
        setAnimationStarted(true);
      }
    }

    if (alreadyComplete) {
      setAnimatedVersionReady(true);
      const videos: Record<string, string> = {};
      pages.forEach((p) => {
        const pg = p as Page & { video_status?: string; video_url?: string };
        if (pg.video_status === 'complete' && pg.video_url) {
          videos[p.id] = pg.video_url;
        }
      });
      setPageVideos(videos);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize edited texts from pages
  useEffect(() => {
    if (pages) {
      const initial: Record<string, string> = {};
      pages.forEach((p) => { initial[p.id] = p.text_content; });
      setEditedTexts(initial);
    }
  }, [pages]);

  useEffect(() => {
    if (initialMusicUrl) {
      const track = FALLBACK_TRACKS.find((t) => initialMusicUrl.includes(t.storage_url));
      if (track) setActiveMusicId(track.id);
    }
  }, [initialMusicUrl]);

  const COVER = 0;
  const FIRST_STORY = 1;
  const LAST_STORY = pages.length;
  const THE_END = pages.length + 1;
  const LAST_VIEW = THE_END;
  const totalViews = THE_END + 1;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      pageTurnAudioRef.current = new Audio('/sounds/page-turn.mp3');
      pageTurnAudioRef.current.volume = 0.3;
    }
  }, []);

  const storyIdx = view >= FIRST_STORY && view <= LAST_STORY ? view - FIRST_STORY : -1;
  // audioKey appended as cache-buster after edits (forces browser to re-fetch even if URL looks similar)
  const rawNarrationUrl = audioUnlocked && storyIdx >= 0 && storyIdx < pages.length ? pages[storyIdx]?.narration_url || null : null;
  const currentNarrationUrl = rawNarrationUrl && audioKey > 0 ? `${rawNarrationUrl}${rawNarrationUrl.includes('?') ? '&' : '?'}v=${audioKey}` : rawNarrationUrl;

  const handleNarrationEnd = useCallback(() => {
    if (isAutoPlay && view < LAST_VIEW) setTimeout(() => flipTo(view + 1), 800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoPlay, view, LAST_VIEW]);

  const audio = useAudioController({ narrationUrl: currentNarrationUrl, musicUrl: audioUnlocked ? activeMusicUrl : null, isAutoPlay, onNarrationEnd: handleNarrationEnd });

  function playPageTurnSound() {
    if (pageTurnAudioRef.current) { pageTurnAudioRef.current.currentTime = 0; pageTurnAudioRef.current.play().catch(() => {}); }
  }

  // Fix #3: Two-layer flip — set pendingView, animate, then commit
  const flipTo = useCallback((target: number) => {
    if (pendingView !== null || target === view || target < COVER || target > LAST_VIEW) return;
    setFlipDir(target > view ? 'next' : 'prev');
    setPendingView(target);
    playPageTurnSound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, pendingView, LAST_VIEW]);

  // When animation ends, commit the view change
  function handleAnimationEnd() {
    if (pendingView !== null) {
      setView(pendingView);
      setPendingView(null);
      setFlipDir(null);
    }
  }

  const isFlipping = pendingView !== null;
  const nextPage = useCallback(() => { if (view < LAST_VIEW) flipTo(view + 1); }, [view, LAST_VIEW, flipTo]);
  const prevPage = useCallback(() => { if (view > COVER) flipTo(view - 1); }, [view, flipTo]);

  function handleStartReading() { setAudioUnlocked(true); flipTo(FIRST_STORY); setTimeout(() => audio.startPlayback(), 800); }
  function handleMusicChange(trackId: string) { const t = FALLBACK_TRACKS.find((t) => t.id === trackId); if (t) { setActiveMusicId(trackId); setActiveMusicUrl(t.storage_url); } }

  async function handleNarratorChange() {
    setIsRegeneratingNarration(true);
    try { const { useCreationWizard } = await import('@/stores/creation-wizard'); const v = useCreationWizard.getState().selectedVoiceId; if (!v) return; await fetch('/api/generate-narration', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookId: book.id, voiceId: v }) }); router.refresh(); }
    catch (e) { console.error('[reader] Narrator change failed:', e); }
    finally { setIsRegeneratingNarration(false); }
  }

  // Edit mode handlers
  function enterEditMode() {
    audio.stopPlayback();
    setIsEditMode(true);
  }

  function cancelEdit() {
    const original: Record<string, string> = {};
    pages.forEach((p) => { original[p.id] = p.text_content; });
    setEditedTexts(original);
    setDirtyPageIds(new Set());
    setIsEditMode(false);
  }

  function handleTextChange(pageId: string, originalText: string, newText: string) {
    setEditedTexts((prev) => ({ ...prev, [pageId]: newText }));
    if (newText !== originalText) {
      setDirtyPageIds((prev) => new Set(prev).add(pageId));
    } else {
      setDirtyPageIds((prev) => { const next = new Set(prev); next.delete(pageId); return next; });
    }
  }

  async function handleSaveAndRegenerate() {
    setIsSaving(true);
    const changedPages = Array.from(dirtyPageIds).map((pageId) => ({
      pageId,
      text: editedTexts[pageId],
    }));
    setSaveProgress({ current: 0, total: changedPages.length });

    try {
      // 1. Save text changes
      await fetch(`/api/books/${book.id}/edit-pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages: changedPages }),
      });

      // 2. Re-generate narration for changed pages
      const voiceId = (book.metadata as Record<string, string>)?.narrator_voice_id;
      if (voiceId) {
        await fetch('/api/generate-narration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId: book.id, voiceId, pageIds: Array.from(dirtyPageIds) }),
        });
      }
      setSaveProgress({ current: changedPages.length, total: changedPages.length });

      // 3. Re-fetch pages directly from Supabase (full replacement, not merge)
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: freshPages } = await supabase
          .from('pages')
          .select('*')
          .eq('book_id', book.id)
          .order('page_number');

        if (freshPages && freshPages.length > 0) {
          setPages(freshPages as Page[]); // full state replacement

          // Reset editedTexts to match new saved text
          const newTexts: Record<string, string> = {};
          freshPages.forEach((p) => { newTexts[p.id] = (p as Page).text_content; });
          setEditedTexts(newTexts);
        }
      } catch { /* fallback: pages stay as they were in editedTexts */ }

      // 4. Force audio controller to reload with new URLs
      setAudioKey((prev) => prev + 1);

      // 5. Reset edit state
      setDirtyPageIds(new Set());
      setIsEditMode(false);
      setShowSaveModal(false);
      setIsSaving(false);
    } catch (err) {
      console.error('Save failed:', err);
      setIsSaving(false);
    }
  }

  const currentVoiceId = (book.metadata as Record<string, string>)?.narrator_voice_id || null;

  // Animation handlers
  async function handleAcceptAnimate() {
    setShowAnimateModal(false);
    setAnimationStarted(true);
    try {
      const res = await fetch('/api/animate-book', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book.id }),
      });
      const data = await res.json();
      if (data.submissions?.length > 0) {
        setAnimationJobs(data.submissions);
        setAnimationTotalPages(data.totalPages || data.submissions.length);
      }
    } catch (err) {
      console.error('Failed to start animation:', err);
      setAnimationStarted(false);
    }
  }

  async function handleDeclineAnimate() {
    setShowAnimateModal(false);
    fetch(`/api/books/${book.id}/mark-prompted`, { method: 'POST' }).catch(() => {});
  }

  async function handleAllAnimationsComplete() {
    setAnimatedVersionReady(true);
    setAnimationJustCompleted(true);
    setTimeout(() => setAnimationJustCompleted(false), 10000);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: freshPages } = await supabase
        .from('pages').select('*').eq('book_id', book.id).order('page_number');
      if (freshPages) {
        const videos: Record<string, string> = {};
        freshPages.forEach((p) => {
          if ((p as { video_status?: string; video_url?: string }).video_status === 'complete' && (p as { video_url?: string }).video_url) {
            videos[p.id] = (p as { video_url: string }).video_url;
          }
        });
        setPageVideos(videos);
      }
    } catch { /* ignore */ }
  }

  useEffect(() => {
    function kd(e: KeyboardEvent) { if (showSettings || showShareModal) return; if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextPage(); } else if (e.key === 'ArrowLeft') { e.preventDefault(); prevPage(); } else if (e.key === 'Escape') { audio.stopPlayback(); router.back(); } }
    window.addEventListener('keydown', kd); return () => window.removeEventListener('keydown', kd);
  }, [nextPage, prevPage, router, audio, showSettings, showShareModal]);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  function ts(e: React.TouchEvent) { setTouchStart(e.touches[0].clientX); }
  function te(e: React.TouchEvent) { if (touchStart === null) return; const d = touchStart - e.changedTouches[0].clientX; if (Math.abs(d) > 50) { d > 0 ? nextPage() : prevPage(); } setTouchStart(null); }

  const hasNarration = pages.some((p) => p.narration_url);
  const isCover = view === COVER && pendingView === null;

  // ── Page renderers (pure, no overlays) ──

  function renderSpread(v: number) {
    if (v === COVER) {
      return (
        <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', borderRadius: '6px' }}>
          {coverUrl ? (
            <img src={coverUrl} alt="Cover" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(135deg, #7c3aed, #4338ca)' }} />
          )}
          {/* Title overlay at bottom — identical styling to CoverImage component */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0.35) 60%, transparent)',
            padding: '64px 24px 24px',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 'bold', fontFamily: 'Georgia, serif', textAlign: 'center', textShadow: '0 2px 12px rgba(0,0,0,0.5)', marginBottom: '6px', lineHeight: 1.2 }} dir="auto">
              {book.title}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '15px', fontFamily: 'Georgia, serif', textShadow: '0 1px 6px rgba(0,0,0,0.4)' }} dir="auto">
              A story for {book.child_name}
            </p>
          </div>
        </div>
      );
    }

    if (v >= FIRST_STORY && v <= LAST_STORY) {
      const page = pages[v - FIRST_STORY];
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex' }}>
          {/* Left page: text (editable in edit mode) */}
          <div style={{ width: '50%', height: '100%', background: '#faf8f4', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2rem 3rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ textAlign: 'center', position: 'absolute', top: '2rem', left: 0, right: 0 }}>
              <p style={{ fontSize: '12px', color: '#d1d5db', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'Georgia, serif' }}>{book.title}</p>
            </div>
            {/* Edited badge */}
            {isEditMode && dirtyPageIds.has(page.id) && (
              <span style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(245,200,66,0.20)', border: '1px solid rgba(245,200,66,0.50)', color: '#C8860A', fontSize: '0.65rem', fontWeight: 600, padding: '2px 8px', borderRadius: 9999, zIndex: 2 }}>Edited</span>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              {isEditMode ? (
                <textarea
                  value={editedTexts[page.id] ?? page.text_content}
                  onChange={(e) => handleTextChange(page.id, page.text_content, e.target.value)}
                  dir="auto"
                  style={{
                    width: '100%', height: '100%',
                    background: 'transparent', border: 'none',
                    borderBottom: '1px solid rgba(100,80,40,0.30)',
                    outline: 'none', resize: 'none',
                    fontFamily: 'Georgia, serif', fontSize: '20px', lineHeight: 1.8,
                    color: '#1f2937', textAlign: 'center', cursor: 'text', padding: '4px 2px',
                  }}
                  placeholder="Enter story text..."
                />
              ) : (
                <p style={{ color: '#1f2937', fontSize: '20px', lineHeight: 1.8, textAlign: 'center', fontFamily: 'Georgia, serif' }} dir="auto">{page.text_content}</p>
              )}
            </div>
            <div style={{ textAlign: 'center', position: 'absolute', bottom: '1.5rem', left: 0, right: 0 }}>
              <p style={{ fontSize: '12px', color: '#d1d5db' }}>{page.page_number}</p>
            </div>
          </div>
          {/* Right page: illustration or animated video */}
          <div style={{ position: 'relative', width: '50%', height: '100%', overflow: 'hidden' }}>
            {(() => {
              const videoUrl = pageVideos[page.id];
              const showVideo = viewMode === 'animated' && videoUrl;
              if (showVideo) {
                return <video key={videoUrl} src={videoUrl} autoPlay muted loop playsInline style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />;
              }
              return page.illustration_url ? (
                <img src={page.illustration_url} alt={`Page ${page.page_number}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#faf8f4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: '#9ca3af', fontSize: '14px' }}>Illustration unavailable</p>
                </div>
              );
            })()}
          </div>
        </div>
      );
    }

    if (v === THE_END) {
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex' }}>
          <div style={{ width: '50%', height: '100%', background: '#faf8f4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <p style={{ color: '#d1d5db', fontSize: '18px', letterSpacing: '0.3em', marginBottom: '16px' }}>&#10022; &#10022; &#10022;</p>
              <p style={{ fontSize: '40px', fontWeight: 'bold', color: '#7e22ce', fontFamily: 'Georgia, serif', marginBottom: '20px' }}>The End</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ width: '32px', height: '1px', background: '#d8b4fe' }} />
                <span style={{ color: '#d8b4fe', fontSize: '14px' }}>&#10047;</span>
                <div style={{ width: '32px', height: '1px', background: '#d8b4fe' }} />
              </div>
              <p style={{ color: '#6b7280', fontSize: '16px', fontFamily: 'Georgia, serif' }}>A story made just for</p>
              <p style={{ color: '#374151', fontSize: '18px', fontWeight: 600, fontFamily: 'Georgia, serif' }} dir="auto">{book.child_name}</p>
            </div>
          </div>
          <div style={{ width: '50%', height: '100%', background: 'linear-gradient(135deg, #1a1035, #0f0a2a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <p style={{ color: '#c4b5fd', fontSize: '24px', fontWeight: 'bold', fontFamily: 'Georgia, serif', marginBottom: '8px' }}>StoryMagic</p>
              <div style={{ width: '40px', height: '1px', background: 'rgba(139,92,246,0.3)', margin: '12px auto' }} />
              <p style={{ color: 'rgba(167,139,250,0.6)', fontSize: '14px' }}>storymagic.app</p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="fixed inset-0 flex flex-col z-50">
      <MagicReaderBackground />
      {/* Top bar — back button only */}
      <div className="absolute top-0 left-0 z-20 px-4 py-3">
        <button onClick={() => { audio.stopPlayback(); router.push('/create/preview'); }} className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full text-white/60 hover:text-white transition" title="Edit Book">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
        </button>
      </div>

      <ShareModal book={book} isOpen={showShareModal} onClose={() => setShowShareModal(false)} />
      <ReaderSettings isOpen={showSettings} onClose={() => setShowSettings(false)} currentMusicId={activeMusicId} onMusicChange={handleMusicChange} narrationVolume={audio.narrationVolume} musicVolume={audio.musicVolume} onNarrationVolumeChange={audio.setNarrationVolume} onMusicVolumeChange={audio.setMusicVolume} currentVoiceId={currentVoiceId} bookId={book.id} onNarratorChange={handleNarratorChange} isRegeneratingNarration={isRegeneratingNarration} />

      {/* Book area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-[5vw] py-14 md:py-16 relative z-10" onTouchStart={ts} onTouchEnd={te} style={{ perspective: '2000px' }}>

        {/* Book shell */}
        <div
          className={`relative overflow-hidden transition-[max-width] duration-500 ease-in-out ${isCover ? 'w-full max-w-[480px] rounded-md' : 'w-full max-w-[1200px]'} h-full max-h-[75vh]`}
          style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 10px 25px rgba(0,0,0,0.3)' }}
        >
          {/* Fix #3: Layer 1 — next spread (underneath, always rendered during flip) */}
          {pendingView !== null && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
              {renderSpread(pendingView)}
            </div>
          )}

          {/* Layer 2 — current spread (always absolute to fill book shell) */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: pendingView !== null ? 2 : 1,
              willChange: pendingView !== null ? 'transform' : 'auto',
              transformOrigin: flipDir === 'next' ? 'left center' : 'right center',
            }}
            className={flipDir === 'next' && pendingView !== null ? 'page-turn-next' : flipDir === 'prev' && pendingView !== null ? 'page-turn-prev' : ''}
            onAnimationEnd={handleAnimationEnd}
          >
            {renderSpread(view)}
          </div>

          {/* Spine: 1px line, only on spread views, no shadow */}
          {!isCover && pendingView === null && (
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: '1px', background: 'rgba(0,0,0,0.05)', pointerEvents: 'none', zIndex: 3 }} />
          )}
        </div>

        {isCover && (
          <button onClick={handleStartReading} className="mt-6 px-8 py-3.5 bg-purple-600 text-white rounded-2xl font-semibold hover:bg-purple-700 transition shadow-lg shadow-purple-900/30 text-base">
            Start Reading
          </button>
        )}
      </div>

      {/* Edit mode banner */}
      {isEditMode && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(245,200,66,0.12)', borderBottom: '1px solid rgba(245,200,66,0.25)', color: 'rgba(245,200,66,0.90)', textAlign: 'center', padding: 8, fontSize: '0.80rem', fontWeight: 500, zIndex: 50, backdropFilter: 'blur(8px)', letterSpacing: '0.05em' }}>
          &#9998; EDIT MODE — Click any page text to edit. Navigate between pages normally. Click &ldquo;Save Changes&rdquo; when done.
        </div>
      )}

      {/* Right control panel — Edit, Animation, Share, Settings */}
      {!isCover && (
        <ReaderPanel
          isEditMode={isEditMode}
          onToggleEdit={() => {
            if (isEditMode) {
              cancelEdit();
            } else {
              enterEditMode();
            }
          }}
          dirtyPageCount={dirtyPageIds.size}
          onSave={() => { if (dirtyPageIds.size === 0) { setIsEditMode(false); return; } setShowSaveModal(true); }}
          onCancelEdit={cancelEdit}
          animatedVersionReady={animatedVersionReady}
          animationStarted={animationStarted}
          viewMode={viewMode}
          onSetViewMode={setViewMode}
          onStartAnimation={handleAcceptAnimate}
          animationJustCompleted={animationJustCompleted}
          onShare={() => setShowShareModal(true)}
          onSettings={() => setShowSettings(true)}
        />
      )}

      {/* Bottom bar — playback controls only */}
      {!isCover && (
        <div className="pb-3 px-4 md:px-8 relative z-10" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <ReaderControls currentPage={view} totalPages={totalViews} onPrev={prevPage} onNext={nextPage} onClose={() => { audio.stopPlayback(); router.back(); }} isPlaying={!isEditMode && audio.isPlaying} onTogglePlay={isEditMode ? undefined : audio.togglePlayPause} hasAudio={!isEditMode && hasNarration} isAutoPlay={isAutoPlay} onToggleAutoPlay={() => setIsAutoPlay(!isAutoPlay)} />
        </div>
      )}

      {/* Animate prompt modal */}
      {showAnimateModal && (
        <AnimatePromptModal
          bookTitle={book.title}
          pageCount={pages.filter((p) => p.illustration_url).length}
          onAccept={handleAcceptAnimate}
          onDecline={handleDeclineAnimate}
        />
      )}

      {/* Animation progress — polling only, no UI (panel shows state) */}
      {animationStarted && animationJobs.length > 0 && (
        <AnimationProgress
          bookId={book.id}
          jobs={animationJobs}
          totalPages={animationTotalPages || animationJobs.length}
          onAllComplete={handleAllAnimationsComplete}
          onShowAnimateButton={() => setViewMode('animated')}
          renderUI={false}
        />
      )}

      {/* Save confirmation modal */}
      {showSaveModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'rgba(15,20,45,0.92)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 24, padding: '40px 48px', maxWidth: 440, width: '90%', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.50)' }}>
            {!isSaving ? (
              <>
                <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>&#9998;&#65039;</div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'white', marginBottom: 10 }}>Save your changes?</h2>
                <p style={{ color: 'rgba(255,255,255,0.60)', marginBottom: 8, lineHeight: 1.6 }}>
                  You edited <strong style={{ color: 'white' }}>{dirtyPageIds.size} {dirtyPageIds.size === 1 ? 'page' : 'pages'}</strong>.
                </p>
                <p style={{ color: 'rgba(255,255,255,0.50)', fontSize: '0.85rem', marginBottom: 32 }}>
                  We&apos;ll re-generate the narration audio for changed pages. This takes about {dirtyPageIds.size * 5}&ndash;{dirtyPageIds.size * 10} seconds.
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <button onClick={() => setShowSaveModal(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.20)', color: 'rgba(255,255,255,0.65)', borderRadius: 9999, padding: '11px 28px', cursor: 'pointer', fontSize: '0.9rem' }}>Go back</button>
                  <button onClick={handleSaveAndRegenerate} style={{ background: 'linear-gradient(135deg, rgba(155,125,212,0.85), rgba(126,200,227,0.75))', border: '1px solid rgba(255,255,255,0.20)', color: 'white', borderRadius: 9999, padding: '11px 32px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 4px 20px rgba(155,125,212,0.35)' }}>Save &amp; Re-generate</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '2.5rem', marginBottom: 16, animation: 'gentleFloat 2s ease-in-out infinite' }}>&#127908;</div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'white', marginBottom: 10 }}>Re-generating narration&hellip;</h2>
                <p style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 24, fontSize: '0.88rem' }}>{saveProgress.current} of {saveProgress.total} pages done</p>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.10)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${saveProgress.total > 0 ? (saveProgress.current / saveProgress.total) * 100 : 0}%`, background: 'linear-gradient(90deg, rgba(155,125,212,1), rgba(126,200,227,1))', borderRadius: 99, transition: 'width 0.5s ease', boxShadow: '0 0 10px rgba(126,200,227,0.5)' }} />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Fix #2: Page-curl animation — only the right half peels away */}
      <style jsx global>{`
        @keyframes pageTurnNext {
          0%   { transform: rotateY(0deg); }
          100% { transform: rotateY(-180deg); }
        }
        @keyframes pageTurnPrev {
          0%   { transform: rotateY(0deg); }
          100% { transform: rotateY(180deg); }
        }
        @keyframes shadowPulse {
          0%   { box-shadow: 0 25px 60px rgba(0,0,0,0.5), 0 10px 25px rgba(0,0,0,0.3); }
          50%  { box-shadow: -15px 25px 70px rgba(0,0,0,0.6), 5px 10px 30px rgba(0,0,0,0.35); }
          100% { box-shadow: 0 25px 60px rgba(0,0,0,0.5), 0 10px 25px rgba(0,0,0,0.3); }
        }
        .page-turn-next {
          animation: pageTurnNext 700ms cubic-bezier(0.645, 0.045, 0.355, 1.000) forwards,
                     shadowPulse 700ms ease-in-out;
          transform-origin: left center;
          backface-visibility: hidden;
        }
        .page-turn-prev {
          animation: pageTurnPrev 700ms cubic-bezier(0.645, 0.045, 0.355, 1.000) forwards,
                     shadowPulse 700ms ease-in-out;
          transform-origin: right center;
          backface-visibility: hidden;
        }
        @keyframes goldPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(245,200,66,0.20); }
          50% { box-shadow: 0 0 28px rgba(245,200,66,0.45); }
        }
      `}</style>
    </div>
  );
}
