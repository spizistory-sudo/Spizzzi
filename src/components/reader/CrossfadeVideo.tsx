'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface CrossfadeVideoProps {
  src: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function CrossfadeVideo({ src, className, style }: CrossfadeVideoProps) {
  const videoA = useRef<HTMLVideoElement>(null);
  const videoB = useRef<HTMLVideoElement>(null);
  const [activeLayer, setActiveLayer] = useState<'A' | 'B'>('A');
  const [reduceMotion, setReduceMotion] = useState(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const CROSSFADE_LEAD = 0.6;

  const tick = useCallback(() => {
    const active = activeLayer === 'A' ? videoA.current : videoB.current;
    const standby = activeLayer === 'A' ? videoB.current : videoA.current;
    if (!active || !standby || !active.duration || active.duration === Infinity) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const remaining = active.duration - active.currentTime;
    if (remaining <= CROSSFADE_LEAD && standby.paused) {
      standby.currentTime = 0;
      standby.play().catch(() => {});
    }

    if (remaining <= CROSSFADE_LEAD) {
      const progress = 1 - (remaining / CROSSFADE_LEAD);
      active.style.opacity = String(1 - progress);
      standby.style.opacity = String(progress);
    }

    if (active.ended || active.currentTime >= active.duration - 0.05) {
      active.style.opacity = '0';
      standby.style.opacity = '1';
      active.pause();
      active.currentTime = 0;
      setActiveLayer(prev => prev === 'A' ? 'B' : 'A');
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [activeLayer]);

  useEffect(() => {
    if (reduceMotion) return;
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    const a = videoA.current;
    if (a) {
      a.style.opacity = '1';
      a.play().catch(() => {});
    }
  }, [src, reduceMotion]);

  if (reduceMotion) {
    return (
      <video
        src={src}
        muted
        playsInline
        className={className}
        style={{ ...style, objectFit: 'cover' as const }}
      />
    );
  }

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'none',
  };

  return (
    <div className={className} style={{ ...style, position: 'relative', overflow: 'hidden' }}>
      <video
        ref={videoA}
        src={src}
        muted
        playsInline
        style={{ ...baseStyle, opacity: activeLayer === 'A' ? 1 : 0, zIndex: activeLayer === 'A' ? 2 : 1 }}
      />
      <video
        ref={videoB}
        src={src}
        muted
        playsInline
        style={{ ...baseStyle, opacity: activeLayer === 'B' ? 1 : 0, zIndex: activeLayer === 'B' ? 2 : 1 }}
      />
    </div>
  );
}
