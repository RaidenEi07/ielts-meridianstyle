"use client";

import { useSiteConfig } from "@/components/SiteConfigProvider";
import type { SiteConfig } from "@/lib/siteConfig";
import { useBrokenImage } from "@/lib/useBrokenImage";

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
  // Ảnh lỗi (bị xóa, mạng) → rơi về huy hiệu chữ cái.
  const image = useBrokenImage(logoUrl);
  const showLogo = logoUrl !== "" && !image.broken;

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
            {...image.imgProps}
            src={logoUrl}
            alt={logoOnly ? siteName : ""}
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
