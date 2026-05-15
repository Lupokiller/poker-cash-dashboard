import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';

const PUBLIC_PAGE = '/login';
const PUBLIC_API = '/api/auth/login';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  let session = null;
  try {
    session = await getSessionFromRequest(request);
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ message: 'Autenticacao nao configurada no servidor.' }, { status: 503 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (pathname === PUBLIC_API) {
    return NextResponse.next();
  }

  if (pathname === PUBLIC_PAGE) {
    if (session) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ message: 'Nao autorizado.' }, { status: 401 });
    }
    const loginUrl = new URL(PUBLIC_PAGE, request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('from', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
