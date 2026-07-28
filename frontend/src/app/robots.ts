import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/teacher", "/dashboard", "/parent", "/quiz", "/profile"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
