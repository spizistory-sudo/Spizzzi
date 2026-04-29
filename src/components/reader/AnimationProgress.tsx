'use client';

import { useEffect, useRef, useState } from 'react';

interface PageJob {
  pageId: string;
  requestId: string;
  pageNumber: number;
}

interface Props {
  bookId: string;
  jobs: PageJob[];
  totalPages: number;
  onAllComplete: () => void;
  onShowAnimateButton: () => void;
  renderUI?: boolean;
  onRetry?: () => void;
}

const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export default function AnimationProgress({ bookId, jobs, totalPages, onAllComplete, onShowAnimateButton, renderUI = true, onRetry }: Props) {
  const [completedCount, setCompletedCount] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const completedIds = useRef<Set<string>>(new Set());
  const pollIntervals = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    if (jobs.length === 0) return;

    const startedAt = startedAtRef.current;

    // Global timeout — stop all polling after 5 minutes
    const timeoutTimer = setTimeout(() => {
      console.warn('[AnimationProgress] Global timeout reached (5 min)');
      Object.values(pollIntervals.current).forEach(clearInterval);
      setIsTimedOut(true);
    }, TIMEOUT_MS);

    jobs.forEach((job) => {
      pollIntervals.current[job.pageId] = setInterval(async () => {
        // Client-side check — stop polling if timed out
        if (Date.now() - startedAt > TIMEOUT_MS) {
          clearInterval(pollIntervals.current[job.pageId]);
          return;
        }

        try {
          const res = await fetch(
            `/api/animate-page/status?pageId=${job.pageId}&requestId=${job.requestId}&bookId=${bookId}&startedAt=${startedAt}`
          );
          const data = await res.json();

          if (data.status === 'complete' || data.status === 'not_found' || data.status === 'error' || data.status === 'timeout') {
            clearInterval(pollIntervals.current[job.pageId]);

            if (data.status === 'timeout') {
              setIsTimedOut(true);
              Object.values(pollIntervals.current).forEach(clearInterval);
              return;
            }

            if (!completedIds.current.has(job.pageId)) {
              completedIds.current.add(job.pageId);
              setCompletedCount((prev) => {
                const newCount = prev + 1;
                if (newCount >= jobs.length || newCount >= totalPages) {
                  setTimeout(() => {
                    setIsDone(true);
                    playBling();
                    onAllComplete();
                  }, 500);
                }
                return newCount;
              });
            }
          }
        } catch (err) {
          console.error('[AnimationProgress] Poll error:', err);
        }
      }, 10000);
    });

    return () => {
      clearTimeout(timeoutTimer);
      Object.values(pollIntervals.current).forEach(clearInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs]);

  function playBling() {
    try {
      const audio = new Audio('/sounds/bling.mp3');
      audio.volume = 0.6;
      audio.play().catch(() => {});
    } catch { /* ignore */ }
  }

  const progress = totalPages > 0 ? (completedCount / totalPages) * 100 : 0;

  if (!renderUI || !isVisible) return null;

  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 150, transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', pointerEvents: 'auto',
    }}>
      {isTimedOut ? (
        <div style={{
          background: 'rgba(10,15,40,0.92)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(220,50,50,0.40)', borderRadius: 16,
          padding: '14px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.30)', minWidth: 280, maxWidth: 360,
        }}>
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,150,150,0.95)', fontFamily: 'var(--font-body)', textAlign: 'center', lineHeight: 1.5 }}>
            שירות האנימציה לא זמין כרגע. נסו שוב בעוד רגע.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {onRetry && (
              <button onClick={onRetry} style={{
                background: 'linear-gradient(135deg, rgba(155,125,212,0.80), rgba(126,200,227,0.70))',
                border: '1px solid rgba(255,255,255,0.20)',
                color: 'white', borderRadius: 9999, padding: '7px 18px',
                fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 2px 12px rgba(155,125,212,0.35)',
              }}>
                נסו שוב
              </button>
            )}
            <button onClick={() => setIsVisible(false)} style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.50)', borderRadius: 9999, padding: '7px 16px',
              fontSize: '0.82rem', cursor: 'pointer',
            }}>
              סגירה
            </button>
          </div>
        </div>
      ) : !isDone ? (
        <div style={{
          background: 'rgba(10,15,40,0.88)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9999,
          padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.30)', minWidth: 260,
        }}>
          <div style={{
            width: 16, height: 16,
            border: '2px solid rgba(126,200,227,0.30)', borderTop: '2px solid rgba(126,200,227,0.90)',
            borderRadius: '50%', animation: 'spin 1.2s linear infinite', flexShrink: 0,
          }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.70)', marginBottom: 5, fontFamily: 'var(--font-body)' }}>
              מנפשים את הספר... {completedCount} מתוך {totalPages} עמודים
            </div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.10)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${progress}%`,
                background: 'linear-gradient(90deg, rgba(155,125,212,1), rgba(126,200,227,1))',
                borderRadius: 99, transition: 'width 0.8s ease',
                boxShadow: '0 0 8px rgba(126,200,227,0.5)',
              }} />
            </div>
          </div>
          <button onClick={() => setIsVisible(false)} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.30)',
            cursor: 'pointer', fontSize: '1rem', padding: '0 0 0 4px', flexShrink: 0,
          }}>
            &times;
          </button>
        </div>
      ) : (
        <div onClick={onShowAnimateButton} style={{
          background: 'linear-gradient(135deg, rgba(200,134,10,0.30), rgba(245,200,66,0.20))',
          backdropFilter: 'blur(16px)', border: '1px solid rgba(245,200,66,0.50)',
          borderRadius: 9999, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 0 32px rgba(245,200,66,0.25), 0 8px 32px rgba(0,0,0,0.30)',
          cursor: 'pointer', fontFamily: 'var(--font-body)',
        }}>
          <span style={{ fontSize: '1.2rem' }}>&#10024;</span>
          <span style={{ color: '#F5C842', fontWeight: 600, fontSize: '0.92rem' }}>הגרסה המונפשת מוכנה!</span>
          <span style={{
            background: 'rgba(245,200,66,0.20)', border: '1px solid rgba(245,200,66,0.40)',
            color: '#F5C842', borderRadius: 9999, padding: '3px 12px', fontSize: '0.78rem', fontWeight: 600,
          }}>
            &larr; עברו עכשיו
          </span>
        </div>
      )}
    </div>
  );
}
