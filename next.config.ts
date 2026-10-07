import type { NextConfig } from "next";

// Stamped once per build. The client bundle and the /api/version route both
// inline this same value, so a page running an older build can tell it is
// stale by comparing its own stamp to what the server reports.
const BUILD_ID = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },

  async redirects() {
    return [
      // The Full Count pages moved under /fullcount. These old addresses
      // keep working (query strings like ?track=group are carried along).
      { source: "/start", destination: "/fullcount/start", permanent: true },
      { source: "/admin", destination: "/fullcount/admin", permanent: true },
      { source: "/admin/:path*", destination: "/fullcount/admin/:path*", permanent: true },
      // TEMPORARY until the Intentional Ministries front screen is built:
      // keeps the live site root behaving as it does today. Removed then.
      { source: "/", destination: "/fullcount", permanent: false },
    ];
  },

  async headers() {
    return [
      // The Full Count door is invisible to search engines.
      {
        source: "/fullcount/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
