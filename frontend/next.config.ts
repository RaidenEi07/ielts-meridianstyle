import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundle gọn cho Docker (chỉ copy .next/standalone + static + public).
  output: "standalone",
};

export default nextConfig;
