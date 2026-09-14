import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { hasBackofficeAccess } from "@/lib/permissions";
import { isAllowed, loginRateLimit } from "@/lib/rate-limit";

const locales = ["pt", "en"] as const;
const defaultLocale = "pt";
const localeCookie = "NEXT_LOCALE";

function isLocale(value: string): value is (typeof locales)[number] {
  return locales.includes(value as (typeof locales)[number]);
}

function getPreferredLocale(request: NextRequest) {
  const savedLocale = request.cookies.get(localeCookie)?.value;

  if (savedLocale && isLocale(savedLocale)) {
    return savedLocale;
  }

  const acceptedLanguage = request.headers.get("accept-language")?.toLowerCase() ?? "";

  return acceptedLanguage.includes("pt") ? "pt" : defaultLocale;
}

function localeRedirect(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pathnameHasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (pathnameHasLocale) {
    return NextResponse.next();
  }

  const locale = getPreferredLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;

  const response = NextResponse.redirect(url);
  response.cookies.set(localeCookie, locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });

  return response;
}

// The admin backoffice deliberately lives outside the [lang] locale tree
// (BRD's bilingual requirement is about customer-facing content, not
// internal tooling — see ROADMAP.md Phase 1).
async function adminGate(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !hasBackofficeAccess(token.role)) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Applies only to the actual login POST (NextAuth's credentials callback),
// not to session checks or other auth traffic — brute-force protection
// (NFR Segurança), not a general API throttle.
function loginAttemptGate(request: NextRequest) {
  if (request.method !== "POST") {
    return NextResponse.next();
  }

  if (!isAllowed(request, loginRateLimit)) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again later." },
      { status: 429 },
    );
  }

  return NextResponse.next();
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/api/auth/callback/credentials") {
    const rateLimited = loginAttemptGate(request);
    if (rateLimited.status === 429) return rateLimited;
  }

  if (pathname.startsWith("/api/")) {
    // NextAuth and any future API route: no locale handling, no admin
    // page-gate here — protected routes verify the session themselves
    // (see src/lib/permissions.ts requirePermission — Server Actions can
    // bypass this proxy's matcher entirely, so it can't be the only check).
    return NextResponse.next();
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return adminGate(request);
  }

  return localeRedirect(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
