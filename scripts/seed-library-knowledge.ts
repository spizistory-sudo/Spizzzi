import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

async function main() {
  const db = createClient(SUPABASE_URL, SUPABASE_KEY);

  const biblePath = path.join(__dirname, '..', 'docs', 'library-bible-v4.md');
  if (!fs.existsSync(biblePath)) {
    console.error(`Bible file not found: ${biblePath}`);
    process.exit(1);
  }
  const content = fs.readFileSync(biblePath, 'utf-8');
  console.log(`Read bible v4: ${content.length} chars, ${content.split('\n').length} lines`);

  // Check for existing active bible row
  const { data: existing } = await db
    .from('library_knowledge')
    .select('id')
    .eq('type', 'bible')
    .eq('active', true)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log(`Updating existing bible row ${existing[0].id}...`);
    const { error } = await db
      .from('library_knowledge')
      .update({ content, title: 'Writing Bible v4' })
      .eq('id', existing[0].id);
    if (error) throw error;
    console.log('Updated.');
  } else {
    console.log('Inserting new bible row...');
    const { error } = await db
      .from('library_knowledge')
      .insert({
        type: 'bible',
        age_band: 'all',
        title: 'Writing Bible v4',
        content,
        active: true,
      });
    if (error) throw error;
    console.log('Inserted.');
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
