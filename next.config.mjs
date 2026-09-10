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
        destination: `${SERVER_URL}/scorm/:path*`,
      },
    ];
  },
};

export default nextConfig;
