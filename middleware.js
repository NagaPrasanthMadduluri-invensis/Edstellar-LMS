import { NextResponse } from "next/server";

const TOKEN_COOKIE = "lms_token";
const PUBLIC_PATHS = ["/login", "/register"];

/**
 * Navigation gate only — it checks whether an auth cookie is PRESENT, nothing
 * more. It cannot read the token's contents: the cookie is HttpOnly and signed
 * by the API, and the frontend holds no secret to verify it with.
 *
 * That is deliberate and safe, because middleware was never the security
 * boundary. Authorization is enforced by the API on every request, and the
 * route-group layouts resolve the real user via `lib/session.js` and redirect
 * on role mismatch. The worst a forged cookie achieves is one wasted redirect
 * to a layout that immediately bounces it.
 */
export function middleware(request) {
  const { pathname } = request.nextUrl;
  const hasToken = Boolean(request.cookies.get(TOKEN_COOKIE)?.value);

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    // Role-based landing is decided by `/` and the layouts, which know the role.
    if (hasToken) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  if (!hasToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // `scorm` is excluded because /scorm/* is a rewrite to the API serving
    // package content. Gating it here would bounce the player's iframe
    // requests to /login instead of returning the course files.
    "/((?!api|scorm|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};





