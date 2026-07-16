import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundle gọn cho Docker (chỉ copy .next/standalone + static + public).
  output: "standalone",
  // Cho phép truy cập dev server qua IP LAN (test trên tablet thật, Phase 16) —
  // Next.js mặc định chặn cross-origin request tới dev-only assets, khiến
  // trang tải được nhưng hydrate thất bại hoàn toàn khi vào qua IP khác localhost.
  allowedDevOrigins: ["192.168.1.7"],
};

export default nextConfig;
