import { NextResponse, type NextRequest } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

const protectedRoutes = ['/chat', '/ats', '/pipeline', '/resume', '/settings', '/interview', '/dashboard']
const publicRoutes = ['/', '/login', '/register']

function isProtected(pathname: string) {
  return protectedRoutes.some((r) => pathname === r || pathname.startsWith(r + '/'))
}

function isPublic(pathname: string) {
  // Exact match only — don't block API routes, _next, static assets, etc.
  return publicRoutes.includes(pathname)
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = getSessionCookie(request)
  const hasSession = !!sessionCookie

  // Authenticated user trying to access a public page → redirect to /dashboard
  if (hasSession && isPublic(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Unauthenticated user trying to access a protected route → redirect to /login
  if (!hasSession && isProtected(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/register',
    '/chat/:path*',
    '/ats/:path*',
    '/pipeline/:path*',
    '/resume/:path*',
    '/settings/:path*',
    '/interview/:path*',
    '/dashboard/:path*',
  ],
}
