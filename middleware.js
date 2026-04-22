import { NextResponse } from "next/server";

const TOKEN_COOKIE = "lms_token";
const USER_COOKIE = "lms_user";

const PUBLIC_PATHS = ["/login", "/register"];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  const tokenCookie = request.cookies.get(TOKEN_COOKIE);
  const userCookie = request.cookies.get(USER_COOKIE);

  // Parse user from cookie (role check)
  let user = null;
  if (userCookie?.value) {
    try {
      user = JSON.parse(decodeURIComponent(userCookie.value));
    } catch {
      // Invalid cookie — will be treated as unauthenticated
    }
  }

  const isAuthenticated = !!tokenCookie?.value && !!user;
  const isAdmin = user?.role?.slug === "lms_admin";

  // ── Public paths ──
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    if (isAuthenticated) {
      const dest = isAdmin ? "/admin/dashboard" : "/dashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  // ── Protected paths — require auth ──
  if (!isAuthenticated) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(TOKEN_COOKIE);
    response.cookies.delete(USER_COOKIE);
    return response;
  }

  // ── Role-based route protection ──

  // Admin trying to access learner routes
  if (isAdmin && !pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  // Learner trying to access admin routes
  if (!isAdmin && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
