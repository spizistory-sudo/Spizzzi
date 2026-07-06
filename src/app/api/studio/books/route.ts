import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/admin';
import { createBook, listBooks, type Spark } from '@/lib/studio/db';

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user && isAdmin(user.email);
}

export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const books = await listBooks();
    return NextResponse.json({ books });
  } catch (err) {
    console.error('[studio/books] GET error:', err);
    return NextResponse.json({ error: 'Failed to list books' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const spark = (await req.json()) as Spark;
    if (!spark.idea || !spark.age_band) {
      return NextResponse.json({ error: 'idea and age_band are required' }, { status: 400 });
    }
    const book = await createBook(spark);
    return NextResponse.json({ book }, { status: 201 });
  } catch (err) {
    console.error('[studio/books] POST error:', err);
    return NextResponse.json({ error: 'Failed to create book' }, { status: 500 });
  }
}
