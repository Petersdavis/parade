import type { NextConfig } from "next";

/**
 * Parade frontend is a fully static Next.js site.
 *
 * `output: "export"` makes `next build` emit a static HTML/CSS/JS bundle into
 * `out/` — every page is rendered at build time (SSG), and no Node server runs
 * on requests. Firebase Hosting serves the `out/` directory from its CDN.
 *
 * Because there is no request-time server:
 *   - no dynamic route handlers, middleware, server actions, or ISR
 *   - no per-request cookies/headers
 *   - auth/session and real-time data are handled client-side via the Firebase SDK
 */
const nextConfig: NextConfig = {
  output: "export",
  // Emit `page/index.html` style paths so static hosts (Firebase Hosting) can
  // resolve clean URLs without a server rewrite.
  trailingSlash: true,
  // The Next.js image optimizer needs a server; disable it for static export.
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
};

export default nextConfig;
