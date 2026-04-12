'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCreationWizard } from '@/stores/creation-wizard';
import { createClient } from '@/lib/supabase/client';
import WizardProgress from '@/components/wizard/WizardProgress';

const LABELS = [
  { value: 'child', label: 'Child (required)' },
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'pet', label: 'Pet' },
] as const;

type PhotoLabel = (typeof LABELS)[number]['value'];

const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function PhotosPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    selectedThemeSlug,
    childName,
    childAge,
    uploadedPhotos,
    addPhoto,
    removePhoto,
    setStep,
  } = useCreationWizard();

  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!selectedThemeSlug || !childName || !childAge) {
    router.replace('/create/theme');
    return null;
  }

  const hasChildPhoto = uploadedPhotos.some((p) => p.label === 'child');

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const photoId = crypto.randomUUID();
      const ext = file.name.split('.').pop() || 'jpg';
      const storagePath = `${user.id}/${photoId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      if (uploadError) throw uploadError;

      const previewUrl = URL.createObjectURL(file);

      addPhoto({
        id: photoId,
        storagePath,
        label,
        previewUrl,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const label: PhotoLabel = uploadedPhotos.length === 0 ? 'child' : 'child';
    Array.from(files).forEach((file) => uploadFile(file, label));
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
    [uploadedPhotos.length]
  );

  function handleLabelChange(photoId: string, newLabel: PhotoLabel) {
    // Update the label in the store by removing and re-adding
    const photo = uploadedPhotos.find((p) => p.id === photoId);
    if (photo) {
      removePhoto(photoId);
      addPhoto({ ...photo, label: newLabel });
    }
  }

  async function handleRemove(photoId: string) {
    const photo = uploadedPhotos.find((p) => p.id === photoId);
    if (photo) {
      // Remove from Supabase Storage (best-effort)
      await supabase.storage.from('photos').remove([photo.storagePath]);
      URL.revokeObjectURL(photo.previewUrl);
      removePhoto(photoId);
    }
  }

  function handleNext() {
    if (!hasChildPhoto) {
      setError('Please upload at least one photo of your child.');
      return;
    }
    setStep('preview');
    router.push('/create/preview');
  }

  return (
    <div>
      <WizardProgress currentStep="photos" />

      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '2.2rem', fontWeight: 500, color: 'var(--text-primary)' }}>Upload photos</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
          Upload a photo of {childName} so we can create illustrations that look like them.
          At least one photo of the child is required.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          background: isDragging ? 'rgba(245, 200, 66, 0.06)' : 'rgba(255, 255, 255, 0.06)',
          backdropFilter: 'blur(12px) saturate(150%)',
          WebkitBackdropFilter: 'blur(12px) saturate(150%)',
          border: isDragging ? '2px dashed rgba(245, 200, 66, 0.55)' : '2px dashed rgba(255, 255, 255, 0.20)',
          borderRadius: '1.5rem',
          padding: '64px 48px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: isDragging ? '0 0 32px rgba(245, 200, 66, 0.10)' : 'none',
          opacity: uploadedPhotos.length >= MAX_FILES ? 0.5 : 1,
          pointerEvents: uploadedPhotos.length >= MAX_FILES ? 'none' : 'auto',
        }}
      >
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <svg className="w-12 h-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ color: 'rgba(255, 255, 255, 0.35)' }}>
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
            <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontFamily: 'var(--font-body)', fontWeight: 500 }}>
              Drag & drop photos here, or click to browse
            </p>
            <p style={{ color: 'rgba(255, 255, 255, 0.40)', fontSize: '0.85rem', marginTop: 4 }}>
              JPG, PNG, or WebP &middot; Max 5MB each &middot; Up to {MAX_FILES} photos
            </p>
          </>
        )}
      </div>

      {/* Uploaded photos */}
      {uploadedPhotos.length > 0 && (
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {uploadedPhotos.map((photo) => (
            <div
              key={photo.id}
              className="glass overflow-hidden"
            >
              <div className="aspect-square relative">
                <img
                  src={photo.previewUrl}
                  alt={`Uploaded ${photo.label}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => handleRemove(photo.id)}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-3">
                <select
                  value={photo.label}
                  onChange={(e) =>
                    handleLabelChange(photo.id, e.target.value as PhotoLabel)
                  }
                  className="input-field"
                  style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                >
                  {LABELS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{ marginTop: 16, padding: 12, background: 'rgba(220,50,50,0.15)', border: '1px solid rgba(220,50,50,0.30)', borderRadius: '1rem', color: 'rgba(255,150,150,0.95)', fontSize: '0.88rem' }}>
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-3 mt-8">
        <button onClick={() => router.push('/create/details')} className="btn-secondary">
          Back
        </button>
        <button onClick={handleNext} disabled={uploading} className="btn-primary">
          Next: Generate Story
        </button>
        {!hasChildPhoto && uploadedPhotos.length === 0 && (
          <button
            onClick={() => { setStep('preview'); router.push('/create/preview'); }}
            style={{ color: 'rgba(255,255,255,0.40)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.88rem', transition: 'color 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.40)'; }}
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
