'use client';

import { motion } from 'framer-motion';

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

interface CoverPageProps {
  title: string;
  childName: string;
  coverUrl: string | null;
  onStart: () => void;
  direction: number;
}

export default function CoverPage({
  title,
  childName,
  coverUrl,
  onStart,
  direction,
}: CoverPageProps) {
  return (
    <motion.div
      custom={direction}
      variants={pageVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className="absolute inset-0 flex items-center justify-center"
    >
      {/* Cover background */}
      {coverUrl ? (
        <img
          src={coverUrl}
          alt="Book cover"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800" />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Content */}
      <div className="relative z-10 text-center px-8">
        <h1
          className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg"
          dir="auto"
          style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
        >
          {title}
        </h1>
        <p className="text-xl text-white/80 mb-10 drop-shadow" dir="auto">
          A story for {childName}
        </p>
        <button
          onClick={onStart}
          className="px-10 py-4 bg-white text-purple-700 rounded-2xl font-semibold text-lg hover:bg-white/90 transition shadow-xl"
        >
          Start Reading
        </button>
      </div>
    </motion.div>
  );
}
