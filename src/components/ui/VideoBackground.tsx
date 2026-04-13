'use client';

import { useEffect, useRef, useState } from 'react';

const VIDEOS = [
  'https://jhwzjrclptwclyewehff.supabase.co/storage/v1/object/public/videos/bg-video-1.mp4',
  'https://jhwzjrclptwclyewehff.supabase.co/storage/v1/object/public/videos/bg-video-2.mp4',
  'https://jhwzjrclptwclyewehff.supabase.co/storage/v1/object/public/videos/Enchanted_Garden_Video_Generation.mp4',
  'https://jhwzjrclptwclyewehff.supabase.co/storage/v1/object/public/videos/Crystal_Valley_Animation_Ready.mp4',
  'https://jhwzjrclptwclyewehff.supabase.co/storage/v1/object/public/videos/Clockwork_Village_Video_Generation.mp4',
  'https://jhwzjrclptwclyewehff.supabase.co/storage/v1/object/public/videos/New_Video_Different_Scenery.mp4',
  'https://jhwzjrclptwclyewehff.supabase.co/storage/v1/object/public/videos/Whimsical_Magical_World_Video_Generation.mp4',
];

const FADE_DURATION = 2000;
const SWITCH_INTERVAL = 12000;

export default function VideoBackground() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    [video1Ref, video2Ref].forEach((ref, i) => {
      if (ref.current) {
        ref.current.src = VIDEOS[i];
        ref.current.load();
      }
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setActiveIndex(prev => (prev + 1) % VIDEOS.length);
        setFading(false);
      }, FADE_DURATION);
    }, SWITCH_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const refs = [video1Ref, video2Ref];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
    }}>
      {VIDEOS.map((src, i) => {
        const isActive = i === activeIndex;
        const opacity = isActive
          ? fading ? 0 : 1
          : fading ? 1 : 0;

        return (
          <video
            key={src}
            ref={refs[i]}
            src={src}
            autoPlay
            muted
            loop
            playsInline
            onError={(e) => (e.currentTarget.style.display = 'none')}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity,
              transition: `opacity ${FADE_DURATION}ms ease-in-out`,
              pointerEvents: 'none',
            }}
          />
        );
      })}

      {/* Dark overlay for readability */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(5, 8, 20, 0.55)',
      }} />

      {/* Vignette */}
      <div style={{
        position: 'absolute',
        inset: 0,
        boxShadow: 'inset 0 0 150px rgba(0, 0, 0, 0.60)',
      }} />
    </div>
  );
}
