import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const pathname = url.pathname;

  // Target only product paths
  if (pathname.startsWith('/products/')) {
    try {
      // 1. SAFE EXIT CIRCUIT: Detect if the path is already perfectly clean,
      // lowercase, and normalized. If it is, exit immediately to let Next.js render the page.
      const hasEncodedChars = pathname.includes('%');
      const hasBadPunctuation = /[\u201C\u201D\u2018\u2019"']/.test(pathname);
      const hasDoubleHyphens = pathname.includes('--');
      const isNotLowercase = pathname !== pathname.toLowerCase();

      if (!hasEncodedChars && !hasBadPunctuation && !hasDoubleHyphens && !isNotLowercase) {
        return NextResponse.next();
      }

      // 2. Perform URL cleansing transformations
      const decodedPath = decodeURIComponent(pathname);
      
      let cleanPath = decodedPath
        .toLowerCase()
        .replace(/[\u201C\u201D\u2018\u2019"'`’‘]/g, '') // Strip curly/straight quotes
        .replace(/[^a-z0-9+/|-]/g, '-')               // Swap spaces & bad punctuation to hyphens
        .replace(/-+/g, '-');                          // Collapse multi-hyphens (--- to -)

      // Clean off rogue trailing hyphens
      cleanPath = cleanPath.replace(/-+$/, '');

      // 3. FINAL LOOP SAFETY CHECK: If calculated target matches current path exactly, exit.
      if (cleanPath === pathname) {
        return NextResponse.next();
      }

      // Execute a 301 Permanent SEO Redirect to the clean URL string
      const redirectUrl = new URL(cleanPath, request.url);
      return NextResponse.redirect(redirectUrl, 301);
    } catch (error) {
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/products/:path*',
};
