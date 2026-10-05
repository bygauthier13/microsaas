import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/app/", "/api/", "/approve/", "/auth/", "/reset-password"] }],
    sitemap: `${env.appUrl}/sitemap.xml`,
    host: env.appUrl,
  };
}
