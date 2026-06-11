import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isAdmin } from '@/lib/auth/admin';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Redirect unauthenticated users away from protected routes
  const isProtectedRoute =
    pathname.startsWith('/library') ||
    pathname.startsWith('/create') ||
    pathname.startsWith('/explore') ||
    pathname.startsWith('/admin');

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  const isAuthRoute = pathname === '/login' || pathname === '/signup';

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/library';
    return NextResponse.redirect(url);
  }

  // Email allowlist gate: authenticated users on dashboard routes must be admin or allowlisted
  if (user && isProtectedRoute && pathname !== '/pending') {
    const email = user.email;
    if (!isAdmin(email)) {
      try {
        const { data: allowed } = await supabase.rpc('is_email_allowed', { check_email: email });
        if (!allowed) {
          const url = request.nextUrl.clone();
          url.pathname = '/pending';
          return NextResponse.redirect(url);
        }
      } catch {
        // RPC not available (table not created yet) — allow access
      }
    }
  }

  // Admin route guard: non-admins can't access /admin
  if (user && pathname.startsWith('/admin') && !isAdmin(user.email)) {
    const url = request.nextUrl.clone();
    url.pathname = '/library';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
