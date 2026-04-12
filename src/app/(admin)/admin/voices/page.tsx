'use client';

import { useState, useRef } from 'react';
import { NARRATOR_VOICES } from '@/lib/elevenlabs/voices';

export default function VoicesPage() {
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [testText, setTestText] = useState('Once upon a time, in a land full of wonder and magic, there lived a brave little child who loved adventures.');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function previewVoice(voiceId: string, elevenLabsVoiceId: string) {
    if (previewingId === voiceId) {
      audioRef.current?.pause();
      setPreviewingId(null);
      return;
    }

    setPreviewingId(voiceId);
    try {
      const res = await fetch('/api/preview-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: testText, voiceId: elevenLabsVoiceId }),
      });
      if (!res.ok) throw new Error('Preview failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.src = url;
      audioRef.current.onended = () => setPreviewingId(null);
      audioRef.current.play().catch(() => setPreviewingId(null));
    } catch {
      setPreviewingId(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Voice Manager</h1>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-500 mb-2">Test text</label>
        <textarea
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Gender</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Tone</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Description</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">ElevenLabs ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Preview</th>
            </tr>
          </thead>
          <tbody>
            {NARRATOR_VOICES.map((voice) => (
              <tr key={voice.id} className="border-b border-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{voice.name}</td>
                <td className="px-4 py-3 text-gray-500 capitalize">{voice.gender}</td>
                <td className="px-4 py-3 text-gray-500 capitalize">{voice.tone}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{voice.description}</td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{voice.voiceId}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => previewVoice(voice.id, voice.voiceId)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                      previewingId === voice.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {previewingId === voice.id ? 'Stop' : 'Test'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Voice IDs are from ElevenLabs premade voices. Edit src/lib/elevenlabs/voices.ts to add or change voices.
      </p>
    </div>
  );
}
