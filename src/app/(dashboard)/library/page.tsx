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
            style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 600, color: 'var(--text-primary)' }}
          >
            הספרייה שלי &#128218;
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', marginTop: '4px' }}>
            {books.length === 0
              ? 'המדף הקסום שלכם מחכה לסיפור הראשון'
              : `${books.length} ${books.length === 1 ? 'ספר' : 'ספרים'} באוסף שלכם`}
          </p>
        </div>
        <Link
          href="/create"
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          ספר חדש
        </Link>
      </div>

      {books.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 glass"
          style={{ borderRadius: 'var(--radius-lg)' }}
        >
          <div
            className="w-24 h-24 flex items-center justify-center mb-6"
            style={{
              background: 'linear-gradient(135deg, var(--purple-glow), var(--cyan-glow))',
              borderRadius: '50%',
              fontSize: '42px',
            }}
          >
            &#128214;
          </div>
          <h2
            className="text-2xl font-bold mb-2"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
          >
            הספרייה הקסומה מחכה לכם
          </h2>
          <p
            className="mb-8 text-center max-w-md"
            style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
          >
            צרו את הספר הראשון שלכם וצפו איך הילד שלכם הופך לגיבור של הרפתקה משלו!
          </p>
          <Link
            href="/create"
            className="btn-primary"
            style={{ padding: '14px 32px', fontSize: '1rem' }}
          >
            &#10024; יאללה, מתחילים!
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
