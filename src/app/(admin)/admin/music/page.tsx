'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface MusicTrack {
  id: string;
  name: string;
  description: string | null;
  mood: string[];
  category: string;
  storage_url: string;
  duration_seconds: number;
  is_active: boolean;
  sort_order: number;
}

export default function MusicPage() {
  const supabase = createClient();
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [editing, setEditing] = useState<Partial<MusicTrack> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTracks();
  }, []);

  async function loadTracks() {
    const { data } = await supabase
      .from('music_tracks')
      .select('*')
      .order('sort_order');
    if (data) setTracks(data as MusicTrack[]);
  }

  function togglePlay(track: MusicTrack) {
    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = track.storage_url;
    audioRef.current.play().catch(() => {});
    audioRef.current.onended = () => setPlayingId(null);
    setPlayingId(track.id);
  }

  async function toggleActive(id: string, isActive: boolean) {
    await supabase.from('music_tracks').update({ is_active: !isActive }).eq('id', id);
    loadTracks();
  }

  async function handleUploadAndSave() {
    if (!editing) return;
    setUploading(true);

    try {
      let storageUrl = editing.storage_url || '';

      // Upload file if selected
      const file = fileInputRef.current?.files?.[0];
      if (file) {
        const path = `tracks/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from('music').upload(path, file, {
          contentType: 'audio/mpeg',
        });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('music').getPublicUrl(path);
        storageUrl = urlData.publicUrl;
      }

      const record = {
        name: editing.name || '',
        description: editing.description || '',
        mood: editing.mood || [],
        category: editing.category || 'General',
        storage_url: storageUrl,
        duration_seconds: editing.duration_seconds || 120,
        is_active: editing.is_active ?? true,
        sort_order: editing.sort_order || 0,
      };

      if (editing.id) {
        await supabase.from('music_tracks').update(record).eq('id', editing.id);
      } else {
        await supabase.from('music_tracks').insert(record);
      }

      setEditing(null);
      loadTracks();
    } catch (err) {
      console.error('Failed to save track:', err);
    } finally {
      setUploading(false);
    }
  }

  async function deleteTrack(track: MusicTrack) {
    if (!confirm(`Delete "${track.name}"?`)) return;
    await supabase.from('music_tracks').delete().eq('id', track.id);
    loadTracks();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Music Manager</h1>
        <button
          onClick={() =>
            setEditing({
              name: '',
              description: '',
              mood: [],
              category: 'General',
              storage_url: '',
              duration_seconds: 120,
              is_active: true,
              sort_order: tracks.length,
            })
          }
          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition"
        >
          Upload Track
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Category</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Moods</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Duration</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Active</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tracks.map((track) => (
              <tr key={track.id} className="border-b border-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{track.name}</td>
                <td className="px-4 py-3 text-gray-500">{track.category}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {track.mood.map((m) => (
                      <span key={m} className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">{m}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{track.duration_seconds}s</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(track.id, track.is_active)}
                    className={`w-8 h-5 rounded-full transition ${
                      track.is_active ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                      track.is_active ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => togglePlay(track)} className="text-purple-600 hover:underline text-xs">
                      {playingId === track.id ? 'Stop' : 'Play'}
                    </button>
                    <button onClick={() => setEditing(track)} className="text-gray-600 hover:underline text-xs">Edit</button>
                    <button onClick={() => deleteTrack(track)} className="text-red-500 hover:underline text-xs">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {tracks.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No music tracks yet. Upload your first track.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit/Upload modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditing(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editing.id ? 'Edit Track' : 'Upload Track'}
            </h2>
            <div className="space-y-3">
              <input
                value={editing.name || ''}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Track name"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <input
                value={editing.description || ''}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                placeholder="Description"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <input
                value={editing.category || ''}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                placeholder="Category (e.g., Whimsical, Adventure)"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <input
                value={editing.mood?.join(', ') || ''}
                onChange={(e) => setEditing({ ...editing, mood: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                placeholder="Moods (comma-separated: magical, happy)"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <div>
                <label className="block text-xs text-gray-500 mb-1">Audio file (MP3)</label>
                <input ref={fileInputRef} type="file" accept="audio/mpeg,audio/mp3" className="text-sm" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleUploadAndSave}
                  disabled={uploading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {uploading ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => setEditing(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
