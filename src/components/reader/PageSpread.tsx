'use client';

import { motion } from 'framer-motion';
import type { Page } from '@/types/book';

const pageVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
};

const moodGradients: Record<string, string> = {
  happy: 'from-amber-400 via-yellow-300 to-orange-300',
  adventurous: 'from-blue-500 via-cyan-400 to-teal-400',
  calm: 'from-green-400 via-emerald-300 to-teal-300',
  excited: 'from-orange-400 via-pink-400 to-red-400',
  magical: 'from-purple-500 via-violet-400 to-fuchsia-400',
  cozy: 'from-amber-300 via-orange-200 to-yellow-200',
  triumphant: 'from-yellow-400 via-amber-400 to-red-400',
};

export default function PageSpread({
  page,
  direction,
}: {
  page: Page;
  direction: number;
}) {
  const hasIllustration = page.illustration_url && page.illustration_status === 'complete';
  const gradient = moodGradients[page.mood || ''] || 'from-purple-400 via-indigo-400 to-blue-400';

  return (
    <motion.div
      custom={direction}
      variants={pageVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className="absolute inset-0"
    >
      {/* Full bleed illustration or gradient placeholder */}
      {hasIllustration ? (
        <img
          src={page.illustration_url!}
          alt={`Page ${page.page_number}`}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <div className="text-white/30 text-[120px]">
            {page.page_number}
          </div>
        </div>
      )}

      {/* Text overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-6 md:p-8 pt-16">
        <p
          className="text-white text-lg md:text-2xl leading-relaxed text-center max-w-3xl mx-auto"
          dir="auto"
          style={{ fontFamily: 'Georgia, serif', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
        >
          {page.text_content}
        </p>
        <p className="text-white/40 text-sm text-center mt-4">
          {page.page_number}
        </p>
      </div>
    </motion.div>
  );
}
