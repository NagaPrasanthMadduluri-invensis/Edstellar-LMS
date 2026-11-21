/** @type {import('next').NextConfig} */

/**
 * The API origin the browser calls.
 *
 * `NEXT_PUBLIC_*` is inlined into the bundle at BUILD time, not read at
 * runtime — so if it is missing when `next build` runs, the bundle ships
 * broken and setting it on the server afterwards changes nothing. Failing the
 * build is the only moment that is still cheap to fix.
 *
 * Normalisation (trailing slash) lives in `lib/server-url.js`, where the value
 * is actually used; this copy is only for the rewrite below.
 */
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/+$/, "");

/**
 * Where the rewrites below actually fetch from — THIS PROCESS, not a browser.
 *
 * A rewrite is a server-side proxy: Next receives the request and makes its
 * own. Pointing it at the PUBLIC hostname sends that second request out of
 * the box, through the CDN, and back to the same machine — the hairpin
 * AGENTS.md describes for `SERVER_API_URL`, and it does not survive contact
 * with bot protection.
 *
 * Measured on this deployment, both from the box, same path:
 *
 *   https://lms-api.edstellar.com/scorm/<dir>/index.html  ->  403 "Just a moment..."
 *   http://127.0.0.1:5001/scorm/<dir>/index.html          ->  401 (the API, correctly)
 *
 * The 403 is Cloudflare challenging a datacenter IP, and what the learner
 * saw was that challenge page rendered inside the SCORM player's iframe.
 * The browser is never challenged, so this fails ONLY through the proxy —
 * which is exactly why it looked like a SCORM bug rather than a network one.
 *
 * Falls back to the public URL when unset, so a deployment that has not
 * configured it behaves as before. Unlike `lib/session.js`, which reads
 * `SERVER_API_URL` per request, this one is baked into `routes-manifest.json`
 * at BUILD time: changing it needs a rebuild, not a restart.
 */
const INTERNAL_SERVER_URL =
  process.env.SERVER_API_URL?.replace(/\/+$/, "") || SERVER_URL;

if (!SERVER_URL) {
  throw new Error(
    "NEXT_PUBLIC_SERVER_URL is not set. It is baked in at build time, so it " +
      "must be present now. For this project:\n" +
      "    NEXT_PUBLIC_SERVER_URL=https://lms-api.edstellar.com npm run build",
  );
}

const nextConfig = {
  // The Playwright journeys build into their own folder (NEXT_DIST_DIR=.next-e2e)
  // so a test build never wipes the running dev server's .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",

  // Emit a self-contained server bundle (.next/standalone) for a slim Docker
  // runtime image. Harmless for `next start`, which ignores it.
  output: "standalone",

  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },

  // No "X-Powered-By: Next.js" advertising the framework and version family.
  poweredByHeader: false,

  /**
   * Security headers on every page.
   *
   * - `frame-ancestors 'self'` (via CSP, a CSP carrying ONLY that directive):
   *   nobody else may frame the app, so a login or a "Delete" button cannot be
   *   overlaid by another site (clickjacking). The app frames ITSELF for
   *   SCORM (`/scorm` is rewritten to the same origin), which 'self' allows.
   *   No script-src policy: Next's inline bootstrap scripts and the theme's
   *   no-flash script would need nonces, which is a project of its own.
   * - `Referrer-Policy: strict-origin-when-cross-origin`: a link out to an
   *   external meeting or resource sends only our origin, never a path that
   *   may carry a course or certificate id.
   * - Permissions: the app never uses camera, microphone, location or
   *   payments, so no page (or framed SCORM package) may ask for them.
   * - HSTS only when the request reached the edge over HTTPS
   *   (`x-forwarded-proto`), so `next dev` on localhost is never pinned.
   */
  async headers() {
    const common = [
      { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=()",
      },
    ];
    return [
      { source: "/:path*", headers: common },
      {
        source: "/:path*",
        has: [{ type: "header", key: "x-forwarded-proto", value: "https" }],
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },

  /**
   * Proxy SCORM package content from the API.
   *
   * The files live on the server (it owns all storage), but they cannot simply
   * be iframed from the API origin: SCORM content calls
   * `window.parent.API.LMSSetValue(...)`, and the same-origin policy blocks a
   * cross-origin frame from touching the parent's JavaScript. Rewriting keeps
   * `/scorm/...` same-origin with the player page while the bytes still come
   * from the server.
   */
  async rewrites() {
    return [
      {
        source: "/scorm/:path*",
        destination: `${INTERNAL_SERVER_URL}/scorm/:path*`,
      },
      /**
       * Course thumbnails, uploaded by an admin and stored by the API.
       *
       * Rewritten rather than linked at the API origin so `thumbnail_url` is a
       * same-origin path. `next/image` then needs no `remotePatterns` entry for
       * the API host — which matters in development, where that host is plain
       * http and would be rejected by the https-only pattern above.
       */
      {
        source: "/uploads/:path*",
        destination: `${INTERNAL_SERVER_URL}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
