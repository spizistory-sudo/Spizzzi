import Link from 'next/link';

export default function LandingPage() {
  return (
    <div style={{ backgroundColor: 'var(--bg-cream)' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--accent-burgundy)', fontFamily: 'var(--font-display)' }}>
          StoryMagic &#10024;
        </h1>
        <div className="flex items-center gap-4">
          <Link href="/login" className="font-medium transition" style={{ color: 'var(--text-body)', fontFamily: 'var(--font-body)' }}>
            Sign in
          </Link>
          <Link
            href="/signup"
            style={{
              background: 'linear-gradient(135deg, var(--accent-orange), var(--accent-orange-hover))',
              color: '#FFF8F0',
              padding: '10px 22px',
              borderRadius: 'var(--radius-pill)',
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              boxShadow: 'var(--shadow-orange-glow)',
            }}
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-6 pt-16 pb-24">
        <div className="text-center max-w-3xl mx-auto animate-fade-in-up">
          {/* Floating decorative elements */}
          <div className="relative">
            <span className="absolute -top-8 left-[10%] text-4xl opacity-20 select-none" style={{ animation: 'blobFloat1 20s ease-in-out infinite' }}>&#11088;</span>
            <span className="absolute -top-4 right-[15%] text-3xl opacity-15 select-none" style={{ animation: 'blobFloat2 25s ease-in-out infinite' }}>&#127769;</span>
            <span className="absolute top-12 left-[5%] text-2xl opacity-10 select-none" style={{ animation: 'blobFloat3 30s ease-in-out infinite' }}>&#9729;&#65039;</span>
          </div>

          <div
            className="inline-block px-5 py-2 mb-6"
            style={{
              background: 'var(--bg-lavender)',
              borderRadius: 'var(--radius-pill)',
              color: 'var(--accent-purple)',
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            &#10024; AI-powered personalized storybooks
          </div>

          <h2
            className="leading-tight mb-6"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.5rem, 5vw, 3.8rem)',
              color: 'var(--text-dark)',
              fontWeight: 800,
            }}
          >
            Create magical stories{' '}
            <span style={{ color: 'var(--accent-orange)' }}>starring your child</span>
          </h2>

          <p
            className="max-w-2xl mx-auto mb-10"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '20px',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
            }}
          >
            Pick a theme, add your child&apos;s name and photo, and watch as AI creates a
            beautiful illustrated storybook with narration, music, and page-turn animations.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="transition-all duration-300 animate-gentle-pulse"
              style={{
                background: 'linear-gradient(135deg, var(--accent-orange), var(--accent-orange-hover))',
                color: '#FFF8F0',
                padding: '16px 36px',
                borderRadius: 'var(--radius-pill)',
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                fontSize: '18px',
                boxShadow: 'var(--shadow-orange-glow)',
              }}
            >
              &#10024; Start Creating
            </Link>
            <Link
              href="/login"
              className="transition-all duration-200"
              style={{
                color: 'var(--text-body)',
                padding: '16px 28px',
                borderRadius: 'var(--radius-pill)',
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: '18px',
                border: '2px solid var(--border-medium)',
              }}
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-28 grid md:grid-cols-3 gap-8 stagger">
          {[
            {
              emoji: '&#127912;',
              title: 'Choose a theme',
              desc: 'Superheroes, underwater adventures, magical kitchens, and more. Pick the perfect story world for your child.',
              bg: 'var(--bg-peach-light)',
              accent: 'var(--accent-orange)',
            },
            {
              emoji: '&#10024;',
              title: 'Personalize everything',
              desc: 'Your child becomes the hero. Add their name, traits, and photo for custom illustrations that look like them.',
              bg: 'var(--bg-lavender)',
              accent: 'var(--accent-purple)',
            },
            {
              emoji: '&#128214;',
              title: 'Read, listen & share',
              desc: 'An interactive book reader with voice narration, background music, and beautiful page-flip animations.',
              bg: 'var(--bg-sky-light)',
              accent: 'var(--accent-blue)',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="animate-fade-in-up hover-lift"
              style={{
                background: 'var(--bg-white)',
                borderRadius: 'var(--radius-xl)',
                padding: '32px',
                boxShadow: 'var(--shadow-card)',
                border: '1px solid var(--border-light)',
              }}
            >
              <div
                className="w-14 h-14 flex items-center justify-center mb-5"
                style={{
                  background: feature.bg,
                  borderRadius: 'var(--radius-md)',
                  fontSize: '28px',
                }}
                dangerouslySetInnerHTML={{ __html: feature.emoji }}
              />
              <h3
                className="text-xl font-bold mb-2"
                style={{ color: 'var(--text-dark)', fontFamily: 'var(--font-display)' }}
              >
                {feature.title}
              </h3>
              <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="mt-28 text-center">
          <h2
            className="text-3xl font-bold mb-12"
            style={{ color: 'var(--text-dark)', fontFamily: 'var(--font-display)' }}
          >
            How it works
          </h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4">
            {[
              { num: '1', title: 'Pick a theme', desc: 'Choose from 10+ magical story worlds' },
              { num: '2', title: 'Add your child', desc: 'Name, photo, and personality traits' },
              { num: '3', title: 'Read the magic', desc: 'AI creates a beautiful illustrated book' },
            ].map((step, i) => (
              <div key={step.num} className="flex items-center gap-4">
                {i > 0 && (
                  <div className="hidden md:block w-16" style={{ borderTop: '3px dotted var(--accent-orange)', opacity: 0.3 }} />
                )}
                <div className="text-center">
                  <div
                    className="w-14 h-14 flex items-center justify-center mx-auto mb-3"
                    style={{
                      background: 'linear-gradient(135deg, var(--accent-orange), var(--accent-orange-hover))',
                      borderRadius: '50%',
                      color: '#FFF8F0',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 800,
                      fontSize: '22px',
                      boxShadow: '0 3px 12px rgba(255, 140, 66, 0.3)',
                    }}
                  >
                    {step.num}
                  </div>
                  <h4 className="font-bold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-dark)', fontSize: '18px' }}>
                    {step.title}
                  </h4>
                  <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '14px' }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-light)' }} className="py-8">
        <div className="max-w-7xl mx-auto px-6 text-center" style={{ color: 'var(--text-light)', fontFamily: 'var(--font-body)', fontSize: '14px' }}>
          &copy; {new Date().getFullYear()} StoryMagic. Where stories come alive. &#10024;
        </div>
      </footer>
    </div>
  );
}
