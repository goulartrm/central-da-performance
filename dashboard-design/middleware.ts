import { NextResponse, type NextRequest } from 'next/server';

/**
 * Authentication Middleware
 *
 * Protects routes by checking for valid Neon Auth session cookie.
 * Redirects unauthenticated users to the login page.
 *
 * Public routes (no authentication required):
 * - /login
 * - /auth/* (Neon Auth pages)
 * - /_next/* (Next.js internals)
 * - /favicon.ico, static assets
 *
 * Protected routes (authentication required):
 * - / (root/dashboard)
 * - /account/*
 * - /configuracoes
 * - /corretores
 * - /negocios
 * - /superadmin
 */

const publicRoutes = ['/login', '/auth'];
const protectedRoutes = ['/', '/account', '/configuracoes', '/corretores', '/negocios', '/superadmin'];

// Neon Auth session cookie name
const SESSION_COOKIE_NAME = 'neon_auth_token';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if user has a valid session by looking for the auth cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  const isAuthenticated = !!sessionCookie?.value;

  // Define route type
  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  );

  const isProtectedRoute = protectedRoutes.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  );

  // Skip middleware for Next.js internals and static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // static files like favicon.ico
  ) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users from protected routes to login
  if (!isAuthenticated && isProtectedRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users from login page to dashboard
  if (isAuthenticated && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
