'use client';

import { useState } from 'react';
import { FALLBACK_TRACKS } from '@/lib/music/tracks';
import { NARRATOR_VOICES } from '@/lib/elevenlabs/voices';

interface ReaderSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  currentMusicId: string | null;
  onMusicChange: (trackId: string) => void;
  narrationVolume: number;
  musicVolume: number;
  onNarrationVolumeChange: (v: number) => void;
  onMusicVolumeChange: (v: number) => void;
  currentVoiceId: string | null;
  bookId: string;
  onNarratorChange: () => void;
  isRegeneratingNarration: boolean;
}

export default function ReaderSettings({
  isOpen,
  onClose,
  currentMusicId,
  onMusicChange,
  narrationVolume,
  musicVolume,
  onNarrationVolumeChange,
  onMusicVolumeChange,
  currentVoiceId,
  bookId,
  onNarratorChange,
  isRegeneratingNarration,
}: ReaderSettingsProps) {
  const [showNarratorConfirm, setShowNarratorConfirm] = useState(false);
  const [selectedNewVoice, setSelectedNewVoice] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentVoice = NARRATOR_VOICES.find((v) => v.id === currentVoiceId);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-[55]" onClick={onClose} />

      {/* Slide-out panel */}
      <div className="fixed right-0 top-0 bottom-0 w-80 bg-gray-900 z-[56] shadow-2xl overflow-y-auto">
        <div className="p-5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Settings</h3>
            <button onClick={onClose} className="text-white/60 hover:text-white p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Volume controls */}
          <section className="mb-6">
            <h4 className="text-sm font-medium text-white/70 mb-3">Volume</h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-white/50 mb-1">
                  <span>Narration</span>
                  <span>{Math.round(narrationVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={narrationVolume}
                  onChange={(e) => onNarrationVolumeChange(parseFloat(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs text-white/50 mb-1">
                  <span>Music</span>
                  <span>{Math.round(musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={musicVolume}
                  onChange={(e) => onMusicVolumeChange(parseFloat(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>
            </div>
          </section>

          {/* Music selector */}
          <section className="mb-6">
            <h4 className="text-sm font-medium text-white/70 mb-3">Background Music</h4>
            <div className="space-y-1">
              {FALLBACK_TRACKS.map((track) => (
                <button
                  key={track.id}
                  onClick={() => onMusicChange(track.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                    currentMusicId === track.id
                      ? 'bg-purple-600/30 text-purple-300'
                      : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                  }`}
                >
                  <p className="font-medium">{track.name}</p>
                  <p className="text-xs opacity-60">{track.description}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Narrator */}
          <section>
            <h4 className="text-sm font-medium text-white/70 mb-3">
              Narrator: {currentVoice?.name || 'None'}
            </h4>

            {isRegeneratingNarration ? (
              <div className="flex items-center gap-2 text-purple-300 text-sm">
                <div className="animate-spin w-4 h-4 border-2 border-purple-300/30 border-t-purple-300 rounded-full" />
                Regenerating narration...
              </div>
            ) : showNarratorConfirm && selectedNewVoice ? (
              <div className="p-3 bg-white/5 rounded-lg">
                <p className="text-sm text-white/70 mb-3">
                  This will regenerate narration for all pages with{' '}
                  <strong className="text-white">{NARRATOR_VOICES.find((v) => v.id === selectedNewVoice)?.name}</strong>.
                  Continue?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onNarratorChange();
                      setShowNarratorConfirm(false);
                    }}
                    className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium"
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={() => setShowNarratorConfirm(false)}
                    className="px-3 py-1.5 bg-white/10 text-white/60 rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {NARRATOR_VOICES.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => {
                      if (voice.id !== currentVoiceId) {
                        setSelectedNewVoice(voice.id);
                        setShowNarratorConfirm(true);
                        // Update store so regeneration uses the new voice
                        import('@/stores/creation-wizard').then(({ useCreationWizard }) => {
                          useCreationWizard.getState().setSelectedVoice(voice.id);
                        });
                      }
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      currentVoiceId === voice.id
                        ? 'bg-purple-600/30 text-purple-300'
                        : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                    }`}
                  >
                    {voice.name}
                    <span className="text-xs opacity-50 ml-1">({voice.tone})</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
