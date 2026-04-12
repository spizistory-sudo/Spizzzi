'use client';

interface CoverImageProps {
  coverUrl: string | null;
  title: string;
  childName: string;
  size?: 'building' | 'reader';
}

export default function CoverImage({ coverUrl, title, childName, size = 'reader' }: CoverImageProps) {
  const sizeClass = size === 'building'
    ? 'w-[280px] md:w-[360px]'
    : 'w-[280px] md:w-[360px]';

  return (
    <div
      className={`${sizeClass} aspect-[3/4] rounded-lg overflow-hidden relative`}
      style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 8px 25px rgba(0,0,0,0.3)' }}
    >
      {/* Cover illustration */}
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={title}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(135deg, #7c3aed, #4338ca)' }} />
      )}

      {/* Title overlay on the image */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0.35) 60%, transparent)',
        padding: '64px 24px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <h1
          style={{
            color: '#ffffff',
            fontSize: '28px',
            fontWeight: 'bold',
            fontFamily: 'Georgia, serif',
            textAlign: 'center',
            textShadow: '0 2px 12px rgba(0,0,0,0.5)',
            marginBottom: '6px',
            lineHeight: 1.2,
          }}
          dir="auto"
        >
          {title}
        </h1>
        <p
          style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: '15px',
            fontFamily: 'Georgia, serif',
            textShadow: '0 1px 6px rgba(0,0,0,0.4)',
          }}
          dir="auto"
        >
          A story for {childName}
        </p>
      </div>
    </div>
  );
}
