export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Book, CoverOption } from '@/types/book';
import BookCard from '@/components/library/BookCard';

export default async function LibraryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let books: (Book & { cover_url?: string | null })[] = [];
  if (user) {
    const { data: booksData } = await supabase
      .from('books')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (booksData) {
      const bookIds = booksData.map((b) => b.id);
      const { data: covers } = await supabase
        .from('cover_options')
        .select('*')
        .in('book_id', bookIds)
        .eq('is_selected', true);

      const coverMap = new Map(
        (covers as CoverOption[] | null)?.map((c) => [c.book_id, c.image_url]) || []
      );

      books = (booksData as Book[]).map((book) => ({
        ...book,
        cover_url: coverMap.get(book.id) || null,
      }));
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1
            className="text-4xl font-bold"
            style={{ color: 'var(--text-dark)', fontFamily: 'var(--font-display)' }}
          >
            My Library &#128218;
          </h1>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', marginTop: '4px' }}>
            {books.length === 0
              ? "Your magical bookshelf is waiting for its first story"
              : `${books.length} book${books.length === 1 ? '' : 's'} in your collection`}
          </p>
        </div>
        <Link
          href="/create"
          className="flex items-center gap-2 transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, var(--accent-orange), var(--accent-orange-hover))',
            color: '#FFF8F0',
            padding: '12px 24px',
            borderRadius: 'var(--radius-pill)',
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: '15px',
            boxShadow: 'var(--shadow-orange-glow)',
          }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create New Book
        </Link>
      </div>

      {books.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20"
          style={{
            background: 'var(--bg-lavender-light)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--border-light)',
          }}
        >
          <div
            className="w-24 h-24 flex items-center justify-center mb-6"
            style={{
              background: 'linear-gradient(135deg, var(--bg-peach-light), var(--bg-lavender))',
              borderRadius: '50%',
              fontSize: '42px',
            }}
          >
            &#128214;
          </div>
          <h2
            className="text-2xl font-bold mb-2"
            style={{ color: 'var(--text-dark)', fontFamily: 'var(--font-display)' }}
          >
            Your magical library awaits
          </h2>
          <p
            className="mb-8 text-center max-w-md"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
          >
            Create your first personalized storybook and watch your child become the hero of their very own adventure!
          </p>
          <Link
            href="/create"
            className="transition-all duration-200 animate-gentle-pulse"
            style={{
              background: 'linear-gradient(135deg, var(--accent-orange), var(--accent-orange-hover))',
              color: '#FFF8F0',
              padding: '14px 32px',
              borderRadius: 'var(--radius-pill)',
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              fontSize: '16px',
              boxShadow: 'var(--shadow-orange-glow)',
            }}
          >
            &#10024; Create Your First Book
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
