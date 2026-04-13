'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCreationWizard } from '@/stores/creation-wizard';
import { createClient } from '@/lib/supabase/client';
import WizardProgress from '@/components/wizard/WizardProgress';
import { NARRATOR_VOICES } from '@/lib/elevenlabs/voices';
import { FALLBACK_TRACKS, suggestTrack, type MusicTrack } from '@/lib/music/tracks';
import CoverImage from '@/components/reader/CoverImage';
import VideoBackground from '@/components/ui/VideoBackground';

type FinalizationPhase = 'select' | 'building' | 'done';

function getBuildingMessage(percent: number): string {
  if (percent < 30) return 'Painting your illustrations...';
  if (percent < 60) return 'Adding colors and details...';
  if (percent < 80) return 'Recording your narration...';
  if (percent < 100) return 'Putting the finishing touches...';
  return 'Your book is ready!';
}

export default function FinalizePage() {
  const router = useRouter();
  const supabase = createClient();
  const {
    bookId,
    generatedStory,
    childName,
    selectedVoiceId,
    selectedMusicId,
    setSelectedVoice,
    setSelectedMusic,
    language,
  } = useCreationWizard();

  const [phase, setPhase] = useState<FinalizationPhase>('select');
  const [error, setError] = useState<string | null>(null);
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>(FALLBACK_TRACKS);
  const [musicCategory, setMusicCategory] = useState('All');

  // Building state
  const [buildProgress, setBuildProgress] = useState({ illustrationsComplete: 0, narrationsComplete: 0, total: 0 });
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const buildingMusicRef = useRef<HTMLAudioElement | null>(null);

  // Audio preview refs
  const voicePreviewRef = useRef<HTMLAudioElement | null>(null);
  const musicPreviewRef = useRef<HTMLAudioElement | null>(null);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [playingMusicId, setPlayingMusicId] = useState<string | null>(null);

  // Redirect if no book
  useEffect(() => {
    if (!bookId || !generatedStory) {
      router.replace('/create/theme');
    }
  }, [bookId, generatedStory, router]);

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

  // Auto-select Liam for Hebrew books
  console.log('[finalize] wizard language:', language);
  useEffect(() => {
    if (language === 'he') {
      console.log('[finalize] Hebrew detected — auto-selecting Liam voice');
      setSelectedVoice('TX3LPaxmHKxFdv7VOQHJ');
    }
  }, [language, setSelectedVoice]);

  // Auto-suggest music
  useEffect(() => {
    if (!selectedMusicId && generatedStory && musicTracks.length > 0) {
      const moods = generatedStory.pages.map((p) => p.mood);
      const suggested = suggestTrack(musicTracks, moods);
      setSelectedMusic(suggested.id);
    }
  }, [generatedStory, selectedMusicId, setSelectedMusic, musicTracks]);

  // Poll for building progress
  useEffect(() => {
    if (phase !== 'building' || !bookId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/book-status?bookId=${bookId}`);
        if (!res.ok) return;
        const data = await res.json();

        const pageCount = data.total || 0;
        const illComplete = data.illustrationsComplete ?? data.complete ?? 0;
        const narComplete = data.narrationsComplete ?? 0;
        const totalSteps = pageCount * 2;

        console.log('[finalize] Poll:', { pageCount, illComplete, narComplete, totalSteps });

        setBuildProgress({ illustrationsComplete: illComplete, narrationsComplete: narComplete, total: totalSteps });

        if (pageCount > 0 && illComplete >= pageCount && narComplete >= pageCount) {
          clearInterval(interval);
          setPhase('done');
        }
      } catch { /* keep polling */ }
    }, 3000);

    return () => clearInterval(interval);
  }, [phase, bookId]);

  // Fetch cover URL eagerly (as soon as we have a bookId) — no .single() to avoid throw on 0 rows
  useEffect(() => {
    if (!bookId || coverUrl) return;

    async function loadCover() {
      console.log('[finalize] Loading cover for bookId:', bookId);

      // Try selected cover first
      const { data: selectedCovers } = await supabase
        .from('cover_options')
        .select('image_url')
        .eq('book_id', bookId)
        .eq('is_selected', true)
        .limit(1);

      if (selectedCovers && selectedCovers.length > 0 && selectedCovers[0].image_url) {
        console.log('[finalize] Found selected cover:', selectedCovers[0].image_url);
        setCoverUrl(selectedCovers[0].image_url);
        return;
      }

      // Fallback: any cover for this book
      const { data: anyCovers } = await supabase
        .from('cover_options')
        .select('image_url')
        .eq('book_id', bookId)
        .order('created_at', { ascending: true })
        .limit(1);

      if (anyCovers && anyCovers.length > 0 && anyCovers[0].image_url) {
        console.log('[finalize] Fallback cover:', anyCovers[0].image_url);
        setCoverUrl(anyCovers[0].image_url);
      } else {
        console.log('[finalize] No covers found for book:', bookId);
      }
    }
    loadCover();
  }, [bookId, coverUrl, supabase]);

  // Play background music during building phase
  useEffect(() => {
    if (phase !== 'building' && phase !== 'done') return;

    // Resolve selected music URL
    let musicSrc: string | null = null;
    if (selectedMusicId) {
      const fallbackTrack = FALLBACK_TRACKS.find((t) => t.id === selectedMusicId);
      if (fallbackTrack) musicSrc = fallbackTrack.storage_url;
    }

    if (musicSrc && !buildingMusicRef.current) {
      const audio = new Audio(musicSrc);
      audio.loop = true;
      audio.volume = 0.3;
      audio.play().catch(() => console.log('[building] Music autoplay blocked'));
      buildingMusicRef.current = audio;
    }

    return () => {
      if (buildingMusicRef.current) {
        buildingMusicRef.current.pause();
        buildingMusicRef.current = null;
      }
    };
  }, [phase, selectedMusicId]);

  if (!bookId || !generatedStory) return null;

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

  // Create My Book — trigger illustrations + narration in parallel, switch to building view
  async function handleCreateBook() {
    if (!selectedVoiceId) { setError('Please select a narrator voice'); return; }

    // Stop previews
    voicePreviewRef.current?.pause();
    musicPreviewRef.current?.pause();
    setPreviewingVoice(null);
    setPlayingMusicId(null);

    // Save music selection + voice to metadata
    try {
      const { data: currentBook } = await supabase.from('books').select('metadata').eq('id', bookId).single();
      await supabase.from('books').update({
        metadata: { ...((currentBook?.metadata as Record<string, unknown>) || {}), selected_music_id: selectedMusicId, narrator_voice_id: selectedVoiceId, narrator_voice_name: NARRATOR_VOICES.find((v) => v.id === selectedVoiceId)?.name },
      }).eq('id', bookId);
    } catch { /* continue */ }

    // Start illustrations (fire and forget)
    fetch('/api/generate-illustrations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookId }),
    }).catch((err) => console.error('Failed to start illustrations:', err));

    // Start narration (fire and forget)
    fetch('/api/generate-narration', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookId, voiceId: selectedVoiceId, language }),
    }).catch((err) => console.error('Failed to start narration:', err));

    setBuildProgress({ illustrationsComplete: 0, narrationsComplete: 0, total: (generatedStory?.pages.length || 0) * 2 });
    setPhase('building');
  }

  // ── Full-screen immersive building / done overlay ──
  if (phase === 'building' || phase === 'done') {
    const completed = buildProgress.illustrationsComplete + buildProgress.narrationsComplete;
    const percent = buildProgress.total > 0 ? Math.round((completed / buildProgress.total) * 100) : 0;
    const isComplete = phase === 'done';

    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-4" style={{ paddingLeft: 240 }}>
        <VideoBackground />
        {/* Content above background — offset for sidebar */}
        <div className="relative z-10 flex flex-col items-center">
        {/* Cover image with title overlay — same component as reader */}
        <div className="mb-8">
          <CoverImage
            coverUrl={coverUrl}
            title={generatedStory?.title || ''}
            childName={childName}
            size="building"
          />
        </div>

        {/* Phase content — fades between building and complete */}
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
              className="px-10 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-lg font-semibold transition shadow-lg shadow-purple-900/40"
            >
              Start Reading
            </button>
          </div>
        ) : (
          <div key="building" className="w-[280px] md:w-[360px] text-center build-fade-in">
            <p className="text-white text-lg font-medium mb-1">{getBuildingMessage(percent)}</p>
            <p className="text-white/30 text-sm mb-4">{completed} of {buildProgress.total} steps complete</p>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
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
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Choose a narrator voice and background music for &ldquo;{generatedStory.title}&rdquo;</p>
      </div>

      {/* Voice selector */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '1.3rem', marginBottom: 8 }}>Narrator voice</h2>
        <p style={{ color: 'rgba(255,255,255,0.50)', fontSize: '0.88rem', marginBottom: 16 }}>
          {language === 'he' ? 'Hebrew books use Liam \u2014 the best narrator for natural Hebrew.' : 'Choose who will read the story aloud. Click \u201CPreview\u201D to hear a sample.'}
        </p>
        {language === 'he' ? (
          <div style={{
            background: 'rgba(245,200,66,0.06)',
            backdropFilter: 'blur(12px) saturate(150%)', WebkitBackdropFilter: 'blur(12px) saturate(150%)',
            border: '2px solid #F5C842',
            boxShadow: 'inset 0 0 20px rgba(255,255,255,0.04), 0 0 0 1px #F5C842, 0 0 24px rgba(245,200,66,0.25)',
            borderRadius: '1.5rem', padding: '20px 24px', position: 'relative', maxWidth: 360,
          }}>
            <div style={{ position: 'absolute', top: 12, right: 12, width: 24, height: 24, background: '#F5C842', color: '#1A1000', fontSize: '0.72rem', fontWeight: 700, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&#10003;</div>
            <div className="flex items-center gap-3 mb-2">
              <div style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(245,200,66,0.20)', color: 'rgba(255,255,255,0.30)' }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
              </div>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 500 }}>Liam</p>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem' }}>Male &middot; Hebrew Narrator</p>
              </div>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.88rem', lineHeight: 1.5 }}>
              The only narrator that speaks natural Hebrew
            </p>
            <div style={{
              background: 'rgba(126,200,227,0.15)',
              border: '1px solid rgba(126,200,227,0.40)',
              color: '#7EC8E3',
              borderRadius: 9999,
              padding: '3px 12px',
              fontSize: '0.75rem',
              display: 'inline-block',
              marginTop: 8,
            }}>
              &#10003; Auto-selected for Hebrew
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {NARRATOR_VOICES.map((voice) => {
              const isSelected = selectedVoiceId === voice.id;
              const isPreviewing = previewingVoice === voice.id;
              return (
                <div key={voice.id} className="transition-all duration-300" style={{
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
                  <button onClick={() => setSelectedVoice(voice.id)} className="w-full text-left" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <div className="flex items-center gap-3 mb-2">
                      <div style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? 'rgba(245,200,66,0.20)' : 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.30)' }}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                      </div>
                      <div>
                        <p style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 500 }}>{voice.name}</p>
                        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', textTransform: 'capitalize' }}>{voice.gender} &middot; {voice.tone}</p>
                      </div>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.88rem', lineHeight: 1.5 }}>{voice.description}</p>
                  </button>
                  <button onClick={() => previewVoice(voice.id, voice.voiceId)} style={{
                    marginTop: 10,
                    background: isPreviewing ? 'linear-gradient(135deg, rgba(155,125,212,0.80), rgba(126,200,227,0.70))' : 'rgba(255,255,255,0.08)',
                    border: isPreviewing ? '1px solid rgba(255,255,255,0.20)' : '1px solid rgba(255,255,255,0.18)',
                    color: isPreviewing ? '#fff' : 'rgba(255,255,255,0.75)',
                    borderRadius: '9999px', padding: '6px 16px', fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.2s ease',
                  }}>
                    {isPreviewing ? 'Stop' : 'Preview'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
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
              borderRadius: '9999px', padding: '7px 18px', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.25s ease', whiteSpace: 'nowrap',
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
      </section>

      {error && (
        <div style={{ marginBottom: 24, padding: 12, background: 'rgba(220,50,50,0.15)', border: '1px solid rgba(220,50,50,0.30)', borderRadius: '1rem', color: 'rgba(255,150,150,0.95)', fontSize: '0.88rem' }}>{error}</div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 32 }}>
        <button onClick={() => router.push('/create/preview')} className="btn-secondary">Back</button>
        <button onClick={handleCreateBook} disabled={!selectedVoiceId} className="btn-primary">
          &#10022; Create My Book
        </button>
      </div>
    </div>
  );
}
