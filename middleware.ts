import { NextResponse, type NextRequest } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

export async function middleware(request: NextRequest) {
  // Dev bypass (admin/123) uses localStorage, not cookies.
  // Skip cookie check in development so the bypass still works.
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next()
  }

  const sessionCookie = getSessionCookie(request)

  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/chat/:path*', '/ats/:path*', '/pipeline/:path*', '/resume/:path*', '/settings/:path*'],
}
