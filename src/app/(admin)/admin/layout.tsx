export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

const navItems = [
  { label: 'Analytics', href: '/admin/analytics' },
  { label: 'Themes', href: '/admin/themes' },
  { label: 'Prompts', href: '/admin/prompts' },
  { label: 'Music', href: '/admin/music' },
  { label: 'Voices', href: '/admin/voices' },
  { label: 'Users', href: '/admin/users' },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check admin status
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    redirect('/library');
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col">
        <div className="p-6">
          <Link href="/admin/analytics" className="text-xl font-bold text-purple-800">
            Admin Panel
          </Link>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <Link
            href="/library"
            className="block px-4 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-600 transition"
          >
            &larr; Back to app
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
