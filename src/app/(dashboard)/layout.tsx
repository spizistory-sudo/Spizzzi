'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useCreationWizard } from '@/stores/creation-wizard';

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'yc3005@gmail.com').split(',').map(e => e.trim().toLowerCase());

const NAV_ITEMS = [
  {
    label: 'My Library',
    href: '/library',
    adminOnly: false,
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    label: 'Spizzzy Library',
    href: '/explore',
    adminOnly: false,
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6M4.5 9.75v9.75h15V9.75" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    href: '/admin',
    adminOnly: true,
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
];

function NavLinks({ pathname, onNavigate, showAdmin }: { pathname: string; onNavigate?: () => void; showAdmin: boolean }) {
  return (
    <>
      {NAV_ITEMS.filter(item => !item.adminOnly || showAdmin).map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: isActive ? '10px 12px' : '10px 14px',
              borderRadius: 12,
              color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.50)',
              fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: isActive ? 500 : 400,
              transition: 'all 0.25s ease', textDecoration: 'none',
              background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
              borderLeft: isActive ? '2px solid rgba(245,200,66,0.8)' : '2px solid transparent',
            }}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    useCreationWizard.persist.rehydrate();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        setShowAdmin(true);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <div style={{ position: 'relative', zIndex: 1, display: 'flex', minHeight: '100vh' }}>
      {/* Desktop sidebar — lg + fine pointer (mouse/trackpad) only */}
      <aside className="dash-sidebar" style={{
        width: 240,
        background: 'rgba(10, 17, 40, 0.70)',
        backdropFilter: 'blur(24px) saturate(150%)',
        WebkitBackdropFilter: 'blur(24px) saturate(150%)',
        borderRight: '1px solid rgba(255, 255, 255, 0.07)',
        flexDirection: 'column',
        padding: '28px 16px',
        position: 'relative',
        zIndex: 10,
        flexShrink: 0,
      }}>
        <Link href="/library" style={{ textDecoration: 'none', marginBottom: 16, display: 'block' }}>
          <Image src="/images/logo/spizzzy-logo.png" alt="Spizzzy" width={140} height={140} priority className="h-auto w-32" />
        </Link>
        <Link href="/create" className="btn-primary" style={{ width: '100%', textAlign: 'center', marginBottom: 16, fontSize: '0.9rem', padding: '12px 20px' }}>
          &#10022; Create Book
        </Link>
        <div style={{ borderTop: '1px solid rgba(255, 248, 235, 0.06)', margin: '0 0 12px' }} />
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <NavLinks pathname={pathname} showAdmin={showAdmin} />
        </nav>
        <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, color: 'rgba(255, 255, 255, 0.30)', fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 400, cursor: 'pointer', background: 'transparent', border: 'none', width: '100%' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
          </svg>
          Sign out
        </button>
      </aside>

      {/* Top bar — visible on touch + phones (hidden on desktop with pointer:fine) */}
      <div className="dash-topbar fixed top-0 left-0 right-0 z-30 pt-safe flex items-center justify-between" style={{
        background: 'rgba(10, 17, 40, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '12px 16px',
      }}>
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.80)' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link href="/library">
          <Image src="/images/logo/spizzzy-logo.png" alt="Spizzzy" width={80} height={80} className="h-14 w-auto" />
        </Link>
        <div style={{ width: 44 }} />
      </div>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <>
          <div className="dash-drawer fixed inset-0 z-40 bg-black/50" onClick={() => setDrawerOpen(false)} onKeyDown={(e) => { if (e.key === 'Escape') setDrawerOpen(false); }} role="button" tabIndex={0} aria-label="Close menu" />
          <div className="dash-drawer fixed top-0 left-0 bottom-0 z-50" style={{
            width: 280,
            background: 'rgba(10, 17, 40, 0.95)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRight: '1px solid rgba(255,255,255,0.10)',
            display: 'flex',
            flexDirection: 'column',
            padding: '28px 16px',
            animation: 'slideInLeft 0.2s ease-out',
          }}>
            <Link href="/library" onClick={() => setDrawerOpen(false)} style={{ textDecoration: 'none', marginBottom: 16, display: 'block' }}>
              <Image src="/images/logo/spizzzy-logo.png" alt="Spizzzy" width={120} height={120} className="h-auto w-28" />
            </Link>
            <Link href="/create" onClick={() => setDrawerOpen(false)} className="btn-primary" style={{ width: '100%', textAlign: 'center', marginBottom: 16, fontSize: '0.9rem', padding: '12px 20px' }}>
              &#10022; Create Book
            </Link>
            <div style={{ borderTop: '1px solid rgba(255, 248, 235, 0.06)', margin: '0 0 12px' }} />
            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <NavLinks pathname={pathname} onNavigate={() => setDrawerOpen(false)} showAdmin={showAdmin} />
            </nav>
            <button onClick={() => { handleSignOut(); setDrawerOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, color: 'rgba(255, 255, 255, 0.30)', fontFamily: 'var(--font-body)', fontSize: '0.82rem', background: 'transparent', border: 'none', width: '100%', cursor: 'pointer' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
              Sign out
            </button>
          </div>
        </>
      )}

      {/* Main content — full width below lg, offset by sidebar at lg+ */}
      <main className="flex-1 overflow-y-auto relative z-[1]">
        {/* Clearance for top bar — hidden when persistent sidebar is shown */}
        <div className="dash-topbar h-[80px] pt-safe" />
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }} className="dash-content-pad">
          {children}
        </div>
      </main>

      <style jsx global>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        /* Persistent sidebar: only on desktop (lg + fine pointer) */
        .dash-sidebar { display: none; }
        @media (min-width: 1024px) and (pointer: fine) {
          .dash-sidebar { display: flex; }
          .dash-topbar { display: none !important; }
          .dash-drawer { display: none !important; }
          .dash-content-pad { padding: 40px 48px; }
        }
      `}</style>
    </div>
  );
}
