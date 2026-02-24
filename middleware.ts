import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Public routes that don't require auth
  const publicPaths = ['/login', '/signup', '/auth/callback', '/forgot-password', '/reset-password', '/privacy', '/terms', '/blog', '/founding-members']
  const isPublicPath = publicPaths.some(p => pathname.startsWith(p))
  const isLandingPage = pathname === '/'
  const isApiPath = pathname.startsWith('/api/')

  // If not logged in and not on a public page or landing page, redirect to login
  if (!user && !isPublicPath && !isLandingPage && !isApiPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // If logged in and on landing page, redirect to dashboard
  if (user && isLandingPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // If logged in and on login/signup, redirect to dashboard (but allow reset-password)
  if (user && isPublicPath && !pathname.startsWith('/reset-password')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Onboarding redirect: if logged in but hasn't completed onboarding
  if (user && !pathname.startsWith('/onboarding') && !isApiPath) {
    const { data: settings } = await supabase
      .from('company_settings')
      .select('onboarding_completed, locale')
      .single()

    if (!settings || settings.onboarding_completed === false) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }

    // Set locale cookie if not present
    if (settings?.locale && !request.cookies.get('NEXT_LOCALE')) {
      supabaseResponse.cookies.set('NEXT_LOCALE', settings.locale, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      })
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Match all routes except static files and _next
    '/((?!_next/static|_next/image|favicon.ico|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
