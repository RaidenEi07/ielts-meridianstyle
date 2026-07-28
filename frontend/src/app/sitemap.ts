import type { MetadataRoute } from "next";

// Đổi biến môi trường NEXT_PUBLIC_SITE_URL sang domain thật khi triển khai production.
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/courses", "/login", "/privacy", "/terms", "/contact"];
  return routes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.6,
  }));
}
