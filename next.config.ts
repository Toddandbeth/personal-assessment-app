import type { NextConfig } from "next";

// Stamped once per build. The client bundle and the /api/version route both
// inline this same value, so a page running an older build can tell it is
// stale by comparing its own stamp to what the server reports.
const BUILD_ID = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },
};

export default nextConfig;
