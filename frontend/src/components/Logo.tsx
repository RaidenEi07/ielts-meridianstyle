"use client";

import { useState } from "react";
import { useSiteConfig } from "@/components/SiteConfigProvider";
import type { SiteConfig } from "@/lib/siteConfig";

export function Logo({
  className = "",
  onDark = false,
  preview,
}: {
  className?: string;
  /**
   * Đặt trên nền màu/tối cố định (panel đăng nhập, thanh phòng thi): logo ảnh luôn nằm trên khung trắng.
   * Ở các nơi khác khung theo bảng màu (--logo-chip): trong suốt trên nền sáng, trắng khi nền tối.
   */
  onDark?: boolean;
  /** Xem thử ngay trên trang Cấu hình (chưa lưu): ghi đè giá trị đang dùng. */
  preview?: Partial<Pick<SiteConfig, "siteName" | "logoUrl" | "logoOnly">>;
}) {
  const site = useSiteConfig();
  const { siteName, logoUrl, logoOnly } = { ...site, ...preview };
  // Ảnh lỗi (bị xóa, mạng) → nhớ URL hỏng để rơi về huy hiệu chữ cái; đổi sang URL khác thì thử lại.
  const [failedUrl, setFailedUrl] = useState("");
  const showLogo = logoUrl !== "" && logoUrl !== failedUrl;

  // Chữ cái đầu của TỪ CUỐI (vd. "Anh ngữ Meridian" → "M") — giữ đúng huy hiệu
  // hiện tại thay vì lấy chữ cái đầu toàn bộ tên (sẽ ra "A", sai ý đồ thiết kế).
  const monogram = siteName.trim().split(/\s+/).pop()?.charAt(0).toUpperCase() ?? "M";

  return (
    <span data-testid="Logo" className={`inline-flex items-center gap-2 ${className}`}>
      {showLogo ? (
        // Khung vẽ bằng box-shadow (không phải padding) nên không làm logo lệch chỗ khi khung trong suốt.
        <span
          className="rounded-md"
          style={{
            background: onDark ? "#ffffff" : "var(--logo-chip)",
            boxShadow: `0 0 0 2px ${onDark ? "#ffffff" : "var(--logo-chip)"}`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={(el) => {
              // Ảnh do server dựng có thể đã tải hỏng TRƯỚC khi React gắn onError (lúc hydrate) nên sự kiện
              // lỗi bị bỏ lỡ: kiểm tra lại trạng thái ngay khi phần tử được gắn. SVG bỏ qua vì có thể
              // báo naturalWidth = 0 dù vẫn hiển thị bình thường (thiếu width/height).
              if (el && el.complete && el.naturalWidth === 0 && !/\.svg$/i.test(logoUrl)) {
                setFailedUrl(logoUrl);
              }
            }}
            src={logoUrl}
            alt={logoOnly ? siteName : ""}
            onError={() => setFailedUrl(logoUrl)}
            className="block h-9 w-auto max-w-40 object-contain"
          />
        </span>
      ) : (
        <span
          aria-hidden
          className="grid h-9 w-9 place-items-center rounded-md bg-primary text-white"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {monogram}
        </span>
      )}
      {!(showLogo && logoOnly) && (
        <span
          className="text-lg font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {siteName}
        </span>
      )}
    </span>
  );
}
