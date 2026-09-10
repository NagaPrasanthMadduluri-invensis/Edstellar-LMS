import { cookies } from "next/headers";

import { SERVER_URL as PUBLIC_SERVER_URL } from "@/lib/server-url";

const TOKEN_COOKIE = "lms_token";

/**
 * Where THIS process reaches the API — not necessarily where the browser does.
 *
 * The two are on opposite sides of the network. The browser calls the API over
 * the internet, so `NEXT_PUBLIC_SERVER_URL` must be the public origin. This
 * module runs on the server hosting Next, and when the API sits behind a CDN
 * the public origin makes it hairpin: out of the box, through the CDN, back to
 * the same machine. A security group, a proxy loop, or bot protection on a
 * datacenter IP each break that hop while the browser keeps working — and the
 * symptom is every user appearing signed out even though login succeeded,
 * because a non-OK response here is indistinguishable from "no user".
 *
 * `SERVER_API_URL` lets that hop go direct — `http://127.0.0.1:3001`, or the
 * private address. It is deliberately NOT prefixed `NEXT_PUBLIC_`: it must
 * never be inlined into the browser bundle (it names an address the browser
 * cannot reach and should not know), and being read at runtime means changing
 * it needs a restart rather than a rebuild.
 *
 * Optional. Falls back to the public URL, which is correct for development and
 * for any deployment where the two hops are the same.
 */
const SERVER_URL = (process.env.SERVER_API_URL || PUBLIC_SERVER_URL).replace(
  /\/+$/,
  "",
);

/**
 * Resolves the signed-in user for a Server Component by asking the API.
 *
 * The frontend deliberately holds NO signing secret and does not verify the
 * JWT itself. That was the last piece of backend knowledge living in the
 * client; the server is the single authority on identity, which is what lets
 * this project ship as a standalone frontend repository.
 *
 * Returns null when there is no cookie, the token is invalid/expired, or the
 * account was deactivated — the caller redirects to /login.
 */
export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  if (!token) return null;

  try {
    const res = await fetch(`${SERVER_URL}/api/auth/me`, {
      headers: { Cookie: `${TOKEN_COOKIE}=${token}` },
      // Identity must never be served from a cache — a stale hit would render
      // the shell for the wrong user after a logout or role change.
      cache: "no-store",
    });
    if (!res.ok) return null;

    const { user } = await res.json();
    if (!user) return null;

    const firstName = user.first_name || "";
    const lastName = user.last_name || "";

    // Only an admin can ever be a platform admin (§4.2 of the tenancy spec),
    // so the extra round trip is skipped entirely for learners.
    // Supplied directly by the API. It was briefly derived by calling a
    // @PlatformAdmin()-guarded endpoint and reading the 403 as a boolean —
    // which cost an extra round trip on every admin page load and would have
    // broken silently if that endpoint moved. Asking the one service that
    // knows is better than inferring it from a refusal.
    const isPlatformAdmin = user.is_platform_admin === true;

    return {
      id: user.id,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      email: user.email,
      role: user.role,
      roleLabel:
        user.role === "admin"
          ? "LMS Admin"
          : user.role === "trainer"
            ? "Trainer"
            : "Learner",
      initials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase(),
      isActive: user.is_active,
      organizationId: user.organization_id,
      isPlatformAdmin,
      /**
       * What this user's role may do (`specs/rbac.md` §5.2). Used to hide
       * navigation the API would refuse anyway — cosmetic only, exactly as
       * `middleware.js` describes itself. The API is the boundary.
       */
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
    };
  } catch (error) {
    /**
     * Treating an unreachable API as "signed out" keeps the render alive, and
     * that is right. Doing it SILENTLY was not: this exact catch turned a
     * misconfigured `NEXT_PUBLIC_SERVER_URL` into "every user is logged out",
     * with nothing in the logs to say why, and the browser working fine
     * because it calls the API directly. The log line is the whole difference
     * between a five-minute fix and a production debugging session.
     *
     * `console.error` rather than a thrown error, deliberately: an API blip
     * must not turn every page into a 500. The user still lands on /login.
     */
    console.error(
      `[session] could not resolve the session from ${SERVER_URL || "(no API url configured)"}/api/auth/me — ` +
        `treating the request as signed out. ${error?.message ?? error}` +
        (error?.cause?.message ? ` (cause: ${error.cause.message})` : ""),
    );
    return null;
  }
}

/**
 * Where to send someone whose session did not resolve.
 *
 * The distinction matters and there is exactly one place to make it, because
 * `getSessionUser()` returns null for two different situations:
 *
 *   - no cookie at all — a first-time visitor. They get plain `/login`.
 *   - a cookie that the API would not accept — expired, signed with a rotated
 *     secret, missing a claim a newer API requires, or a deleted user. They
 *     get `?session=expired`, which is what `middleware.js` needs in order to
 *     render the form instead of bouncing them back (see the comment there),
 *     and what tells them why they are looking at it.
 *
 * Without the split, every fresh visitor to `/` was told their session had
 * ended — which was never true and made the app look broken on first contact.
 */
export async function loginPath() {
  const cookieStore = await cookies();
  return cookieStore.get(TOKEN_COOKIE)?.value ? "/login?session=expired" : "/login";
}
