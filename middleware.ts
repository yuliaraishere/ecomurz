import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from './lib/supabase/middleware';

const handleI18nRouting = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  // 1. Run next-intl routing
  const response = handleI18nRouting(request);

  // 2. Synchronize Supabase Auth session cookies
  const { user } = await updateSession(request, response);

  const pathname = request.nextUrl.pathname;

  // Detect locale in path
  const localeMatch = pathname.match(/^\/([^/]+)/);
  const locale =
    localeMatch && routing.locales.includes(localeMatch[1] as (typeof routing.locales)[number])
      ? localeMatch[1]
      : routing.defaultLocale;

  const isProtectedRoute =
    pathname === `/${locale}/account` ||
    pathname.startsWith(`/${locale}/account/`) ||
    pathname === `/${locale}/checkout` ||
    pathname.startsWith(`/${locale}/checkout/`) ||
    pathname === `/${locale}/transactions` ||
    pathname.startsWith(`/${locale}/transactions/`) ||
    pathname.startsWith(`/${locale}/payments/`) ||
    pathname === `/${locale}/admin` ||
    pathname.startsWith(`/${locale}/admin/`);


  // Redirect unauthenticated users to login with redirectTo parameter
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL(`/${locale}/login`, request.url);
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If user is already logged in, visiting /login or /register redirects to /account
  const isAuthRoute =
    pathname === `/${locale}/login` || pathname === `/${locale}/register`;
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL(`/${locale}/account`, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/',
    '/(id|en|ja|tl|vi|th|hi|zh)/:path*',
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
