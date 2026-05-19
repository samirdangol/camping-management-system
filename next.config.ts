import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Public Vercel Blob images are served from *.public.blob.vercel-storage.com.
    // Private blobs go through our /api/blob proxy (same-origin, no allowlist needed).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
