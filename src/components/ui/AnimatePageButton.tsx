'use client';

import { useState, useEffect, useRef } from 'react';

interface Props {
  pageId: string;
  bookId: string;
  currentVideoStatus: string;
  onVideoReady: (videoUrl: string) => void;
}

export default function AnimatePageButton({ pageId, bookId, currentVideoStatus, onVideoReady }: Props) {
  const [status, setStatus] = useState(currentVideoStatus || 'none');
  const [requestId, setRequestId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // If mounted with 'generating' but no requestId to poll, it's a stale job — reset
  useEffect(() => {
    if (status === 'generating' && !requestId) {
      setStatus('none');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll for completion when generating with a valid requestId
  useEffect(() => {
    if (status === 'generating' && requestId) {
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/animate-page/status?pageId=${pageId}&requestId=${requestId}`);
          const data = await res.json();

          if (data.status === 'complete') {
            clearInterval(pollRef.current!);
            setStatus('complete');
            onVideoReady(data.videoUrl);
          } else if (data.status === 'error') {
            clearInterval(pollRef.current!);
            setStatus('error');
          } else if (data.status === 'not_found') {
            clearInterval(pollRef.current!);
            setStatus('none');
          }
        } catch (err) {
          console.error('Poll error:', err);
        }
      }, 10000); // poll every 10 seconds — Kling v1.6 takes 2-4 minutes
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [status, requestId, pageId, onVideoReady]);

  async function handleAnimate() {
    setStatus('generating');
    try {
      const res = await fetch('/api/animate-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, bookId }),
      });
      const data = await res.json();
      if (data.requestId) {
        setRequestId(data.requestId);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  if (status === 'complete') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(126,200,227,0.85)', fontSize: '0.78rem', fontWeight: 500 }}>
        &#10022; Animated
      </div>
    );
  }

  if (status === 'generating') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(245,200,66,0.80)', fontSize: '0.78rem', fontWeight: 500 }}>
        <span style={{ animation: 'spin 1.5s linear infinite', display: 'inline-block' }}>&#9676;</span>
        Animating...
      </div>
    );
  }

  if (status === 'error') {
    return (
      <button onClick={handleAnimate} style={{
        background: 'rgba(255,80,60,0.12)', border: '1px solid rgba(255,100,80,0.30)',
        color: 'rgba(255,140,120,0.90)', borderRadius: 9999, padding: '6px 14px',
        fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer',
      }}>
        Retry
      </button>
    );
  }

  return (
    <button onClick={handleAnimate} title="Animate this illustration" style={{
      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)',
      color: 'rgba(255,255,255,0.75)', borderRadius: 9999, padding: '6px 14px',
      fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.2s ease',
    }}>
      &#10022; Animate
    </button>
  );
}
