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
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
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
