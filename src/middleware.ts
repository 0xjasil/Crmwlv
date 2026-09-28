// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const userCookie = request.cookies.get('user')?.value;
  const pathname = request.nextUrl.pathname;

  let userRole: string | null = null;

  if (userCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(userCookie));
      userRole = parsed?.role || null;
    } catch (e) {}
  }

  // If no token or user cookie exists, redirect to login
  if (!token && !userCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Check if user is trying to access admin routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/report')) {
    if (userRole && userRole !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login|$).*)'],
};
