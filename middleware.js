import { NextResponse } from "next/server";

const TOKEN_COOKIE = "lms_token";
// Self-registration was retired with multi-tenancy — a public signup cannot
// know which organization a learner belongs to. /login is the only public page.
const PUBLIC_PATHS = ["/login"];

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
  const { pathname, searchParams } = request.nextUrl;
  const hasToken = Boolean(request.cookies.get(TOKEN_COOKIE)?.value);

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    /**
     * `?session=expired` is the escape hatch, and without it this app can
     * deadlock. Read this before removing it.
     *
     * This middleware cannot verify the token — it only sees that a cookie
     * EXISTS. So a cookie that is present but no longer resolvable (expired,
     * signed with a rotated JWT_SECRET, missing a claim a newer API requires,
     * or belonging to a deleted user) used to produce:
     *
     *     /login  -> 307 /        "you have a cookie, you must be signed in"
     *     /       -> 307 /login   "GET /api/auth/me returned no user"
     *
     * — an infinite bounce in which the login form is UNREACHABLE, so the
     * only recovery was clearing cookies by hand. That is exactly the
     * ERR_TOO_MANY_REDIRECTS a browser reports, and exactly why it advises
     * deleting cookies.
     *
     * Every server-side redirect to /login now carries this marker, so the
     * one place that DOES know the token is bad can say so, and the form
     * renders. Signing in replaces the dead cookie via the API's Set-Cookie.
     *
     * The cookie is deliberately NOT deleted here: the API may have set it
     * with a `Domain` attribute (COOKIE_DOMAIN in production), and a
     * host-scoped deletion would leave the domain-scoped one alive while
     * adding an empty duplicate — two cookies of the same name, and which one
     * is read becomes a coin toss. Letting the login succeed overwrites it
     * with the correct attributes.
     */
    if (searchParams.get("session") === "expired") return NextResponse.next();

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





