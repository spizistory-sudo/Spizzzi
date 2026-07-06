import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) redirect('/library');

  return (
    <div style={{ minHeight: '100vh', padding: '0 16px 32px' }}>
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 0',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/studio" style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            color: 'var(--gold)',
            textDecoration: 'none',
            fontWeight: 600,
          }}>
            Library Studio
          </Link>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.35)',
            background: 'rgba(255,255,255,0.06)',
            padding: '4px 10px',
            borderRadius: 6,
          }}>
            INTERNAL
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link href="/studio/new" className="btn-primary" style={{ padding: '10px 24px', fontSize: '0.88rem' }}>
            + New Book
          </Link>
          <Link href="/library" className="btn-ghost" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
            Back to App
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
