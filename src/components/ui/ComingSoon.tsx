'use client';

interface ComingSoonProps {
  title: string;
  description: string;
  variant?: 'card' | 'note';
  icon?: React.ReactNode;
}

export default function ComingSoon({ title, description, variant = 'note', icon }: ComingSoonProps) {
  if (variant === 'card') {
    return (
      <div
        className="relative text-left w-full"
        style={{
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '1.25rem',
          padding: '24px 20px',
          opacity: 0.5,
          cursor: 'default',
          pointerEvents: 'none',
        }}
      >
        <div style={{
          position: 'absolute', top: 12, right: 12,
          background: 'rgba(155,125,212,0.60)', color: '#fff',
          fontSize: '0.65rem', fontWeight: 600, padding: '3px 8px',
          borderRadius: '9999px', letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>
          Coming soon
        </div>
        {icon && <div style={{ color: 'rgba(255,255,255,0.25)', marginBottom: 12 }}>{icon}</div>}
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
          {title}
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
          {description}
        </p>
      </div>
    );
  }

  // variant === 'note'
  return (
    <div
      className="flex items-center gap-3 w-full"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '0.75rem',
        padding: '10px 14px',
        opacity: 0.55,
        cursor: 'default',
        pointerEvents: 'none',
      }}
    >
      {icon && <div style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{icon}</div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: 'rgba(255,255,255,0.70)', fontSize: '0.82rem', fontWeight: 500 }}>
          {title}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', lineHeight: 1.4 }}>
          {description}
        </p>
      </div>
      <span style={{
        background: 'rgba(155,125,212,0.50)', color: '#fff',
        fontSize: '0.6rem', fontWeight: 600, padding: '2px 7px',
        borderRadius: '9999px', letterSpacing: '0.03em', textTransform: 'uppercase',
        flexShrink: 0,
      }}>
        Soon
      </span>
    </div>
  );
}
