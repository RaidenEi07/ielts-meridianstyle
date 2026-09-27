// Tên, khẩu hiệu, logo và email hỗ trợ của trung tâm, đọc từ cấu hình công khai (Cấu hình hệ thống).
// Module thuần (không React/DOM) để dùng được ở server (layout, trang tĩnh, ảnh chia sẻ) lẫn trình duyệt.

export interface SiteConfig {
  siteName: string;
  tagline: string;
  /** URL logo đã tải lên; rỗng = chưa có logo, giao diện dùng huy hiệu chữ cái đầu. */
  logoUrl: string;
  /** Có logo thì chỉ hiện logo, không ghi tên bên cạnh (cho logo đã có sẵn chữ). */
  logoOnly: boolean;
  /** Rỗng = không hiện email liên hệ. */
  supportEmail: string;
}

/** Giá trị dùng khi chưa đọc được cấu hình (backend chưa sẵn sàng) — đúng với bản cài đặt mặc định. */
export const SITE_DEFAULTS: Readonly<SiteConfig> = {
  siteName: "Anh ngữ Meridian",
  tagline: "Hệ thống luyện thi IELTS",
  logoUrl: "",
  logoOnly: false,
  supportEmail: "",
};

/** Chỉ nhận URL http(s) không có khoảng trắng hay dấu nháy: an toàn để đặt vào <img src> và <link href>. */
export function safeImageUrl(url: string | undefined): string {
  const value = (url ?? "").trim();
  return /^https?:\/\/[^\s"'<>]+$/i.test(value) ? value : "";
}

export function siteConfigFromPublic(config: Record<string, string | undefined>): SiteConfig {
  const text = (value: string | undefined, fallback: string) => value?.trim() || fallback;
  return {
    siteName: text(config.SITE_NAME, SITE_DEFAULTS.siteName),
    tagline: text(config.SITE_TAGLINE, SITE_DEFAULTS.tagline),
    logoUrl: safeImageUrl(config.SITE_LOGO_URL),
    logoOnly: config.SITE_LOGO_HIDE_NAME === "true",
    supportEmail: (config.SUPPORT_EMAIL ?? "").trim(),
  };
}

/** Chuỗi ngắn đổi theo nội dung, để gắn vào URL ảnh chia sẻ: đổi thương hiệu thì mạng xã hội tải ảnh mới. */
export function shortHash(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}
