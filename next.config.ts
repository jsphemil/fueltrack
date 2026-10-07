import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the installed app notice a newer deploy (see components/ServiceWorker.tsx).
  env: { NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev" },
};

export default nextConfig;
