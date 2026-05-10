'use client';

import Link from 'next/link';
import Image from 'next/image';

const CATEGORY_CARDS = [
  { title: 'Big Adventures', emoji: '🌟', image: '/images/categories/big-adventures.jpg', id: 'big_adventures' },
  { title: 'Animal Friends', emoji: '🦊', image: '/images/categories/animal-friends.jpg', id: 'animal_friends' },
  { title: 'All My Feelings', emoji: '💛', image: '/images/categories/all-my-feelings.jpg', id: 'all_my_feelings' },
  { title: 'I Can Do It!', emoji: '🚀', image: '/images/categories/i-can-do-it.jpg', id: 'i_can_do_it' },
  { title: 'Family & Friends', emoji: '🏡', image: '/images/categories/family-and-friends.jpg', id: 'family_and_friends' },
  { title: 'Wonders of the World', emoji: '🌍', image: '/images/categories/wonders-of-the-world.jpg', id: 'wonders_of_the_world' },
  { title: 'Cozy & Calm', emoji: '🌙', image: '/images/categories/cozy-and-calm.jpg', id: 'cozy_and_calm' },
];

const FEATURE_CARDS = [
  {
    title: 'Pick a story',
    emoji: '📚',
    subtext: 'Browse magical worlds and adventures.',
    image: '/images/landing/pick-a-story.jpg',
  },
  {
    title: 'Make it theirs',
    emoji: '✨',
    subtext: "Add your child's photo and personality.",
    image: '/images/landing/make-it-theirs.jpg',
  },
  {
    title: 'Read & listen',
    emoji: '🎧',
    subtext: 'Beautiful illustrations with calm narration.',
    image: '/images/landing/read-and-listen.jpg',
  },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <Link href="/">
          <Image
            src="/images/logo/spizzzy-logo.png"
            alt="Spizzzy"
            width={96}
            height={96}
            priority
            className="h-24 w-auto"
          />
        </Link>
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

        {/* Feature cards — image-led, matching category card style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-20">
          {FEATURE_CARDS.map((card) => (
            <Link
              key={card.title}
              href="/create"
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

        {/* Video placeholder */}
        {/* TODO: Replace with actual demo video — Yossi will provide */}
        <h2
          className="text-center mb-10"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
            color: 'var(--text-primary)',
            fontWeight: 700,
            fontStyle: 'italic',
          }}
        >
          How it works
        </h2>
        <div className="max-w-[640px] mx-auto">
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
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div
                className="flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.10)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="rgba(255,255,255,0.80)">
                  <path d="M6 4l15 8-15 8V4z" />
                </svg>
              </div>
              <span
                className="transition-colors duration-300 group-hover:text-white"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.84rem',
                  color: 'rgba(255,255,255,0.50)',
                }}
              >
                Watch how it works
              </span>
            </div>
          </button>
        </div>

        {/* Category strip */}
        <div style={{ marginTop: 80 }}>
          <h2
            className="text-center mb-10"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontStyle: 'italic',
            }}
          >
            Worlds to explore
          </h2>

          {/* Desktop: 4-col grid (4+3 layout). Mobile: horizontal scroll */}
          <div
            className="hidden md:grid gap-5"
            style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}
          >
            {CATEGORY_CARDS.map((cat) => (
              <Link
                key={cat.id}
                href={`/create/categories/${cat.id}`}
                className="group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:brightness-110"
                style={{
                  height: 220,
                  borderRadius: '1rem',
                  border: '1px solid rgba(255,255,255,0.10)',
                  display: 'block',
                }}
              >
                <Image
                  src={cat.image}
                  alt={cat.title}
                  fill
                  sizes="25vw"
                  className="object-cover"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(to top, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.15) 45%, transparent 70%)',
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      textShadow: '0 2px 8px rgba(0,0,0,0.50)',
                    }}
                  >
                    {cat.emoji} {cat.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>

          {/* Mobile: horizontal scroll */}
          <div
            className="flex md:hidden gap-4 overflow-x-auto pb-4 -mx-6 px-6"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            <style>{`.category-scroll::-webkit-scrollbar { display: none; }`}</style>
            {CATEGORY_CARDS.map((cat) => (
              <Link
                key={cat.id}
                href={`/create/categories/${cat.id}`}
                className="group relative overflow-hidden flex-shrink-0 transition-all duration-300 hover:scale-[1.02] hover:brightness-110 category-scroll"
                style={{
                  width: '70vw',
                  height: 200,
                  borderRadius: '1rem',
                  border: '1px solid rgba(255,255,255,0.10)',
                  display: 'block',
                }}
              >
                <Image
                  src={cat.image}
                  alt={cat.title}
                  fill
                  sizes="70vw"
                  className="object-cover"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(to top, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.15) 45%, transparent 70%)',
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      textShadow: '0 2px 8px rgba(0,0,0,0.50)',
                    }}
                  >
                    {cat.emoji} {cat.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} className="py-8">
        <div className="max-w-7xl mx-auto px-6 text-center" style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-body)', fontSize: '14px' }}>
          &copy; {new Date().getFullYear()} Spizzzy. Where stories come alive. &#10024;
        </div>
      </footer>
    </div>
  );
}
