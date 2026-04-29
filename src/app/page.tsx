import Link from 'next/link';

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--gold)' }}>
          Spizzzy &#10024;
        </h1>
        <div className="flex items-center gap-4">
          <Link href="/login" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '0.95rem' }}>
            התחברות
          </Link>
          <Link
            href="/signup"
            className="btn-primary"
            style={{ padding: '10px 24px', fontSize: '0.92rem' }}
          >
            מתחילים
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-6 pt-16 pb-24">
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
            &#10024; ספרי ילדים מותאמים אישית עם AI
          </div>

          <h2
            className="leading-tight mb-6"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
              color: 'var(--text-primary)',
              fontWeight: 700,
            }}
          >
            ספרי קסם עם{' '}
            <span style={{ color: 'var(--gold)' }}>הילד שלכם בכיכובו</span>
          </h2>

          <p
            className="max-w-2xl mx-auto mb-10"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '1.15rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.8,
            }}
          >
            בחרו נושא, הוסיפו את השם והתמונה של הילד, וצפו איך AI יוצר
            ספר מאויר עם קריינות, מוזיקה ואנימציות דפדוף קסומות.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="btn-primary"
              style={{ padding: '16px 36px', fontSize: '1.1rem' }}
            >
              &#10024; הופ! מתחילים
            </Link>
            <Link
              href="/login"
              className="btn-secondary"
              style={{ padding: '16px 28px', fontSize: '1.1rem' }}
            >
              התחברות
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-28 grid md:grid-cols-3 gap-6">
          {[
            {
              emoji: '&#127912;',
              title: 'בחרו נושא',
              desc: 'גיבורי-על, הרפתקאות מתחת למים, מטבח קסום ועוד. בחרו את עולם הסיפור המושלם לילד שלכם.',
              glow: 'var(--gold-glow)',
              border: 'rgba(245,200,66,0.20)',
            },
            {
              emoji: '&#10024;',
              title: 'הפכו את הילד לגיבור',
              desc: 'הילד שלכם הופך לגיבור הסיפור. הוסיפו שם, תכונות ותמונה לאיורים מותאמים אישית.',
              glow: 'var(--purple-glow)',
              border: 'rgba(155,125,212,0.20)',
            },
            {
              emoji: '&#128214;',
              title: 'קראו, הקשיבו ושתפו',
              desc: 'קורא ספרים אינטראקטיבי עם קריינות, מוזיקת רקע ואנימציות דפדוף יפהפיות.',
              glow: 'var(--cyan-glow)',
              border: 'rgba(126,200,227,0.20)',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="glass"
              style={{
                borderRadius: 'var(--radius-md)',
                padding: '32px',
                border: `1px solid ${feature.border}`,
              }}
            >
              <div
                className="w-14 h-14 flex items-center justify-center mb-5"
                style={{
                  background: feature.glow,
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '28px',
                }}
                dangerouslySetInnerHTML={{ __html: feature.emoji }}
              />
              <h3
                className="text-xl font-bold mb-2"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
              >
                {feature.title}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', lineHeight: 1.8 }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="mt-28 text-center">
          <h2
            className="text-3xl font-bold mb-14"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
          >
            איך זה עובד?
          </h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4">
            {[
              { num: '1', title: 'בחרו נושא', desc: 'יותר מ-10 עולמות סיפור קסומים' },
              { num: '2', title: 'הוסיפו את הילד', desc: 'שם, תמונה ותכונות אישיות' },
              { num: '3', title: 'קראו את הקסם', desc: 'AI יוצר ספר מאויר מדהים' },
            ].map((step, i) => (
              <div key={step.num} className="flex items-center gap-4">
                {i > 0 && (
                  <div className="hidden md:block w-16" style={{ borderTop: '2px dotted rgba(155,125,212,0.30)' }} />
                )}
                <div className="text-center">
                  <div
                    className="w-14 h-14 flex items-center justify-center mx-auto mb-3 btn-primary"
                    style={{
                      borderRadius: '50%',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 800,
                      fontSize: '22px',
                      padding: 0,
                    }}
                  >
                    {step.num}
                  </div>
                  <h4 className="font-bold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '18px' }}>
                    {step.title}
                  </h4>
                  <p style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-body)', fontSize: '14px' }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} className="py-8">
        <div className="max-w-7xl mx-auto px-6 text-center" style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-body)', fontSize: '14px' }}>
          &copy; {new Date().getFullYear()} Spizzzy. איפה שהסיפורים מתעוררים לחיים. &#10024;
        </div>
      </footer>
    </div>
  );
}
