import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Initialize the response
  const response = NextResponse.next()

  // Define the Cache-Control header value
  // This matches the requirement:
  // Node Cache TTL behavior: Follow Origin Cache-Control (we set it here)
  // Browser Cache TTL behavior: Do not cache (no-store, no-cache, etc.)
  const cacheControl = 'no-store, no-cache, must-revalidate, proxy-revalidate'

  // Apply headers to the response
  response.headers.set('Cache-Control', cacheControl)
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  response.headers.set('Surrogate-Control', 'no-store')

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (usually images, etc.) - handled by negative lookahead for common extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
