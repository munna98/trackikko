import { NextResponse, type NextRequest } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions, type SessionData } from '@/lib/session'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API routes handle their own auth — never redirect them
  if (pathname.startsWith('/api/')) return NextResponse.next()

  const response = NextResponse.next({ request })
  const session = await getIronSession<SessionData>(request, response, sessionOptions)

  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/setup') ||
    pathname.startsWith('/set-password')

  // Not logged in → go to login
  if (!session.userId && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Already logged in → don't let them see login page
  if (session.userId && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Admin first login → force password change before anything else
  if (session.userId && session.mustChangePassword && !pathname.startsWith('/set-password')) {
    return NextResponse.redirect(new URL('/set-password', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
