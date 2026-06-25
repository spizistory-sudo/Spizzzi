'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Volume2, VolumeX } from 'lucide-react';
import { useCreationWizard } from '@/stores/creation-wizard';
import { createClient } from '@/lib/supabase/client';
import WizardProgress from '@/components/wizard/WizardProgress';
import ComingSoon from '@/components/ui/ComingSoon';
import { STORYMAGIC_VOICES, DEFAULT_VOICE_ID, getVoiceById as getVoice } from '@/lib/elevenlabs/voices';
import { FALLBACK_TRACKS, suggestTrack, type MusicTrack } from '@/lib/music/tracks';
import CoverImage from '@/components/reader/CoverImage';
import VideoBackground from '@/components/ui/VideoBackground';

type FinalizationPhase = 'select' | 'building' | 'done';
type BuildPhase = 'writing_story' | 'cover_generating' | 'cover_processing' | 'pages' | 'narration' | 'done' | 'failed';

const PHASE_TARGETS: Record<BuildPhase, number> = {
  writing_story: 15,
  cover_generating: 30,
  cover_processing: 60,
  pages: 85,
  narration: 95,
  done: 100,
  failed: 0,
};

const PHASE_MESSAGES: Record<BuildPhase, { primary: string; rotating: string[] }> = {
  writing_story: {
    primary: 'Writing your story...',
    rotating: ['Finding the right words', 'Shaping the adventure', 'Giving it heart'],
  },
  cover_generating: {
    primary: 'Designing your cover...',
    rotating: ['Choosing the colors...', 'Sketching the scene...', 'Painting the characters...', 'Adding the finishing touches...'],
  },
  cover_processing: {
    primary: 'Studying your character...',
    rotating: ['So they look the same on every page', 'Memorizing every detail', 'Making sure the magic stays consistent'],
  },
  pages: {
    primary: 'Painting the pages...',
    rotating: [],
  },
  narration: {
    primary: 'Recording the narration...',
    rotating: ['Bringing the story to life', 'Almost ready'],
  },
  done: {
    primary: 'Your book is ready!',
    rotating: [],
  },
  failed: {
    primary: '',
    rotating: [],
  },
};

const PAGE_FILLER = ['Sprinkling fairy dust on the pages...', 'Mixing the perfect colors...', 'Bringing the story to life...'];

export default function FinalizePageWrapper() {
  return (
    <Suspense fallback={null}>
      <FinalizePage />
    </Suspense>
  );
}

function FinalizePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const autoStartFired = useRef(false);
  const {
    bookId,
    generatedStory,
    childName,
    childAge,
    childGender,
    childTraits,
    childInterests,
    storyId,
    selectedStyleKey,
    photoDescription,
    uploadedPhotos,
    photoStoragePaths,
    selectedVoiceId,
    selectedMusicId,
    setSelectedVoice,
    setSelectedMusic,
    setGeneratedStory,
    setStep,
    language,
  } = useCreationWizard();

  const isAutoStart = searchParams.get('autostart') === '1';
  const [phase, setPhase] = useState<FinalizationPhase>(isAutoStart ? 'building' : 'select');
  const [error, setError] = useState<string | null>(null);
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>(FALLBACK_TRACKS);
  const [musicCategory, setMusicCategory] = useState('All');

  // Building state
  const [buildProgress, setBuildProgress] = useState({ illustrationsComplete: 0, narrationsComplete: 0, total: 0 });
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [buildPhase, setBuildPhase] = useState<BuildPhase>(isAutoStart ? 'writing_story' : 'cover_generating');
  const [smoothProgress, setSmoothProgress] = useState(0);
  const [rotatingIdx, setRotatingIdx] = useState(0);
  const buildingMusicRef = useRef<HTMLAudioElement | null>(null);
  const [musicMuted, setMusicMuted] = useState(() => {
    if (typeof window !== 'undefined') return sessionStorage.getItem('spizzzy_gen_music_muted') === '1';
    return false;
  });

  // Audio preview refs
  const voicePreviewRef = useRef<HTMLAudioElement | null>(null);
  const musicPreviewRef = useRef<HTMLAudioElement | null>(null);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [playingMusicId, setPlayingMusicId] = useState<string | null>(null);

  // Redirect if no story selected
  useEffect(() => {
    if (!storyId || !childName) {
      router.replace('/create/details');
    }
  }, [storyId, childName, router]);

  // Auto-start build if flagged (from "Choose the best for me" path)
  useEffect(() => {
    const shouldAutoStart = searchParams.get('autostart') === '1';
    if (!shouldAutoStart) return;
    if (autoStartFired.current) return;
    if (!storyId || !selectedVoiceId || !selectedMusicId || !childName) {
      console.warn('[finalize] autostart requested but missing data, falling back to manual UI');
      return;
    }
    autoStartFired.current = true;
    console.log('[finalize] Auto-start firing build with pre-selected voice/music');
    // Small delay to ensure component is fully mounted
    setTimeout(() => handleCreateBook(), 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId, selectedVoiceId, selectedMusicId, childName, searchParams]);

  // Fetch music tracks from Supabase (fall back to hardcoded)
  useEffect(() => {
    async function loadTracks() {
      try {
        const { data, error } = await supabase
          .from('music_tracks')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
        if (!error && data && data.length > 0) setMusicTracks(data as MusicTrack[]);
      } catch { /* Use fallback */ }
    }
    loadTracks();
  }, [supabase]);

  // Auto-suggest music
  useEffect(() => {
    if (!selectedMusicId && generatedStory && musicTracks.length > 0) {
      const moods = generatedStory.pages.map((p) => p.mood);
      const suggested = suggestTrack(musicTracks, moods);
      setSelectedMusic(suggested.id);
    }
  }, [generatedStory, selectedMusicId, setSelectedMusic, musicTracks]);

  // Unified poll: book-status returns cover + page + narration state
  useEffect(() => {
    if (phase !== 'building' || !bookId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/book-status?bookId=${bookId}`);
        if (!res.ok) return;
        const data = await res.json();

        const pageCount = data.total || 0;
        const illComplete = data.illustrationsComplete ?? 0;
        const narComplete = data.narrationsComplete ?? 0;

        setBuildProgress({ illustrationsComplete: illComplete, narrationsComplete: narComplete, total: pageCount * 2 });

        // Update cover URL when available
        if (data.coverUrl && !coverUrl) {
          setCoverUrl(data.coverUrl);
        }

        // Phase determination — priority order (highest first)
        const cs = data.coverStatus || 'generating_image';
        let newPhase: BuildPhase;

        if (data.bookStatus === 'complete') {
          // HIGHEST PRIORITY: book is done in DB — regardless of bible/crops state
          newPhase = 'done';
        } else if (data.bookStatus === 'failed') {
          newPhase = 'failed';
        } else if (pageCount > 0 && illComplete >= pageCount && narComplete >= pageCount && data.coverUrl) {
          // All assets done but DB not yet updated — treat as done
          newPhase = 'done';
        } else if (illComplete >= pageCount && narComplete < pageCount) {
          newPhase = 'narration';
        } else if ((cs === 'ready' || cs === 'processing') && illComplete < pageCount && illComplete > 0) {
          newPhase = 'pages';
        } else if (cs === 'processing' || cs === 'ready') {
          // Cover image exists, post-processing may or may not be done
          // If pages haven't started yet, show processing; if they have, show pages
          newPhase = illComplete > 0 ? 'pages' : 'cover_processing';
        } else {
          newPhase = 'cover_generating';
        }

        console.log('[finalize] Phase determined:', newPhase, {
          bookStatus: data.bookStatus, coverStatus: cs,
          illComplete, narComplete, pageCount, hasCoverUrl: !!data.coverUrl,
        });

        setBuildPhase(newPhase);
        if (newPhase === 'done') {
          setPhase('done');
          clearInterval(interval);
        } else if (newPhase === 'failed') {
          clearInterval(interval);
        }
      } catch { /* keep polling */ }
    }, 3000);

    return () => clearInterval(interval);
  }, [phase, bookId, coverUrl]);

  // Hard 6-minute timeout safety net
  useEffect(() => {
    if (phase !== 'building' || !bookId) return;
    const startTime = Date.now();
    const HARD_TIMEOUT_MS = 6 * 60 * 1000;

    const timeout = setInterval(async () => {
      if (Date.now() - startTime > HARD_TIMEOUT_MS) {
        console.warn('[finalize] Hard timeout reached (6min), force-checking completion');
        try {
          const res = await fetch(`/api/book-status?bookId=${bookId}`);
          if (res.ok) {
            const status = await res.json();
            if (status.bookStatus === 'complete' || (status.illustrationsComplete === status.total && status.narrationsComplete === status.total)) {
              setBuildPhase('done');
              setPhase('done');
            }
          }
        } catch { /* ignore */ }
        clearInterval(timeout);
      }
    }, 30000);

    return () => clearInterval(timeout);
  }, [phase, bookId]);

  // Smooth progress bar tick
  useEffect(() => {
    if (phase !== 'building') return;
    const tick = setInterval(() => {
      setSmoothProgress((prev) => {
        const target = PHASE_TARGETS[buildPhase];
        if (prev >= target) return prev;
        return prev + Math.max(0.1, (target - prev) * 0.02);
      });
    }, 200);
    return () => clearInterval(tick);
  }, [phase, buildPhase]);

  // Rotating sub-text
  useEffect(() => {
    if (phase !== 'building') return;
    const rot = setInterval(() => setRotatingIdx((i) => i + 1), 3500);
    return () => clearInterval(rot);
  }, [phase]);

  // Play background music during building phase
  useEffect(() => {
    if (phase !== 'building' && phase !== 'done') return;

    let musicSrc: string | null = null;
    if (selectedMusicId) {
      const fallbackTrack = FALLBACK_TRACKS.find((t) => t.id === selectedMusicId);
      if (fallbackTrack) musicSrc = fallbackTrack.storage_url;
    }

    if (musicSrc && !buildingMusicRef.current) {
      const audio = new Audio(musicSrc);
      audio.loop = true;
      audio.volume = 0.3;
      audio.muted = musicMuted;
      audio.play().catch(() => console.log('[building] Music autoplay blocked'));
      buildingMusicRef.current = audio;
    }

    return () => {
      if (buildingMusicRef.current) {
        buildingMusicRef.current.pause();
        buildingMusicRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, selectedMusicId]);

  // Sync muted state to audio element
  useEffect(() => {
    if (buildingMusicRef.current) {
      buildingMusicRef.current.muted = musicMuted;
    }
  }, [musicMuted]);

  function toggleMusicMute() {
    setMusicMuted((prev) => {
      const next = !prev;
      sessionStorage.setItem('spizzzy_gen_music_muted', next ? '1' : '0');
      return next;
    });
  }

  if (!storyId || !childName) return null;

  const categories = ['All', ...new Set(musicTracks.map((t) => t.category))];
  const filteredTracks = musicCategory === 'All' ? musicTracks : musicTracks.filter((t) => t.category === musicCategory);

  // Voice preview
  async function previewVoice(voiceId: string, elevenLabsVoiceId: string) {
    if (previewingVoice === voiceId) { voicePreviewRef.current?.pause(); setPreviewingVoice(null); return; }
    setPreviewingVoice(voiceId);
    try {
      const firstPageText = generatedStory!.pages[0]?.text || 'Once upon a time...';
      const res = await fetch('/api/preview-voice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: firstPageText.substring(0, 200), voiceId: elevenLabsVoiceId }) });
      if (!res.ok) throw new Error('Preview failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (!voicePreviewRef.current) voicePreviewRef.current = new Audio();
      voicePreviewRef.current.src = url;
      voicePreviewRef.current.onended = () => setPreviewingVoice(null);
      voicePreviewRef.current.play().catch(() => setPreviewingVoice(null));
    } catch { setPreviewingVoice(null); }
  }

  // Music preview
  function toggleMusicPreview(track: MusicTrack) {
    if (playingMusicId === track.id) { musicPreviewRef.current?.pause(); setPlayingMusicId(null); return; }
    if (!musicPreviewRef.current) musicPreviewRef.current = new Audio();
    musicPreviewRef.current.src = track.storage_url;
    musicPreviewRef.current.volume = 0.5;
    musicPreviewRef.current.onended = () => setPlayingMusicId(null);
    musicPreviewRef.current.play().catch(() => setPlayingMusicId(null));
    setPlayingMusicId(track.id);
  }

  // Create My Book — generate story, then cover, then pages + narration
  async function handleCreateBook() {
    if (!selectedVoiceId) { setError('Please select a narrator voice'); return; }
    if (!storyId) { setError('No story selected'); return; }

    // Stop previews
    voicePreviewRef.current?.pause();
    musicPreviewRef.current?.pause();
    setPreviewingVoice(null);
    setPlayingMusicId(null);

    // Switch to building UI
    setPhase('building');
    setBuildPhase('writing_story');

    // STEP 1: Generate story (Opus) — creates the book row + pages in DB
    let newBookId: string;
    // Backstop: if photoDescription is missing but we have a photo, re-analyze before generating
    let effectivePhotoDescription = photoDescription;
    const childPhoto = uploadedPhotos.find((p) => p.label === 'child');
    const childPhotoPath = childPhoto?.storagePath || photoStoragePaths.find(p => p.label === 'child')?.storagePath;
    if (!effectivePhotoDescription && childPhotoPath) {
      console.warn('[finalize] photoDescription missing, re-analyzing photo before story generation');
      try {
        const reanalyzeRes = await fetch('/api/analyze-photo-standalone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storagePath: childPhotoPath }),
        });
        if (reanalyzeRes.ok) {
          const { description } = await reanalyzeRes.json();
          if (description) {
            effectivePhotoDescription = description;
            useCreationWizard.getState().setPhotoDescription(description);
            console.log('[finalize] Backstop re-analysis succeeded, length:', description.length);
          }
        }
      } catch (err) {
        console.warn('[finalize] Backstop re-analysis failed:', err);
      }
    }

    try {
      console.log('[finalize] Starting story generation...');
      const storyRes = await fetch('/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: 'en',
          storyId,
          name: childName,
          age: childAge,
          gender: childGender || 'boy',
          traits: childTraits,
          interests: childInterests,
          photoDescription: effectivePhotoDescription || undefined,
          storagePath: childPhotoPath || undefined,
          styleKey: selectedStyleKey || undefined,
        }),
      });

      if (!storyRes.ok) {
        const errorData = await storyRes.json().catch(() => ({}));
        console.error('[finalize] Story generation failed:', errorData);
        setBuildPhase('failed');
        return;
      }

      const storyData = await storyRes.json();
      newBookId = storyData.bookId;
      setGeneratedStory(storyData.story, newBookId);
      console.log('[finalize] Story generated, bookId:', newBookId);

      // Save photos to DB with the new bookId (use uploadedPhotos if available, fall back to persisted storagePaths)
      const photoPaths = uploadedPhotos.length > 0
        ? uploadedPhotos.map((p) => ({ storagePath: p.storagePath, label: p.label }))
        : photoStoragePaths;

      if (photoPaths.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const photoRows = photoPaths.map((p) => ({
            book_id: newBookId,
            user_id: user.id,
            storage_path: p.storagePath,
            label: p.label,
          }));
          const { error: photoInsertError } = await supabase.from('photos').insert(photoRows);
          if (photoInsertError) {
            console.error('[finalize] Photo DB insert FAILED — illustrations will have no face reference:', photoInsertError.message);
          } else {
            console.log(`[finalize] ${photoRows.length} photo(s) saved to DB for book ${newBookId}`);
          }
        }
      } else {
        console.warn('[finalize] No photos available to insert — illustrations will render without face reference');
      }

      // Save music + voice selection to metadata
      try {
        const { data: currentBook } = await supabase.from('books').select('metadata').eq('id', newBookId).single();
        await supabase.from('books').update({
          metadata: { ...((currentBook?.metadata as Record<string, unknown>) || {}), selected_music_id: selectedMusicId, narrator_voice_id: selectedVoiceId, narrator_voice_name: getVoice(selectedVoiceId)?.name },
        }).eq('id', newBookId);
      } catch { /* continue */ }
    } catch (err) {
      console.error('[finalize] Story generation error:', err);
      setBuildPhase('failed');
      return;
    }

    // Update progress now that we know page count
    const pageCount = generatedStory?.pages?.length || 3;
    setBuildProgress({ illustrationsComplete: 0, narrationsComplete: 0, total: pageCount * 2 });
    setBuildPhase('cover_generating');

    const useWorker = process.env.NEXT_PUBLIC_USE_WORKER_BUILD !== 'false';

    if (useWorker) {
      // WORKER PATH: enqueue the background job (proven via R78a)
      try {
        console.log(`[finalize] using worker build for ${newBookId}`);
        const enqueueRes = await fetch('/api/enqueue-build', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookId: newBookId }),
        });
        if (enqueueRes.ok) {
          const { runId } = await enqueueRes.json();
          console.log(`[finalize] Worker enqueued, runId: ${runId}`);
          // Build screen polls book-status as usual — worker updates status
          return;
        }
        console.warn('[finalize] Worker enqueue failed, falling back to legacy inline build');
      } catch (err) {
        console.warn('[finalize] Worker enqueue error, falling back to legacy inline build:', err);
      }
    }

    // LEGACY INLINE PATH (fallback or USE_WORKER_BUILD=false)
    console.log(`[finalize] using legacy inline build for ${newBookId}`);

    // STEP 2a: Generate canonical character sheet (identity anchor for cover + pages)
    try {
      console.log('[finalize] Generating character sheet...');
      const sheetRes = await fetch('/api/generate-character-sheet', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookId: newBookId }),
      });
      if (sheetRes.ok) {
        console.log('[finalize] Character sheet generated');
      } else {
        console.warn('[finalize] Character sheet generation failed, continuing without');
      }
    } catch (err) {
      console.warn('[finalize] Character sheet error (non-fatal):', err);
    }

    // STEP 2b: Generate cover (pages need it as reference)
    try {
      console.log('[finalize] Starting cover generation...');
      const coverRes = await fetch('/api/generate-cover', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookId: newBookId }),
      });
      if (!coverRes.ok) {
        const errorData = await coverRes.json().catch(() => ({}));
        if (errorData.bookFailed) {
          console.error('[finalize] Cover failed terminally:', errorData.detail);
          setBuildPhase('failed');
          return;
        }
        setBuildPhase('failed');
        return;
      }
      console.log('[finalize] Cover generated successfully');
    } catch (err) {
      console.error('[finalize] Cover generation error:', err);
      setBuildPhase('failed');
      return;
    }

    // STEP 3: Fire pages + narration in parallel (cover is now in DB)
    fetch('/api/generate-illustrations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookId: newBookId }),
    }).catch((err) => console.error('Failed to start illustrations:', err));

    fetch('/api/generate-narration', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookId: newBookId, voiceId: selectedVoiceId, language }),
    }).catch((err) => console.error('Failed to start narration:', err));
  }

  async function retryBuild() {
    if (!bookId) {
      router.push('/create');
      return;
    }
    console.log('[finalize] Retrying build for existing bookId:', bookId);

    // Reset book status so polling picks up fresh progress
    await supabase.from('books').update({ status: 'generating' }).eq('id', bookId);
    await supabase.from('pages').update({ illustration_status: 'pending', illustration_url: null }).eq('book_id', bookId).in('illustration_status', ['error']);

    setPhase('building');
    setBuildPhase('cover_generating');
    setBuildProgress({ illustrationsComplete: 0, narrationsComplete: 0, total: generatedStory?.pages?.length ? generatedStory.pages.length * 2 : 6 });
    setCoverUrl(null);

    // Re-fire the same build sequence (sheet → cover → pages + narration)
    try {
      await fetch('/api/generate-character-sheet', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookId }),
      }).catch(() => {});

      const coverRes = await fetch('/api/generate-cover', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookId }),
      });
      if (!coverRes.ok) {
        setBuildPhase('failed');
        return;
      }

      fetch('/api/generate-illustrations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookId }),
      }).catch((err) => console.error('Failed to start illustrations:', err));

      fetch('/api/generate-narration', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookId, voiceId: selectedVoiceId, language }),
      }).catch((err) => console.error('Failed to start narration:', err));
    } catch (err) {
      console.error('[finalize] Retry build error:', err);
      setBuildPhase('failed');
    }
  }

  // ── Full-screen failure overlay ──
  if (buildPhase === 'failed') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-4">
        <VideoBackground />
        <div className="relative z-10 text-center max-w-md mx-auto">
          <p className="text-white/85 text-xl font-semibold mb-4" style={{ fontFamily: 'Georgia, serif' }}>
            We hit a snag with {childName}&apos;s book
          </p>
          <p className="text-white/60 text-base mb-8 leading-relaxed">
            Sometimes the magic doesn&apos;t land on the first try. We&apos;ve sent you an email &mdash; or you can try again now.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center w-full max-w-[320px] mx-auto">
            <button
              onClick={retryBuild}
              className="w-full sm:w-auto px-6 py-3 min-h-[48px] bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-full text-white font-semibold transition"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push('/library')}
              className="w-full sm:w-auto px-6 py-3 min-h-[48px] bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-full text-white transition"
            >
              Back to Library
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Full-screen immersive building / done overlay ──
  if (phase === 'building' || phase === 'done') {
    const isComplete = phase === 'done';

    // Build rotating sub-text
    const msgs = PHASE_MESSAGES[buildPhase];
    let subText = '';
    if (buildPhase === 'pages') {
      // Show real scene text from story pages, with filler fallback
      const pageTexts = generatedStory?.pages?.map(p => {
        const text = p.text || '';
        return text.length > 80 ? text.substring(0, 77) + '...' : text;
      }).filter(Boolean) || [];
      const source = pageTexts.length > 0 ? pageTexts : PAGE_FILLER;
      subText = source[rotatingIdx % source.length];
    } else if (msgs.rotating.length > 0) {
      subText = msgs.rotating[rotatingIdx % msgs.rotating.length];
    }

    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-4">
        <VideoBackground />

        {/* Mute toggle */}
        <button
          onClick={toggleMusicMute}
          aria-label={musicMuted ? 'Unmute music' : 'Mute music'}
          className="fixed z-[60] pt-safe"
          style={{
            top: 'calc(16px + env(safe-area-inset-top, 0px))',
            right: 16,
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.06)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: musicMuted ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.75)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s, border-color 0.2s',
          }}
        >
          {musicMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>

        <div className="relative z-10 flex flex-col items-center">
        {/* Cover with fade-in — hidden during story writing */}
        {buildPhase !== 'writing_story' && (
        <div className="mb-8 relative">
          <div style={{ transition: 'opacity 0.6s ease-in-out', opacity: coverUrl ? 1 : 0.3 }}>
            <CoverImage
              coverUrl={coverUrl}
              title={generatedStory?.title || ''}
              childName={childName}
              size="building"
            />
          </div>
          {!coverUrl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ borderRadius: '1rem' }}>
              <div className="w-10 h-10 mb-3 rounded-full border-4 border-white/30 border-t-white/90 animate-spin" />
              <p className="text-sm font-medium text-white/80">Painting your cover...</p>
            </div>
          )}
        </div>
        )}

        {isComplete ? (
          <div key="complete" className="text-center build-fade-in">
            <p className="text-white text-xl font-semibold mb-2" style={{ fontFamily: 'Georgia, serif' }}>Your book is ready!</p>
            <p className="text-white/50 text-sm mb-6">Time to read the story</p>
            <button
              onClick={async () => {
                if (buildingMusicRef.current) { buildingMusicRef.current.pause(); buildingMusicRef.current = null; }
                try {
                  const { createShareSlug } = await import('@/lib/utils/share');
                  await supabase.from('books').update({ status: 'complete', share_slug: createShareSlug(), is_public: false }).eq('id', bookId);
                } catch { /* continue */ }
                router.push(`/reader/${bookId}?skipCover=true`);
              }}
              className="px-10 py-4 min-h-[48px] bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-full text-lg font-semibold transition shadow-lg shadow-purple-900/40"
            >
              Start Reading
            </button>
          </div>
        ) : (
          <div key="building" className="w-full max-w-[360px] px-4 text-center build-fade-in">
            <p className="text-white text-lg font-medium mb-1">{msgs.primary}</p>
            {subText && (
              <p className="text-white/85 text-base mb-4 italic transition-opacity duration-500" key={subText.substring(0, 20)}>
                {subText}
              </p>
            )}
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-200 ease-out"
                style={{ width: `${Math.min(smoothProgress, 100)}%` }}
              />
            </div>
            <p className="text-white/70 text-sm mt-6 max-w-full sm:max-w-[420px] text-center leading-relaxed pb-safe">
              You&apos;re welcome to stick around, but no need to wait here. We&apos;ll send you an email as soon as your book is ready.
            </p>
          </div>
        )}

        </div>{/* end z-10 wrapper */}

        {/* Fade-in animation */}
        <style jsx global>{`
          .build-fade-in {
            animation: buildFadeIn 0.6s ease-in-out;
          }
          @keyframes buildFadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // ── Select view (voice + music) ──
  return (
    <div>
      <WizardProgress currentStep="finalize" />

      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '2.2rem', fontWeight: 500, color: 'var(--text-primary)' }}>Finalize your book</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Choose a narrator voice and background music for {childName}&apos;s story</p>
      </div>

      {/* Voice selector */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '1.3rem', marginBottom: 8 }}>Narrator voice</h2>
        <p style={{ color: 'rgba(255,255,255,0.50)', fontSize: '0.88rem', marginBottom: 16 }}>
          Choose who will read the story aloud. Click &ldquo;Preview&rdquo; to hear a sample.
        </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {STORYMAGIC_VOICES.map((voice) => {
              const isSelected = selectedVoiceId === voice.id;
              const isPreviewing = previewingVoice === voice.id;
              return (
                <button
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice.id)}
                  className="flex items-center gap-3 text-left transition-all duration-200"
                  style={{
                    background: isSelected ? 'rgba(155,125,212,0.12)' : 'rgba(255,255,255,0.06)',
                    backdropFilter: 'blur(12px)',
                    border: isSelected ? '2px solid rgba(155,125,212,0.70)' : '1px solid rgba(255,255,255,0.10)',
                    boxShadow: isSelected ? '0 0 0 1px rgba(155,125,212,0.40), 0 0 20px rgba(155,125,212,0.15)' : 'none',
                    borderRadius: '1rem',
                    padding: '12px 14px',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = 'rgba(155,125,212,0.40)'; } }}
                  onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; } }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isSelected ? 'rgba(155,125,212,0.25)' : 'rgba(255,255,255,0.08)',
                    color: isSelected ? 'rgba(200,180,255,0.90)' : 'rgba(255,255,255,0.30)',
                  }}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                  </div>

                  {/* Name + meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 500, fontSize: '0.92rem', lineHeight: 1.3 }}>{voice.name}</p>
                    <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: '0.75rem', textTransform: 'capitalize' }}>
                      {voice.gender} &middot; {voice.accent === 'british' ? 'British' : 'American'}
                    </p>
                  </div>

                  {/* Preview button */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); previewVoice(voice.id, voice.id); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); previewVoice(voice.id, voice.id); } }}
                    className="transition-all duration-200"
                    style={{
                      width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isPreviewing ? 'linear-gradient(135deg, rgba(155,125,212,0.90), rgba(126,200,227,0.80))' : 'rgba(255,255,255,0.08)',
                      border: isPreviewing ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(255,255,255,0.15)',
                      color: isPreviewing ? '#fff' : 'rgba(255,255,255,0.60)',
                      cursor: 'pointer',
                    }}
                    aria-label={isPreviewing ? `Stop ${voice.name} preview` : `Play ${voice.name} preview`}
                  >
                    {isPreviewing ? (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <rect x="2" y="1" width="3" height="10" rx="0.5" />
                        <rect x="7" y="1" width="3" height="10" rx="0.5" />
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M2.5 1.5L10 6L2.5 10.5V1.5Z" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-3">
            <ComingSoon title="Use your own voice" description="Make the book feel even more personal and fun." />
          </div>
      </section>

      {/* Music selector */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '1.3rem', marginBottom: 8 }}>Background music</h2>
        <p style={{ color: 'rgba(255,255,255,0.50)', fontSize: '0.88rem', marginBottom: 16 }}>Plays softly behind the narration. Click a track to preview it.</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setMusicCategory(cat)} style={{
              background: musicCategory === cat ? 'linear-gradient(135deg, rgba(155,125,212,0.70), rgba(126,200,227,0.60))' : 'rgba(255,255,255,0.07)',
              border: musicCategory === cat ? '1px solid rgba(255,255,255,0.20)' : '1px solid rgba(255,255,255,0.14)',
              color: musicCategory === cat ? 'white' : 'rgba(255,255,255,0.60)',
              borderRadius: '9999px', padding: '10px 18px', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.25s ease', whiteSpace: 'nowrap', minHeight: 44,
              boxShadow: musicCategory === cat ? '0 4px 16px rgba(155,125,212,0.30)' : 'none',
            }}>
              {cat}
            </button>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTracks.map((track) => {
            const isSelected = selectedMusicId === track.id;
            const isPlaying = playingMusicId === track.id;
            return (
              <div key={track.id} className="transition-all duration-300" style={{
                background: isSelected ? 'rgba(245,200,66,0.06)' : 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(12px) saturate(150%)', WebkitBackdropFilter: 'blur(12px) saturate(150%)',
                border: isSelected ? '2px solid #F5C842' : '1px solid rgba(255,255,255,0.10)',
                boxShadow: isSelected ? 'inset 0 0 20px rgba(255,255,255,0.04), 0 0 0 1px #F5C842, 0 0 24px rgba(245,200,66,0.25)' : 'inset 0 0 20px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.20)',
                borderRadius: '1.5rem', padding: '20px 24px', cursor: 'pointer', position: 'relative',
              }}
                onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'rgba(245,200,66,0.40)'; } }}
                onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; } }}
              >
                {isSelected && <div style={{ position: 'absolute', top: 12, right: 12, width: 24, height: 24, background: '#F5C842', color: '#1A1000', fontSize: '0.72rem', fontWeight: 700, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&#10003;</div>}
                <button onClick={() => setSelectedMusic(track.id)} className="w-full text-left" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <p style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 500, marginBottom: 6 }}>{track.name}</p>
                  <p style={{ color: 'rgba(255,255,255,0.60)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: 8 }}>{track.description}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {track.mood.map((m) => <span key={m} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.55)', borderRadius: '9999px', padding: '3px 10px', fontSize: '0.72rem' }}>{m}</span>)}
                  </div>
                </button>
                <button onClick={() => toggleMusicPreview(track)} style={{
                  marginTop: 10,
                  background: isPlaying ? 'linear-gradient(135deg, rgba(155,125,212,0.80), rgba(126,200,227,0.70))' : 'rgba(255,255,255,0.08)',
                  border: isPlaying ? '1px solid rgba(255,255,255,0.20)' : '1px solid rgba(255,255,255,0.18)',
                  color: isPlaying ? '#fff' : 'rgba(255,255,255,0.75)',
                  borderRadius: '9999px', padding: '6px 16px', fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.2s ease',
                }}>
                  {isPlaying ? 'Stop' : 'Play'}
                </button>
              </div>
            );
          })}
        </div>
        <div className="mt-3">
          <ComingSoon title="Adaptive Music" description="Music that adapts to the story, making it feel like a real movie." />
        </div>
      </section>

      {error && (
        <div style={{ marginBottom: 24, padding: 12, background: 'rgba(220,50,50,0.15)', border: '1px solid rgba(220,50,50,0.30)', borderRadius: '1rem', color: 'rgba(255,150,150,0.95)', fontSize: '0.88rem' }}>{error}</div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pb-8">
        <button onClick={() => router.push('/create/stories')} className="btn-secondary min-h-[44px]">Back</button>
        <button onClick={handleCreateBook} disabled={!selectedVoiceId} className="btn-primary">
          &#10022; Create My Book
        </button>
      </div>
    </div>
  );
}
