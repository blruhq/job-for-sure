import { NextResponse, type NextRequest } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'
import createMiddleware from 'next-intl/middleware'
import { routing } from './app/i18n/routing'

const intlMiddleware = createMiddleware(routing)

const protectedRoutes = ['/chat', '/ats', '/applications', '/resume', '/settings', '/interview', '/dashboard', '/cover-letter']
const publicRoutes = ['/', '/login', '/register']

function stripLocale(pathname: string) {
  const parts = pathname.split('/')
  if (parts[1] === 'en' || parts[1] === 'th') {
    const stripped = '/' + parts.slice(2).join('/')
    return stripped
  }
  return pathname
}

function getLocale(pathname: string) {
  const parts = pathname.split('/')
  if (parts[1] === 'en' || parts[1] === 'th') {
    return parts[1]
  }
  return 'en'
}

function isProtected(pathname: string) {
  const clean = stripLocale(pathname)
  return protectedRoutes.some((r) => clean === r || clean.startsWith(r + '/'))
}

function isPublic(pathname: string) {
  const clean = stripLocale(pathname)
  return publicRoutes.includes(clean)
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 1. Run next-intl middleware first to ensure correct locale prefix
  const intlResponse = intlMiddleware(request)
  
  // If intlMiddleware redirected the user (e.g. /dashboard -> /en/dashboard)
  // return that redirect response immediately.
  if (intlResponse && (intlResponse.status === 307 || intlResponse.status === 308)) {
    return intlResponse
  }

  // 2. Perform authentication checks
  const sessionCookie = getSessionCookie(request)
  const hasSession = !!sessionCookie
  const locale = getLocale(pathname)

  // Authenticated user trying to access a public page → redirect to /[locale]/dashboard
  if (hasSession && isPublic(pathname)) {
    return NextResponse.redirect(new URL(`/${locale}/chat`, request.url))
  }

  // Unauthenticated user trying to access a protected route → redirect to /[locale]/login
  if (!hasSession && isProtected(pathname)) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
  }

  // If intlResponse set headers or cookies (e.g. locale cookies), pass them through
  return intlResponse || NextResponse.next()
}

export const config = {
  matcher: [
    // Match all pathnames except for the ones starting with:
    // - api (API routes)
    // - _next (Next.js internals)
    // - _vercel (Vercel internals)
    // - static files (e.g. favicon.ico, images, pdfs)
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
}
