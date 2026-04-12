export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { Book, Page, CoverOption } from '@/types/book';

interface SharePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: book } = await supabase
    .from('books')
    .select('title, child_name, cover_options(*)')
    .eq('share_slug', slug)
    .eq('is_public', true)
    .single();

  if (!book) {
    return { title: 'Book not found — StoryMagic' };
  }

  const selectedCover = (book.cover_options as CoverOption[] | null)?.find(
    (c) => c.is_selected
  );
  const coverUrl = selectedCover?.image_url;

  return {
    title: `${book.title} — A StoryMagic Book`,
    description: `A personalized children's book created for ${book.child_name}. Read it now!`,
    openGraph: {
      title: book.title,
      description: `A personalized story for ${book.child_name}`,
      images: coverUrl ? [{ url: coverUrl, width: 1024, height: 1024 }] : [],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: book.title,
      description: `A personalized story for ${book.child_name}`,
      images: coverUrl ? [coverUrl] : [],
    },
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: book } = await supabase
    .from('books')
    .select('*, cover_options(*), pages(*)')
    .eq('share_slug', slug)
    .single();

  if (!book) {
    notFound();
  }

  const typedBook = book as Book & { cover_options: CoverOption[]; pages: Page[] };

  // If book is private, show a private message
  if (!typedBook.is_public) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-amber-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">This book is private</h1>
          <p className="text-gray-500 mb-6">The author hasn&apos;t shared this book publicly yet.</p>
          <Link
            href="/"
            className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition"
          >
            Create your own book
          </Link>
        </div>
      </div>
    );
  }

  const selectedCover = typedBook.cover_options?.find((c) => c.is_selected);
  const coverUrl = selectedCover?.image_url;
  const pages = (typedBook.pages || []).sort(
    (a, b) => a.page_number - b.page_number
  );
  const previewPages = pages.filter((p) => p.illustration_url).slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-amber-50">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <Link href="/" className="text-2xl font-bold text-purple-800">
          StoryMagic
        </Link>
        <Link
          href="/signup"
          className="px-5 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition"
        >
          Create your own
        </Link>
      </nav>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-6 pt-8 pb-20">
        <div className="text-center">
          {/* Cover image */}
          {coverUrl ? (
            <div className="mx-auto w-72 md:w-96 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl shadow-purple-200/50 mb-8">
              <img
                src={coverUrl}
                alt={typedBook.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="mx-auto w-72 md:w-96 aspect-[3/4] rounded-2xl bg-gradient-to-br from-purple-200 to-amber-100 flex items-center justify-center shadow-2xl shadow-purple-200/50 mb-8">
              <svg className="w-20 h-20 text-purple-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
          )}

          <h1
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-3"
            dir="auto"
          >
            {typedBook.title}
          </h1>
          <p className="text-xl text-gray-500 mb-8" dir="auto">
            A personalized story for {typedBook.child_name}
          </p>

          <Link
            href={`/reader/${typedBook.id}`}
            className="inline-block px-10 py-4 bg-purple-600 text-white rounded-2xl font-semibold text-lg hover:bg-purple-700 transition shadow-lg shadow-purple-200"
          >
            Read this book
          </Link>

          {/* Book details */}
          <div className="flex items-center justify-center gap-6 mt-8 text-sm text-gray-400">
            <span>{pages.length} pages</span>
            <span>&middot;</span>
            <span>{new Date(typedBook.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Preview thumbnails */}
        {previewPages.length > 0 && (
          <div className="mt-16">
            <h2 className="text-center text-lg font-semibold text-gray-900 mb-6">
              A peek inside
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {previewPages.map((page) => (
                <div
                  key={page.id}
                  className="aspect-[3/2] rounded-xl overflow-hidden shadow-md"
                >
                  <img
                    src={page.illustration_url!}
                    alt={`Page ${page.page_number}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Branding */}
        <div className="mt-16 text-center">
          <p className="text-gray-400 text-sm">
            Created with{' '}
            <Link href="/" className="text-purple-500 font-medium hover:underline">
              StoryMagic
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
