'use client';

const PARTICLES = [
  { left: 5,  top: 15, size: 2, color: 'rgba(245,200,66,0.7)',  duration: 10, delay: 0   },
  { left: 12, top: 70, size: 1, color: 'rgba(255,255,255,0.8)', duration: 14, delay: 2   },
  { left: 20, top: 35, size: 2, color: 'rgba(126,200,227,0.7)', duration: 9,  delay: 4   },
  { left: 28, top: 80, size: 1, color: 'rgba(245,200,66,0.6)',  duration: 12, delay: 1   },
  { left: 35, top: 20, size: 3, color: 'rgba(255,255,255,0.6)', duration: 16, delay: 6   },
  { left: 42, top: 55, size: 1, color: 'rgba(126,200,227,0.8)', duration: 11, delay: 3   },
  { left: 50, top: 10, size: 2, color: 'rgba(245,200,66,0.7)',  duration: 13, delay: 7   },
  { left: 58, top: 65, size: 1, color: 'rgba(255,255,255,0.7)', duration: 9,  delay: 2.5 },
  { left: 65, top: 40, size: 2, color: 'rgba(126,200,227,0.6)', duration: 15, delay: 5   },
  { left: 72, top: 85, size: 1, color: 'rgba(245,200,66,0.8)',  duration: 10, delay: 1.5 },
  { left: 78, top: 25, size: 3, color: 'rgba(255,255,255,0.5)', duration: 12, delay: 8   },
  { left: 85, top: 60, size: 2, color: 'rgba(126,200,227,0.7)', duration: 14, delay: 3.5 },
  { left: 90, top: 45, size: 1, color: 'rgba(245,200,66,0.6)',  duration: 11, delay: 6.5 },
  { left: 95, top: 75, size: 2, color: 'rgba(255,255,255,0.8)', duration: 9,  delay: 4.5 },
  { left: 8,  top: 50, size: 1, color: 'rgba(126,200,227,0.5)', duration: 13, delay: 9   },
  { left: 18, top: 90, size: 2, color: 'rgba(245,200,66,0.7)',  duration: 16, delay: 0.5 },
  { left: 32, top: 5,  size: 1, color: 'rgba(255,255,255,0.6)', duration: 10, delay: 7.5 },
  { left: 47, top: 78, size: 3, color: 'rgba(126,200,227,0.8)', duration: 12, delay: 2   },
  { left: 62, top: 18, size: 1, color: 'rgba(245,200,66,0.5)',  duration: 15, delay: 5.5 },
  { left: 75, top: 92, size: 2, color: 'rgba(255,255,255,0.7)', duration: 11, delay: 3   },
  { left: 88, top: 30, size: 1, color: 'rgba(126,200,227,0.6)', duration: 14, delay: 8.5 },
  { left: 3,  top: 62, size: 2, color: 'rgba(245,200,66,0.8)',  duration: 9,  delay: 1   },
  { left: 55, top: 42, size: 1, color: 'rgba(255,255,255,0.5)', duration: 13, delay: 6   },
  { left: 40, top: 95, size: 2, color: 'rgba(126,200,227,0.7)', duration: 10, delay: 4   },
];

const CLOUDS = [
  { bottom: '-5%',  left: '-10%', width: 700, height: 350, opacity: 0.10, top: undefined as string | undefined },
  { bottom: '5%',   left: '30%',  width: 600, height: 300, opacity: 0.08, top: undefined as string | undefined },
  { bottom: '-8%',  left: '65%',  width: 800, height: 400, opacity: 0.09, top: undefined as string | undefined },
  { bottom: undefined as string | undefined, left: '60%', width: 500, height: 250, opacity: 0.06, top: '35%' },
];

export default function NightSkyBackground() {
  return (
    <>
      {/* Fixed background layer */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: -10,
        background: 'linear-gradient(180deg, #0A1128 0%, #1E5A70 55%, rgba(176,141,91,0.20) 100%)',
        overflow: 'hidden',
      }}>
        {/* CSS cloud blobs */}
        {CLOUDS.map((c, i) => (
          <div key={i} style={{
            position: 'absolute',
            bottom: c.bottom, left: c.left, top: c.top,
            width: c.width, height: c.height,
            borderRadius: '50%',
            background: 'white',
            filter: 'blur(80px)',
            opacity: c.opacity,
            pointerEvents: 'none',
          }} />
        ))}

        {/* Bottom mist */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
          background: 'radial-gradient(ellipse at bottom, rgba(200,230,255,0.07) 0%, transparent 70%)',
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        }} />

        {/* Firefly particles */}
        {PARTICLES.map((p, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            animation: `fireflyDrift ${p.duration}s ${p.delay}s ease-in-out infinite`,
            pointerEvents: 'none',
          }} />
        ))}
      </div>

      {/* Vignette overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: -9,
        boxShadow: 'inset 0 0 150px rgba(0,0,0,0.50)',
        pointerEvents: 'none',
      }} />

      <style>{`
        @keyframes fireflyDrift {
          0%   { transform: translate(0, 0);        opacity: 0.2; }
          25%  { transform: translate(8px, -30px);  opacity: 0.8; }
          50%  { transform: translate(-5px, -60px); opacity: 0.4; }
          75%  { transform: translate(10px, -90px); opacity: 0.7; }
          100% { transform: translate(0, -120px);   opacity: 0.1; }
        }
      `}</style>
    </>
  );
}
