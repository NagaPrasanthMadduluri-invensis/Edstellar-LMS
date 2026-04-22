/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {                                                                                                                                                                                         
      runtime: 'edge',
    },  
};

export default nextConfig;
