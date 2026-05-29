'use client';

import { useState, useRef, useCallback } from 'react';
import { useCreationWizard } from '@/stores/creation-wizard';
import { createClient } from '@/lib/supabase/client';

type PhotoLabel = 'child' | 'parent' | 'sibling' | 'pet';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function PhotoUpload() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadedPhotos, addPhoto, removePhoto } = useCreationWizard();

  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File, label: PhotoLabel) {
    if (file.size > MAX_FILE_SIZE) {
      setError(`${file.name} is too large. Maximum 5MB per photo.`);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError(`${file.name} is not a valid image file.`);
      return;
    }
    if (uploadedPhotos.length >= MAX_FILES) {
      setError(`Maximum ${MAX_FILES} photos allowed.`);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const photoId = crypto.randomUUID();
      const ext = file.name.split('.').pop() || 'jpg';
      const storagePath = `${user.id}/${photoId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      if (uploadError) throw uploadError;

      addPhoto({
        id: photoId,
        storagePath,
        label,
        previewUrl: URL.createObjectURL(file),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((file) => uploadFile(file, 'child'));
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uploadedPhotos.length]
  );

  async function handleRemove(photoId: string) {
    const photo = uploadedPhotos.find((p) => p.id === photoId);
    if (photo) {
      await supabase.storage.from('photos').remove([photo.storagePath]);
      URL.revokeObjectURL(photo.previewUrl);
      removePhoto(photoId);
    }
  }

  return (
    <div>
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          background: isDragging ? 'rgba(245,200,66,0.06)' : 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px) saturate(150%)',
          border: isDragging ? '2px dashed rgba(245,200,66,0.55)' : '2px dashed rgba(255,255,255,0.20)',
          borderRadius: '1.5rem',
          padding: '40px 32px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          opacity: uploadedPhotos.length >= MAX_FILES ? 0.5 : 1,
          pointerEvents: uploadedPhotos.length >= MAX_FILES ? 'none' : 'auto',
        }}
      >
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <svg className="w-10 h-10 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ color: 'rgba(255,255,255,0.35)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
        </svg>
        {uploading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin w-5 h-5 border-2 rounded-full" style={{ borderColor: 'rgba(126,200,227,0.3)', borderTopColor: 'var(--cyan)' }} />
            <p style={{ color: 'var(--cyan)', fontWeight: 500 }}>Uploading...</p>
          </div>
        ) : (
          <>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-body)', fontWeight: 500 }}>
              Drag & drop a photo, or click to browse
            </p>
            <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: '0.85rem', marginTop: 4 }}>
              JPG, PNG, or WebP &middot; Max 5MB
            </p>
          </>
        )}
      </div>

      {/* Uploaded photos */}
      {uploadedPhotos.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {uploadedPhotos.map((photo) => (
            <div key={photo.id} className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10">
              <img src={photo.previewUrl} alt="Uploaded" className="w-full h-full object-cover" />
              <button
                onClick={(e) => { e.stopPropagation(); handleRemove(photo.id); }}
                className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{ marginTop: 12, padding: 10, background: 'rgba(220,50,50,0.15)', border: '1px solid rgba(220,50,50,0.30)', borderRadius: '0.75rem', color: 'rgba(255,150,150,0.95)', fontSize: '0.82rem' }}>
          {error}
        </div>
      )}
    </div>
  );
}
