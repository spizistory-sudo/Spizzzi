'use client';

import { useState, useCallback } from 'react';
import type { Book } from '@/types/book';

interface ShareModalProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareModal({ book, isOpen, onClose }: ShareModalProps) {
  const [isPublic, setIsPublic] = useState(book.is_public);
  const [shareSlug, setShareSlug] = useState(book.share_slug);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const shareUrl = shareSlug ? `${appUrl}/share/${shareSlug}` : null;

  const togglePublic = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/books/${book.id}/share`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !isPublic }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsPublic(data.is_public);
        setShareSlug(data.share_slug);
      }
    } catch (err) {
      console.error('Failed to toggle share:', err);
    } finally {
      setLoading(false);
    }
  }, [book.id, isPublic]);

  const copyLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  const handleShare = useCallback(async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: book.title,
          text: `Check out this personalized story for ${book.child_name}!`,
          url: shareUrl,
        });
      } catch {
        // User cancelled share
      }
    }
  }, [book.title, book.child_name, shareUrl]);

  const downloadPdf = useCallback(async () => {
    setPdfLoading(true);
    try {
      const res = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book.id }),
      });
      if (!res.ok) throw new Error('PDF generation failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${book.title.replace(/[^a-zA-Z0-9 ]/g, '')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download failed:', err);
    } finally {
      setPdfLoading(false);
    }
  }, [book.id, book.title]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-semibold text-gray-900 mb-4">Share & Export</h2>

        {/* Public toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-4">
          <div>
            <p className="font-medium text-gray-900">Make this book public</p>
            <p className="text-sm text-gray-500">Anyone with the link can read it</p>
          </div>
          <button
            onClick={togglePublic}
            disabled={loading}
            className={`relative w-12 h-7 rounded-full transition ${
              isPublic ? 'bg-purple-600' : 'bg-gray-300'
            } ${loading ? 'opacity-50' : ''}`}
          >
            <div
              className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                isPublic ? 'translate-x-5.5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Share URL */}
        {isPublic && shareUrl && (
          <div className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 truncate"
              />
              <button
                onClick={copyLink}
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition whitespace-nowrap"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* Share buttons */}
            <div className="flex gap-2 mt-3">
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={handleShare}
                  className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition"
                >
                  Share
                </button>
              )}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${book.title} — ${shareUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition text-center"
              >
                WhatsApp
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent(book.title)}&body=${encodeURIComponent(`Check out this story: ${shareUrl}`)}`}
                className="flex-1 py-2.5 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition text-center"
              >
                Email
              </a>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-100 my-4" />

        {/* PDF download */}
        <button
          onClick={downloadPdf}
          disabled={pdfLoading}
          className="w-full flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
        >
          {pdfLoading ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full" />
              Generating PDF...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download PDF
            </>
          )}
        </button>
      </div>
    </div>
  );
}
