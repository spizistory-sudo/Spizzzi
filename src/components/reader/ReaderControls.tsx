'use client';

import { useState } from 'react';

interface ReaderControlsProps {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  hasAudio?: boolean;
  isAutoPlay?: boolean;
  onToggleAutoPlay?: () => void;
  onShare?: () => void;
  onSettings?: () => void;
  onStartAnimation?: () => void;
}

export default function ReaderControls({
  currentPage,
  totalPages,
  onPrev,
  onNext,
  onClose,
  isPlaying,
  onTogglePlay,
  hasAudio,
  isAutoPlay,
  onToggleAutoPlay,
  onShare,
  onSettings,
  onStartAnimation,
}: ReaderControlsProps) {
  const allPages = totalPages + 1;
  const activeDotIndex = currentPage + 1;
  const [showTools, setShowTools] = useState(false);

  return (
    <>
      <div className="bg-white/5 backdrop-blur-sm rounded-xl px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 pb-safe-3 flex items-center justify-between max-w-2xl mx-auto w-full">
        {/* Close button */}
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white active:text-white transition p-3 min-w-[44px] min-h-[44px] flex items-center justify-center"
          title="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Previous button */}
        <button
          onClick={onPrev}
          disabled={currentPage <= -1}
          className="text-white/70 hover:text-white active:text-white disabled:opacity-20 disabled:cursor-not-allowed transition flex items-center gap-1 text-sm font-medium p-3 min-w-[44px] min-h-[44px] justify-center"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Audio controls */}
        {hasAudio && onTogglePlay && (
          <div className="flex items-center gap-1">
            <button
              onClick={onTogglePlay}
              className="text-white/70 hover:text-white active:text-white transition p-3 min-w-[44px] min-h-[44px] flex items-center justify-center"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                </svg>
              )}
            </button>
            {onToggleAutoPlay && (
              <button
                onClick={onToggleAutoPlay}
                className={`text-xs px-2 py-1 rounded-full transition min-h-[32px] ${
                  isAutoPlay
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-white/50 hover:text-white'
                }`}
                title={isAutoPlay ? 'Auto-play on' : 'Auto-play off'}
              >
                Auto
              </button>
            )}
          </div>
        )}

        {/* Progress dots */}
        <div className="flex gap-1.5 items-center overflow-x-auto max-w-[30vw] sm:max-w-[40vw] px-1">
          {Array.from({ length: allPages }, (_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all flex-shrink-0 ${
                i === activeDotIndex
                  ? 'bg-white scale-125'
                  : 'bg-white/25'
              }`}
            />
          ))}
        </div>

        {/* Next button */}
        <button
          onClick={onNext}
          disabled={currentPage >= totalPages - 1}
          className="text-white/70 hover:text-white active:text-white disabled:opacity-20 disabled:cursor-not-allowed transition flex items-center gap-1 text-sm font-medium p-3 min-w-[44px] min-h-[44px] justify-center"
        >
          <span className="hidden sm:inline">Next</span>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>

        {/* Mobile tools button — lg:hidden */}
        <button
          onClick={() => setShowTools(true)}
          className="lg:hidden text-white/60 hover:text-white active:text-white transition p-3 min-w-[44px] min-h-[44px] flex items-center justify-center"
          title="More"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      </div>

      {/* Mobile tools sheet */}
      {showTools && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40 lg:hidden" onClick={() => setShowTools(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-[61] lg:hidden pb-safe" style={{
            background: 'rgba(10, 17, 40, 0.95)',
            backdropFilter: 'blur(24px)',
            borderTop: '1px solid rgba(255,255,255,0.10)',
            borderRadius: '1.5rem 1.5rem 0 0',
            padding: '20px 16px',
          }}>
            <div className="flex flex-col gap-2">
              {onShare && (
                <button onClick={() => { onShare(); setShowTools(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-xl text-white/80 hover:bg-white/5 active:bg-white/10 transition text-left">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935-2.186 2.25 2.25 0 0 0-3.935 2.186Zm0-12.814a2.25 2.25 0 1 0 3.933 2.185 2.25 2.25 0 0 0-3.933-2.185Z" />
                  </svg>
                  Share
                </button>
              )}
              {onStartAnimation && (
                <button onClick={() => { onStartAnimation(); setShowTools(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-xl text-white/80 hover:bg-white/5 active:bg-white/10 transition text-left">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m15.91 11.672a.375.375 0 0 1 0 .656l-5.603 3.113a.375.375 0 0 1-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  Animate
                </button>
              )}
              {onSettings && (
                <button onClick={() => { onSettings(); setShowTools(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-xl text-white/80 hover:bg-white/5 active:bg-white/10 transition text-left">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87a6.47 6.47 0 0 1 .22.128c.331.183.581.495.644.869l.213 1.281c.09.543.56.94 1.11.94h2.594c.55 0 1.019-.398 1.11-.94l.213-1.281c.062-.374.312-.686.644-.87a6.52 6.52 0 0 1 .22-.127c.325-.196.72-.257 1.076-.124l1.217.456" />
                  </svg>
                  Settings
                </button>
              )}
            </div>
            <button onClick={() => setShowTools(false)}
              className="w-full mt-3 py-3 min-h-[44px] text-white/40 text-sm text-center">
              Cancel
            </button>
          </div>
        </>
      )}
    </>
  );
}
