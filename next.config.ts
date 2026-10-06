import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const csp = [
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts; nonce-based CSP can replace 'unsafe-inline' later.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(isProd
    ? [
        { key: "Content-Security-Policy", value: csp },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      ]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The client-side error page shows the support address too; inline it at build time.
  env: { NEXT_PUBLIC_SUPPORT_EMAIL: process.env.SUPPORT_EMAIL ?? "" },
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  experimental: {
    // Allow CSV imports and photo uploads through Server Actions.
    serverActions: { bodySizeLimit: "10mb" },
  },
  // Migrations are read from disk at runtime; make sure they ship with serverless bundles.
  outputFileTracingIncludes: {
    "/**": ["./drizzle/**/*", "./assets/fonts/**/*"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
