/** @type {import('next').NextConfig} */

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001";

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
