import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { curateStoriesForChild, curateStoriesFallback, type ChildProfile } from '@/lib/ai/curation-en';

const requestSchema = z.object({
  name: z.string().min(1).max(50),
  age: z.number().int().min(3).max(12),
  gender: z.enum(['boy', 'girl', 'nonbinary']),
  traits: z.array(z.string()).max(4),
  interests: z.array(z.string()).max(5),
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const validated = requestSchema.parse(body);

    let result;
    try {
      result = await curateStoriesForChild(validated as ChildProfile, process.env.ANTHROPIC_API_KEY!);
    } catch (e) {
      console.error('[curate-stories] AI curation failed, falling back:', e);
      result = curateStoriesFallback(validated as ChildProfile);
    }

    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', issues: e.issues }, { status: 400 });
    }
    console.error('[curate-stories] Error:', e);
    return NextResponse.json({ error: 'Curation failed' }, { status: 500 });
  }
}
