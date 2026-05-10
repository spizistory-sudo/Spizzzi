'use client';

import Link from 'next/link';
import Image from 'next/image';

const FEATURE_CARDS = [
  {
    title: 'Pick a story',
    emoji: '📚',
    subtext: 'Browse magical worlds and adventures.',
    image: '/images/categories/big-adventures.jpg',
  },
  {
    title: 'Make it theirs',
    emoji: '✨',
    subtext: "Add your child's photo and personality.",
    image: '/images/categories/family-and-friends.jpg',
  },
  {
    title: 'Read & listen',
    emoji: '🎧',
    subtext: 'Beautiful illustrations with calm narration.',
    image: '/images/categories/cozy-and-calm.jpg',
  },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--gold)', fontStyle: 'italic' }}>
          StoryMagic &#10024;
        </h1>
        <div className="flex items-center gap-4">
          <Link href="/login" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '0.95rem' }}>
            Sign in
          </Link>
          <Link
            href="/signup"
            className="btn-primary"
            style={{ padding: '10px 24px', fontSize: '0.92rem' }}
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-6 pt-10 pb-20">
        <div className="text-center max-w-3xl mx-auto">
          <div
            className="inline-block px-5 py-2 mb-6"
            style={{
              background: 'rgba(155,125,212,0.12)',
              border: '1px solid rgba(155,125,212,0.25)',
              borderRadius: 'var(--radius-pill)',
              color: 'var(--purple)',
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            &#10024; AI-powered personalized storybooks
          </div>

          <h2
            className="leading-tight mb-6"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.5rem, 5vw, 3.8rem)',
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontStyle: 'italic',
            }}
          >
            Create magical stories{' '}
            <span style={{ color: 'var(--gold)' }}>starring your child</span>
          </h2>

          <p
            className="max-w-2xl mx-auto mb-8"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '1.15rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
            }}
          >
            Pick a theme, add your child&apos;s name and photo, and watch as AI creates a
            beautiful illustrated storybook with narration, music, and page-turn animations.
          </p>

          <div className="flex items-center justify-center gap-4 mb-16">
            <Link
              href="/signup"
              className="btn-primary"
              style={{ padding: '16px 36px', fontSize: '1.1rem' }}
            >
              &#10024; Start Creating
            </Link>
            <Link
              href="/login"
              className="btn-secondary"
              style={{ padding: '16px 28px', fontSize: '1.1rem' }}
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Video placeholder */}
        {/* TODO: Replace with actual demo video — Yossi will provide */}
        <div className="max-w-[900px] mx-auto mb-20">
          <button
            onClick={() => console.log('video play clicked')}
            className="group relative w-full overflow-hidden transition-all duration-300"
            style={{
              aspectRatio: '16 / 9',
              borderRadius: '1rem',
              border: '1px solid rgba(255,255,255,0.10)',
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(12px)',
              cursor: 'pointer',
            }}
          >
            {/* Play icon */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div
                className="flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.10)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="rgba(255,255,255,0.80)">
                  <path d="M6 4l15 8-15 8V4z" />
                </svg>
              </div>
              <span
                className="transition-colors duration-300 group-hover:text-white"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.88rem',
                  color: 'rgba(255,255,255,0.50)',
                }}
              >
                Watch how it works
              </span>
            </div>
          </button>
        </div>

        {/* Feature cards — image-led, matching category card style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FEATURE_CARDS.map((card) => (
            <Link
              key={card.title}
              href="/signup"
              className="group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:brightness-110"
              style={{
                height: 280,
                borderRadius: '1rem',
                border: '1px solid rgba(255,255,255,0.10)',
                display: 'block',
              }}
            >
              <Image
                src={card.image}
                alt={card.title}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover"
              />

              {/* Gradient overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.20) 45%, transparent 70%)',
                }}
              />

              {/* Text */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    marginBottom: 2,
                    textShadow: '0 2px 8px rgba(0,0,0,0.50)',
                  }}
                >
                  {card.emoji} {card.title}
                </h3>
                <p
                  style={{
                    fontSize: '0.84rem',
                    color: 'rgba(255,255,255,0.75)',
                    lineHeight: 1.4,
                    textShadow: '0 1px 4px rgba(0,0,0,0.40)',
                  }}
                >
                  {card.subtext}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} className="py-8">
        <div className="max-w-7xl mx-auto px-6 text-center" style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-body)', fontSize: '14px' }}>
          &copy; {new Date().getFullYear()} StoryMagic. Where stories come alive. &#10024;
        </div>
      </footer>
    </div>
  );
}
