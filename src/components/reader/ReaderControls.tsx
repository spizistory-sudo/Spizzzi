'use client';

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
}: ReaderControlsProps) {
  const allPages = totalPages + 1;
  const activeDotIndex = currentPage + 1;

  return (
    <div dir="ltr" className="bg-white/5 backdrop-blur-sm rounded-xl px-4 md:px-6 py-2.5 md:py-3 flex items-center justify-between max-w-2xl mx-auto w-full">
      {/* Close button */}
      <button
        onClick={onClose}
        className="text-white/60 hover:text-white transition p-2"
        title="סגירה"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Previous button */}
      <button
        onClick={onPrev}
        disabled={currentPage <= -1}
        className="text-white/70 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition flex items-center gap-1 text-sm font-medium px-3 py-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        <span className="hidden sm:inline">הקודם</span>
      </button>

      {/* Audio controls */}
      {hasAudio && onTogglePlay && (
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            className="text-white/70 hover:text-white transition p-2"
            title={isPlaying ? 'השהייה' : 'נגינה'}
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
              className={`text-xs px-2 py-1 rounded-full transition ${
                isAutoPlay
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white/50 hover:text-white'
              }`}
              title={isAutoPlay ? 'ניגון אוטומטי פועל' : 'ניגון אוטומטי כבוי'}
            >
              אוטו
            </button>
          )}
        </div>
      )}

      {/* Progress dots */}
      <div className="flex gap-1.5 items-center overflow-x-auto max-w-[40vw] px-2">
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
        className="text-white/70 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition flex items-center gap-1 text-sm font-medium px-3 py-2"
      >
        <span className="hidden sm:inline">הבא</span>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </button>

      {/* Spacer to balance close button */}
      <div className="w-9" />
    </div>
  );
}
