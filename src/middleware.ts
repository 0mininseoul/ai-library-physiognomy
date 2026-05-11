import { NextRequest, NextResponse } from "next/server";

const MOBILE_USER_AGENT_RE = /Mobi|Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i;
const PUBLIC_FILE_RE = /\.(?:png|jpe?g|webp|gif|svg|ico|txt|xml|json|webmanifest|woff2?)$/i;

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const userAgent = req.headers.get("user-agent") ?? "";

  if (shouldBypassMobileGate(pathname)) return NextResponse.next();
  if (!MOBILE_USER_AGENT_RE.test(userAgent)) return NextResponse.next();

  const url = req.nextUrl.clone();
  const nextPath = `${pathname}${req.nextUrl.search}`;
  url.pathname = "/mobile-only";
  url.search = "";
  if (nextPath !== "/") url.searchParams.set("next", nextPath);

  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};

function shouldBypassMobileGate(pathname: string) {
  return (
    pathname.startsWith("/mobile-only") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/brand") ||
    pathname.startsWith("/cats") ||
    pathname.startsWith("/mascot") ||
    pathname === "/favicon.png" ||
    pathname === "/og-image.png" ||
    pathname === "/icon.png" ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    PUBLIC_FILE_RE.test(pathname)
  );
}
