'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function PendingPage() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ textAlign: 'center', maxWidth: 440 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🦉</div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
          color: 'var(--text-primary)',
          fontStyle: 'italic',
          marginBottom: 12,
        }}>
          Spizzzy is invite-only
        </h1>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '1rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          marginBottom: 32,
        }}>
          Your account isn&apos;t on the access list yet. We&apos;re opening up soon!
          If you think this is a mistake, reach out and we&apos;ll get you in.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <a
            href="mailto:yc3005@gmail.com?subject=Spizzzy%20access%20request"
            className="btn-primary"
            style={{ padding: '12px 28px', fontSize: '0.95rem', textDecoration: 'none' }}
          >
            Request access
          </a>
          <button
            onClick={handleSignOut}
            className="btn-secondary"
            style={{ padding: '10px 24px', fontSize: '0.88rem' }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
