'use client';

import { useState, useEffect } from 'react';

const STARS = [
  { left: 3,  top: 8,  size: 2, color: '#F5C542', delay: 0,   duration: 3.5 },
  { left: 8,  top: 42, size: 1, color: '#FFF8E7', delay: 1.2, duration: 2.8 },
  { left: 14, top: 18, size: 2, color: '#B8D4E8', delay: 0.5, duration: 4.1 },
  { left: 19, top: 72, size: 1, color: '#F5C542', delay: 3.0, duration: 3.2 },
  { left: 24, top: 55, size: 3, color: '#FFF8E7', delay: 2.1, duration: 2.5 },
  { left: 29, top: 12, size: 1, color: '#B8D4E8', delay: 4.5, duration: 3.8 },
  { left: 33, top: 88, size: 2, color: '#F5C542', delay: 0.8, duration: 4.5 },
  { left: 38, top: 35, size: 1, color: '#FFF8E7', delay: 5.2, duration: 2.2 },
  { left: 42, top: 65, size: 2, color: '#B8D4E8', delay: 1.8, duration: 3.0 },
  { left: 47, top: 5,  size: 1, color: '#F5C542', delay: 3.5, duration: 4.8 },
  { left: 52, top: 48, size: 3, color: '#FFF8E7', delay: 0.3, duration: 2.6 },
  { left: 56, top: 78, size: 1, color: '#B8D4E8', delay: 2.5, duration: 3.4 },
  { left: 61, top: 22, size: 2, color: '#F5C542', delay: 4.0, duration: 4.2 },
  { left: 65, top: 92, size: 1, color: '#FFF8E7', delay: 1.0, duration: 2.9 },
  { left: 70, top: 38, size: 2, color: '#B8D4E8', delay: 5.5, duration: 3.6 },
  { left: 74, top: 60, size: 1, color: '#F5C542', delay: 0.7, duration: 4.0 },
  { left: 78, top: 15, size: 3, color: '#FFF8E7', delay: 3.2, duration: 2.4 },
  { left: 82, top: 82, size: 1, color: '#B8D4E8', delay: 2.0, duration: 3.9 },
  { left: 86, top: 50, size: 2, color: '#F5C542', delay: 4.8, duration: 4.4 },
  { left: 90, top: 28, size: 1, color: '#FFF8E7', delay: 1.5, duration: 2.7 },
  { left: 94, top: 70, size: 2, color: '#B8D4E8', delay: 0.2, duration: 3.3 },
  { left: 6,  top: 95, size: 1, color: '#F5C542', delay: 5.0, duration: 4.6 },
  { left: 17, top: 30, size: 2, color: '#FFF8E7', delay: 2.8, duration: 2.3 },
  { left: 36, top: 85, size: 1, color: '#B8D4E8', delay: 3.8, duration: 3.1 },
  { left: 50, top: 20, size: 2, color: '#F5C542', delay: 1.3, duration: 4.3 },
  { left: 68, top: 45, size: 1, color: '#FFF8E7', delay: 4.2, duration: 2.1 },
  { left: 76, top: 3,  size: 3, color: '#B8D4E8', delay: 0.9, duration: 3.7 },
  { left: 88, top: 58, size: 1, color: '#F5C542', delay: 5.8, duration: 4.9 },
  { left: 45, top: 75, size: 2, color: '#FFF8E7', delay: 2.3, duration: 2.0 },
  { left: 12, top: 52, size: 1, color: '#B8D4E8', delay: 3.6, duration: 3.5 },
];

const SPARKLES = [
  { left: 5,  delay: 0,   duration: 8,  size: 2.5 },
  { left: 12, delay: 2.5, duration: 10, size: 2   },
  { left: 20, delay: 5,   duration: 7,  size: 3   },
  { left: 28, delay: 1,   duration: 9,  size: 2   },
  { left: 35, delay: 4,   duration: 8,  size: 2.5 },
  { left: 43, delay: 6.5, duration: 11, size: 1.5 },
  { left: 50, delay: 0.5, duration: 7,  size: 3   },
  { left: 58, delay: 3,   duration: 9,  size: 2   },
  { left: 65, delay: 7,   duration: 8,  size: 2.5 },
  { left: 72, delay: 1.5, duration: 10, size: 2   },
  { left: 80, delay: 4.5, duration: 7,  size: 3   },
  { left: 87, delay: 2,   duration: 9,  size: 1.5 },
  { left: 93, delay: 5.5, duration: 8,  size: 2.5 },
  { left: 15, delay: 7.5, duration: 11, size: 2   },
  { left: 55, delay: 3.5, duration: 7,  size: 3   },
];

// Orb inline styles (no className needed)
const ORBS = [
  { style: { width: 200, height: 200, top: '10%', left: '15%', background: 'radial-gradient(circle, rgba(155,109,215,0.1) 0%, transparent 70%)', animationDuration: '48s' } },
  { style: { width: 160, height: 160, top: '60%', right: '10%', background: 'radial-gradient(circle, rgba(255,140,66,0.08) 0%, transparent 70%)', animationDuration: '55s', animationDelay: '-5s' } },
  { style: { width: 180, height: 180, bottom: '20%', left: '30%', background: 'radial-gradient(circle, rgba(126,184,224,0.08) 0%, transparent 70%)', animationDuration: '42s', animationDelay: '-10s' } },
  { style: { width: 120, height: 120, top: '35%', right: '25%', background: 'radial-gradient(circle, rgba(245,197,66,0.06) 0%, transparent 70%)', animationDuration: '60s', animationDelay: '-20s' } },
  { style: { width: 140, height: 140, top: '75%', left: '60%', background: 'radial-gradient(circle, rgba(155,109,215,0.07) 0%, transparent 70%)', animationDuration: '50s', animationDelay: '-15s' } },
  { style: { width: 100, height: 100, top: '15%', left: '55%', background: 'radial-gradient(circle, rgba(240,153,123,0.06) 0%, transparent 70%)', animationDuration: '45s', animationDelay: '-10s' } },
];

const orbBase: React.CSSProperties = {
  position: 'absolute', borderRadius: '50%', filter: 'blur(40px)',
  willChange: 'transform', transform: 'translateZ(0)',
  animationName: 'mrb-orbDrift', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite',
};

export function MagicReaderBackground() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden" style={{
      background: 'radial-gradient(ellipse at 50% 40%, #1a0a2e 0%, #120826 40%, #0d0620 100%)',
    }}>
      {/* Aurora wave — inline styles only */}
      <div style={{
        position: 'absolute', top: 0, left: '-20%', right: '-20%', height: '30%',
        background: 'linear-gradient(135deg, rgba(155,109,215,0.05) 0%, rgba(126,184,224,0.04) 30%, rgba(240,153,123,0.04) 60%, rgba(155,109,215,0.05) 100%)',
        filter: 'blur(60px)', willChange: 'transform', transform: 'translateZ(0)',
        animationName: 'mrb-aurora', animationDuration: '30s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite',
      }} />

      {/* Floating orbs — inline styles only */}
      {ORBS.map((orb, i) => (
        <div key={`orb-${i}`} style={{ ...orbBase, ...orb.style } as React.CSSProperties} />
      ))}

      {/* Stars + sparkles — client-only to avoid hydration mismatch */}
      {mounted && STARS.map((star, i) => (
        <div key={`s-${i}`} style={{
          position: 'absolute', borderRadius: '50%', willChange: 'opacity', transform: 'translateZ(0)',
          left: `${star.left}%`, top: `${star.top}%`, width: star.size, height: star.size,
          backgroundColor: star.color,
          animationName: 'mrb-twinkle', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite',
          animationDelay: `${star.delay}s`, animationDuration: `${star.duration}s`,
        }} />
      ))}

      {mounted && SPARKLES.map((s, i) => (
        <div key={`sp-${i}`} style={{
          position: 'absolute', bottom: -10, borderRadius: '50%',
          background: 'rgba(245,197,66,0.5)', willChange: 'transform, opacity', transform: 'translateZ(0)',
          left: `${s.left}%`, width: s.size, height: s.size,
          animationName: 'mrb-rise', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite',
          animationDelay: `${s.delay}s`, animationDuration: `${s.duration}s`,
        }} />
      ))}

      {/* Global keyframes — no jsx scoping, no className hashes */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes mrb-twinkle {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.8; }
        }
        @keyframes mrb-orbDrift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(40px, -30px) scale(1.1); }
          50% { transform: translate(-20px, 40px) scale(0.9); }
          75% { transform: translate(30px, 20px) scale(1.05); }
        }
        @keyframes mrb-rise {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          10% { opacity: 0.6; }
          50% { opacity: 0.3; transform: translateY(-40vh) scale(0.8); }
          100% { transform: translateY(-90vh) scale(0.3); opacity: 0; }
        }
        @keyframes mrb-aurora {
          0%, 100% { transform: translateX(0) skewX(-5deg); opacity: 0.6; }
          33% { transform: translateX(5%) skewX(3deg); opacity: 0.8; }
          66% { transform: translateX(-3%) skewX(-2deg); opacity: 0.5; }
        }
      `}} />
    </div>
  );
}
