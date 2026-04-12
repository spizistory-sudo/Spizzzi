export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import BookReader from '@/components/reader/BookReader';
import type { Book, Page, CoverOption } from '@/types/book';
import { getTrackById } from '@/lib/music/tracks';

export default async function ReaderPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookId: string }>;
  searchParams: Promise<{ skipCover?: string }>;
}) {
  const { bookId } = await params;
  const { skipCover } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch the book
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .single();

  if (bookError || !book) {
    notFound();
  }

  const typedBook = book as Book;

  // Check access: either owner or public book
  if (!typedBook.is_public && typedBook.user_id !== user?.id) {
    notFound();
  }

  // Fetch pages (including narration data)
  const { data: pages } = await supabase
    .from('pages')
    .select('*')
    .eq('book_id', bookId)
    .order('page_number');

  if (!pages?.length) {
    notFound();
  }

  // Fetch selected cover — no .single() to avoid throwing on 0 rows
  const { data: selectedCovers } = await supabase
    .from('cover_options')
    .select('*')
    .eq('book_id', bookId)
    .eq('is_selected', true)
    .limit(1);

  let coverUrl: string | null = (selectedCovers as CoverOption[] | null)?.[0]?.image_url || null;

  // Fallback to any cover if none selected
  if (!coverUrl) {
    const { data: anyCovers } = await supabase
      .from('cover_options')
      .select('*')
      .eq('book_id', bookId)
      .order('created_at', { ascending: true })
      .limit(1);

    coverUrl = (anyCovers as CoverOption[] | null)?.[0]?.image_url || null;
  }

  console.log('[reader] Cover:', { bookId, selectedCount: selectedCovers?.length, coverUrl });

  // Resolve music URL from book metadata
  const metadata = typedBook.metadata as Record<string, string> | null;
  const selectedMusicId = metadata?.selected_music_id;

  // Try to find music in DB first, then fallback
  let musicUrl: string | null = null;
  if (selectedMusicId) {
    const { data: dbTrack } = await supabase
      .from('music_tracks')
      .select('storage_url')
      .eq('id', selectedMusicId)
      .single();

    if (dbTrack?.storage_url) {
      musicUrl = dbTrack.storage_url;
    } else {
      // Fallback to hardcoded tracks
      const fallbackTrack = getTrackById(selectedMusicId);
      if (fallbackTrack) {
        musicUrl = fallbackTrack.storage_url;
      }
    }
  }

  console.log('[reader] Music:', { selectedMusicId, musicUrl });

  return (
    <BookReader
      book={typedBook}
      pages={pages as Page[]}
      coverUrl={coverUrl}
      musicUrl={musicUrl}
      skipCover={skipCover === 'true'}
    />
  );
}
