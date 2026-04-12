'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

interface AudioControllerProps {
  narrationUrl: string | null;
  musicUrl: string | null;
  isAutoPlay: boolean;
  onNarrationEnd: () => void;
}

function isValidUrl(url: string | null | undefined): url is string {
  return typeof url === 'string' && url.length > 0;
}

function hasValidSrc(audio: HTMLAudioElement | null): boolean {
  return !!audio && isValidUrl(audio.src) && !audio.src.endsWith('/');
}

export function useAudioController({
  narrationUrl,
  musicUrl,
  isAutoPlay,
  onNarrationEnd,
}: AudioControllerProps) {
  const narrationRef = useRef<HTMLAudioElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [narrationVolume, setNarrationVolume] = useState(1.0);
  const [musicVolume, setMusicVolume] = useState(0.2);
  const onNarrationEndRef = useRef(onNarrationEnd);
  onNarrationEndRef.current = onNarrationEnd;
  const currentMusicUrlRef = useRef<string | null>(null);

  // Initialize audio elements (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!narrationRef.current) {
      narrationRef.current = new Audio();
      narrationRef.current.addEventListener('ended', () => {
        onNarrationEndRef.current();
      });
      narrationRef.current.addEventListener('error', () => {
        // Only log if there was actually a src set (ignore empty-src errors)
        if (hasValidSrc(narrationRef.current)) {
          console.error('[audio] Narration error:', narrationRef.current?.error?.message);
        }
      });
    }
    if (!musicRef.current) {
      musicRef.current = new Audio();
      musicRef.current.loop = true;
      musicRef.current.addEventListener('error', () => {
        if (hasValidSrc(musicRef.current)) {
          console.error('[audio] Music error:', musicRef.current?.error?.message);
        }
      });
    }

    return () => {
      narrationRef.current?.pause();
      musicRef.current?.pause();
    };
  }, []);

  // Update narration source when page changes
  useEffect(() => {
    if (!narrationRef.current) return;

    if (isValidUrl(narrationUrl)) {
      narrationRef.current.src = narrationUrl;
      narrationRef.current.volume = narrationVolume;

      if (isAutoPlay && isPlaying) {
        narrationRef.current.play().catch(() => {});
      }
    } else {
      // No valid URL — just pause, don't set empty src
      narrationRef.current.pause();
    }
  }, [narrationUrl, isAutoPlay, isPlaying, narrationVolume]);

  // Update music
  useEffect(() => {
    if (!musicRef.current) return;

    if (!isValidUrl(musicUrl)) {
      musicRef.current.pause();
      currentMusicUrlRef.current = null;
      return;
    }

    if (currentMusicUrlRef.current !== musicUrl) {
      musicRef.current.src = musicUrl;
      musicRef.current.loop = true;
      currentMusicUrlRef.current = musicUrl;
    }

    musicRef.current.volume = musicVolume;

    if (isPlaying) {
      musicRef.current.play().catch(() => {});
    }
  }, [musicUrl, isPlaying, musicVolume]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      narrationRef.current?.pause();
      musicRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (hasValidSrc(narrationRef.current)) {
        narrationRef.current!.play().catch(() => {});
      }
      if (hasValidSrc(musicRef.current)) {
        musicRef.current!.play().catch(() => {});
      }
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const startPlayback = useCallback(() => {
    setIsPlaying(true);
    if (hasValidSrc(narrationRef.current)) {
      narrationRef.current!.play().catch(() => {});
    }
    if (hasValidSrc(musicRef.current)) {
      musicRef.current!.play().catch(() => {});
    }
  }, []);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    narrationRef.current?.pause();
    musicRef.current?.pause();
  }, []);

  return {
    isPlaying,
    togglePlayPause,
    startPlayback,
    stopPlayback,
    narrationVolume,
    musicVolume,
    setNarrationVolume: (v: number) => {
      setNarrationVolume(v);
      if (narrationRef.current) narrationRef.current.volume = v;
    },
    setMusicVolume: (v: number) => {
      setMusicVolume(v);
      if (musicRef.current) musicRef.current.volume = v;
    },
  };
}
