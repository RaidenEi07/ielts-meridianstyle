import type { NextConfig } from "next";

// Header bảo mật gửi kèm mọi trang. Cố ý KHÔNG đặt Content-Security-Policy đầy đủ (trang dùng script nội tuyến của
// Next, media/ảnh từ domain API và vài nguồn ngoài; CSP chặt dễ làm hỏng bài thi) — chỉ chặn bị nhúng iframe.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Chống clickjacking (trang đăng nhập bị nhúng vào iframe của trang khác). Cả 2 header để trình duyệt cũ cũng hiểu.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Chỉ micro được dùng (ghi âm luyện nói); tắt camera/định vị/thanh toán/USB. Header này bị bỏ qua trên HTTP.
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), microphone=(self), payment=(), usb=()",
  },
  // 180 ngày, không includeSubDomains (tên miền cha còn dịch vụ khác). Trình duyệt bỏ qua header này trên HTTP, nên
  // web tổng chạy HTTP theo IP không bị ảnh hưởng.
  { key: "Strict-Transport-Security", value: "max-age=15552000" },
];

const nextConfig: NextConfig = {
  // Bundle gọn cho Docker (chỉ copy .next/standalone + static + public).
  output: "standalone",
  // Không khoe "X-Powered-By: Next.js".
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Cho phép truy cập dev server qua IP LAN (test trên tablet thật, Phase 16) —
  // Next.js mặc định chặn cross-origin request tới dev-only assets, khiến
  // trang tải được nhưng hydrate thất bại hoàn toàn khi vào qua IP khác localhost.
  allowedDevOrigins: ["192.168.1.7"],
};

export default nextConfig;
