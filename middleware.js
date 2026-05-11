import { NextResponse } from 'next/server';

const LANGS = ['ca', 'es', 'en', 'fr'];
const DEFAULT_LANG = 'ca';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  const hasLang = LANGS.some(
    l => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );
  if (hasLang) return NextResponse.next();

  const cookieLang = request.cookies.get('LOCALE')?.value;
  const browserLang = request.headers.get('accept-language')?.slice(0, 2);

  const lang =
    LANGS.includes(cookieLang) ? cookieLang :
    LANGS.includes(browserLang) ? browserLang :
    DEFAULT_LANG;

  return NextResponse.redirect(new URL(`/${lang}${pathname === '/' ? '' : pathname}`, request.url));
}

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)'],
};
