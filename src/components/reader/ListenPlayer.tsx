'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getLineTimings, type LineTiming } from './line-timings';

interface ListenPlayerProps {
  pageText: string;
  pageIllustrationUrl: string | null;
  bookTitle: string;
  narratorName: string;
  narrationRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onClose: () => void;
  hasAudio: boolean;
}

export default function ListenPlayer({
  pageText,
  pageIllustrationUrl,
  bookTitle,
  narratorName,
  narrationRef,
  isPlaying,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onClose,
  hasAudio,
}: ListenPlayerProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [timings, setTimings] = useState<LineTiming[]>([]);
  const [activeLineIdx, setActiveLineIdx] = useState(0);
  const textAreaRef = useRef<HTMLDivElement>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const h = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  // Track audio time
  useEffect(() => {
    const el = narrationRef.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime);
    const onMeta = () => setDuration(el.duration || 0);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('durationchange', onMeta);
    if (el.duration) setDuration(el.duration);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('durationchange', onMeta);
    };
  }, [narrationRef, pageText]);

  // Compute timings when page text or duration changes
  useEffect(() => {
    setTimings(getLineTimings(pageText, duration));
    setActiveLineIdx(0);
  }, [pageText, duration]);

  // Update active line on timeupdate
  useEffect(() => {
    if (timings.length === 0) return;
    const idx = timings.findIndex(t => currentTime >= t.startTime && currentTime < t.endTime);
    if (idx >= 0 && idx !== activeLineIdx) setActiveLineIdx(idx);
  }, [currentTime, timings, activeLineIdx]);

  // Auto-scroll active line into view
  useEffect(() => {
    if (reduceMotion || !textAreaRef.current) return;
    const activeLine = textAreaRef.current.children[activeLineIdx] as HTMLElement;
    if (activeLine) {
      activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeLineIdx, reduceMotion]);

  const handleScrub = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    onSeek(t);
    setCurrentTime(t);
  }, [onSeek]);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'linear-gradient(180deg, #0A1128 0%, #1a1035 100%)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-safe" style={{ padding: '12px 16px' }}>
        <button onClick={onClose} className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-white/60 hover:text-white active:text-white transition">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        <p className="text-white/50 text-xs uppercase tracking-widest">Now reading</p>
        <div className="w-[44px]" />
      </div>

      {/* Album art */}
      <div className="flex-shrink-0 flex justify-center px-8 py-4">
        <div className="w-full max-w-[280px] sm:max-w-[320px] aspect-square rounded-2xl overflow-hidden shadow-2xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
          {pageIllustrationUrl ? (
            <img src={pageIllustrationUrl} alt="Page illustration" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-16 h-16 text-white/10" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Title + narrator */}
      <div className="text-center px-6 mb-2">
        <p className="text-white text-lg font-semibold truncate" style={{ fontFamily: 'Georgia, serif' }}>{bookTitle}</p>
        <p className="text-white/40 text-sm">{narratorName}</p>
      </div>

      {/* Progress bar */}
      {hasAudio && duration > 0 && (
        <div className="px-8 mb-4">
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={currentTime}
            onChange={handleScrub}
            className="w-full accent-purple-500"
            style={{ height: 4 }}
          />
          <div className="flex justify-between text-white/30 text-xs mt-1">
            <span>{fmt(currentTime)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>
      )}

      {/* Transport */}
      <div className="flex items-center justify-center gap-8 mb-4">
        <button onClick={onPrev} className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-white/60 hover:text-white active:text-white transition">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <button
          onClick={onTogglePlay}
          disabled={!hasAudio}
          className="w-16 h-16 rounded-full flex items-center justify-center transition active:scale-95 disabled:opacity-30"
          style={{ background: 'linear-gradient(135deg, rgba(155,125,212,0.90), rgba(126,200,227,0.80))' }}
        >
          {isPlaying ? (
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-white ml-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
            </svg>
          )}
        </button>
        <button onClick={onNext} className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-white/60 hover:text-white active:text-white transition">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Running text with highlighting */}
      <div
        ref={textAreaRef}
        className="flex-1 overflow-y-auto px-8 pb-safe-3"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(155,125,212,0.3) transparent' }}
      >
        {timings.map((line, i) => (
          <p
            key={i}
            className="transition-all duration-300 py-1"
            style={{
              color: i === activeLineIdx ? '#F4EFE2' : 'rgba(255,255,255,0.25)',
              fontSize: i === activeLineIdx ? '18px' : '16px',
              fontWeight: i === activeLineIdx ? 500 : 400,
              fontFamily: 'Georgia, serif',
              lineHeight: 1.7,
              textAlign: 'center',
            }}
          >
            {line.text}
          </p>
        ))}
      </div>
    </div>
  );
}
