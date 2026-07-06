import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase service role credentials');
  return createClient(url, key);
}

export type LibraryBookStatus =
  | 'spark' | 'developing_idea' | 'idea_ready'
  | 'writing' | 'checking' | 'needs_revision'
  | 'illustrating' | 'ready'
  | 'approved' | 'rejected' | 'failed';

export interface Spark {
  idea: string;
  age_band: '2-4' | '4-6' | '6-8';
  category?: string;
  value_primary?: string;
  value_secondary?: string;
  tone?: string;
  notes?: string;
}

export interface LibraryBook {
  id: string;
  created_at: string;
  updated_at: string;
  status: LibraryBookStatus;
  spark: Spark;
  brief: Record<string, unknown> | null;
  story: Record<string, unknown> | null;
  checker_report: Record<string, unknown> | null;
  revision_count: number;
  images: Record<string, unknown> | null;
  review_verdict: 'approved' | 'rejected' | null;
  review_notes: string | null;
  last_error: string | null;
  stage_history: Array<{ status: string; timestamp: string }>;
}

export async function createBook(spark: Spark): Promise<LibraryBook> {
  const db = getServiceClient();
  const now = new Date().toISOString();
  const { data, error } = await db
    .from('library_books')
    .insert({
      spark,
      status: 'spark',
      stage_history: [{ status: 'spark', timestamp: now }],
    })
    .select()
    .limit(1);

  if (error || !data?.[0]) throw new Error(error?.message || 'Failed to create book');
  return data[0] as LibraryBook;
}

export async function listBooks(): Promise<LibraryBook[]> {
  const db = getServiceClient();
  const { data, error } = await db
    .from('library_books')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as LibraryBook[];
}

export async function getBook(id: string): Promise<LibraryBook | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .from('library_books')
    .select('*')
    .eq('id', id)
    .limit(1);

  if (error) throw new Error(error.message);
  return (data?.[0] as LibraryBook) || null;
}

export async function updateBookStatus(
  id: string,
  status: LibraryBookStatus,
  extra?: Partial<Pick<LibraryBook, 'brief' | 'story' | 'checker_report' | 'images' | 'last_error' | 'revision_count'>>
): Promise<LibraryBook> {
  const db = getServiceClient();

  const existing = await getBook(id);
  if (!existing) throw new Error('Book not found');

  const now = new Date().toISOString();
  const history = [...(existing.stage_history || []), { status, timestamp: now }];

  const { data, error } = await db
    .from('library_books')
    .update({ status, stage_history: history, ...extra })
    .eq('id', id)
    .select()
    .limit(1);

  if (error || !data?.[0]) throw new Error(error?.message || 'Failed to update book');
  return data[0] as LibraryBook;
}

export async function saveReview(
  id: string,
  verdict: 'approved' | 'rejected',
  notes?: string
): Promise<LibraryBook> {
  const db = getServiceClient();

  const existing = await getBook(id);
  if (!existing) throw new Error('Book not found');

  const status: LibraryBookStatus = verdict === 'approved' ? 'approved' : 'rejected';
  const now = new Date().toISOString();
  const history = [...(existing.stage_history || []), { status, timestamp: now }];

  const { data, error } = await db
    .from('library_books')
    .update({
      status,
      review_verdict: verdict,
      review_notes: notes || null,
      stage_history: history,
    })
    .eq('id', id)
    .select()
    .limit(1);

  if (error || !data?.[0]) throw new Error(error?.message || 'Failed to save review');
  return data[0] as LibraryBook;
}

export async function deleteBook(id: string): Promise<void> {
  const db = getServiceClient();
  const { error } = await db.from('library_books').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
