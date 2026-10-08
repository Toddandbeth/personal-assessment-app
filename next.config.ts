import type { NextConfig } from "next";

// Stamped once per build. The client bundle and the /api/version route both
// inline this same value, so a page running an older build can tell it is
// stale by comparing its own stamp to what the server reports.
const BUILD_ID = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },

  async redirects() {
    return [
      // Vercel adds this project-name address automatically on every deploy and
      // it can't be removed, so anyone who lands on it is sent to the real
      // address (temporary redirect, path and query carried along).
      {
        source: "/:path*",
        has: [{ type: "host", value: "personal-assessment-intentional-ministries.vercel.app" }],
        destination: "https://personal-assessment.intentionalministries.com/:path*",
        permanent: false,
      },
      // The Full Count pages moved under /fullcount. These old addresses
      // keep working (query strings like ?track=group are carried along).
      { source: "/start", destination: "/fullcount/start", permanent: true },
      { source: "/admin", destination: "/fullcount/admin", permanent: true },
      { source: "/admin/:path*", destination: "/fullcount/admin/:path*", permanent: true },
    ];
  },

  async headers() {
    // The hidden Intentional Ministries admin address lives only in an
    // environment variable (never in this repo); keep it out of search
    // engines with a header as well as the page's own noindex tag.
    const imAdminPath = process.env.IM_ADMIN_PATH?.trim();
    return [
      ...(imAdminPath
        ? [
            {
              source: `/${imAdminPath}`,
              headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
            },
          ]
        : []),
      // The Full Count door is invisible to search engines.
      {
        source: "/fullcount/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
