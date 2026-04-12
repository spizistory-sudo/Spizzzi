import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await supabase
    .from('books')
    .update({ animation_prompted: true })
    .eq('id', bookId)
    .eq('user_id', user.id);

  return NextResponse.json({ success: true });
}
