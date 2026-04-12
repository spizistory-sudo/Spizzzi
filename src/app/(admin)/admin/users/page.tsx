export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import UserTable from './user-table';

export default async function UsersPage() {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  // Get book counts per user
  const { data: bookCounts } = await supabase
    .from('books')
    .select('user_id');

  const countMap: Record<string, number> = {};
  (bookCounts || []).forEach((b) => {
    countMap[b.user_id] = (countMap[b.user_id] || 0) + 1;
  });

  const users = (profiles || []).map((p) => ({
    ...p,
    book_count: countMap[p.id] || 0,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">User Manager</h1>
      <UserTable users={users} />
    </div>
  );
}
