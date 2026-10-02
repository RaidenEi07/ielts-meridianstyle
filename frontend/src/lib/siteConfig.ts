// Tên, khẩu hiệu, logo, ảnh đầu trang chủ, con số/lời chứng thực và thông tin liên hệ của trung tâm, đọc từ cấu hình
// công khai (Cấu hình hệ thống).
// Module thuần (không React/DOM) để dùng được ở server (layout, trang tĩnh, ảnh chia sẻ) lẫn trình duyệt.

export interface Testimonial {
  name: string;
  /** Điểm band (vd. "7.5"); rỗng = không hiện huy hiệu band. */
  band: string;
  text: string;
}

/**
 * Giới hạn độ dài các ô nội dung trang chủ / liên hệ. Backend (ConfigService) kiểm tra đúng các con số này,
 * nên đổi ở đâu thì đổi cả hai nơi.
 */
export const HOMEPAGE_LIMITS = {
  highlightValue: 12,
  highlightLabel: 40,
  teachersLabel: 40,
  phone: 40,
  address: 200,
  testimonials: 12,
  testimonialName: 80,
  testimonialBand: 10,
  testimonialText: 600,
} as const;

export interface SiteConfig {
  siteName: string;
  tagline: string;
  /** URL logo đã tải lên; rỗng = chưa có logo, giao diện dùng huy hiệu chữ cái đầu. */
  logoUrl: string;
  /** Có logo thì chỉ hiện logo, không ghi tên bên cạnh (cho logo đã có sẵn chữ). */
  logoOnly: boolean;
  /** URL ảnh đầu trang chủ đã tải lên; rỗng = chưa có, trang chủ hiện họa tiết sọc mẫu. */
  heroImageUrl: string;
  /** Con số nổi bật (vd. "92%"); rỗng = ẩn ở nhãn trên ảnh trang chủ, dải số liệu và trang đăng nhập. */
  highlightValue: string;
  /** Chữ dưới con số nổi bật (vd. "Đạt mục tiêu"). */
  highlightLabel: string;
  /** Chữ dưới số giáo viên ở dải số liệu trang chủ. */
  teachersLabel: string;
  /** Lời chứng thực học viên; rỗng = ẩn cả mục "Học viên nói gì". */
  testimonials: Testimonial[];
  /** Rỗng = không hiện email liên hệ. */
  supportEmail: string;
  /** Rỗng = không hiện số điện thoại. */
  supportPhone: string;
  /** Rỗng = không hiện địa chỉ. */
  supportAddress: string;
}

/**
 * Giá trị dùng khi chưa đọc được cấu hình (backend chưa sẵn sàng). Cố ý không có con số hay lời chứng thực nào:
 * thà ẩn đi còn hơn hiện nội dung chưa được xác nhận.
 */
export const SITE_DEFAULTS: Readonly<SiteConfig> = {
  siteName: "Anh ngữ Meridian",
  tagline: "Hệ thống luyện thi IELTS",
  logoUrl: "",
  logoOnly: false,
  heroImageUrl: "",
  highlightValue: "",
  highlightLabel: "",
  teachersLabel: "Giáo viên",
  testimonials: [],
  supportEmail: "",
  supportPhone: "",
  supportAddress: "",
};

/** Chỉ nhận URL http(s) không có khoảng trắng hay dấu nháy: an toàn để đặt vào <img src> và <link href>. */
export function safeImageUrl(url: string | undefined): string {
  const value = (url ?? "").trim();
  return /^https?:\/\/[^\s"'<>]+$/i.test(value) ? value : "";
}

const shortText = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/**
 * Đọc JSON lời chứng thực một cách phòng thủ: dữ liệu hỏng, thiếu hay sai kiểu chỉ làm mục này ẩn đi (hoặc bỏ
 * qua dòng đó), không bao giờ làm hỏng trang chủ. Dòng không có nội dung (text) bị bỏ.
 */
export function parseTestimonials(raw: string | undefined): Testimonial[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: Testimonial[] = [];
  for (const item of parsed.slice(0, HOMEPAGE_LIMITS.testimonials)) {
    if (typeof item !== "object" || item === null) continue;
    const entry = item as Record<string, unknown>;
    const text = shortText(entry.text, HOMEPAGE_LIMITS.testimonialText);
    if (!text) continue;
    out.push({
      name: shortText(entry.name, HOMEPAGE_LIMITS.testimonialName),
      band: shortText(entry.band, HOMEPAGE_LIMITS.testimonialBand),
      text,
    });
  }
  return out;
}

/** Ngược lại của parseTestimonials, để gửi lên khi lưu: cắt khoảng trắng và bỏ dòng chưa có nội dung. */
export function serializeTestimonials(list: readonly Testimonial[]): string {
  return JSON.stringify(
    list
      .map((t) => ({ name: t.name.trim(), band: t.band.trim(), text: t.text.trim() }))
      .filter((t) => t.text !== ""),
  );
}

export function siteConfigFromPublic(config: Record<string, string | undefined>): SiteConfig {
  const text = (value: string | undefined, fallback: string) => value?.trim() || fallback;
  return {
    siteName: text(config.SITE_NAME, SITE_DEFAULTS.siteName),
    tagline: text(config.SITE_TAGLINE, SITE_DEFAULTS.tagline),
    logoUrl: safeImageUrl(config.SITE_LOGO_URL),
    logoOnly: config.SITE_LOGO_HIDE_NAME === "true",
    heroImageUrl: safeImageUrl(config.HOMEPAGE_HERO_IMAGE_URL),
    highlightValue: shortText(config.HOMEPAGE_HIGHLIGHT_VALUE, HOMEPAGE_LIMITS.highlightValue),
    highlightLabel: shortText(config.HOMEPAGE_HIGHLIGHT_LABEL, HOMEPAGE_LIMITS.highlightLabel),
    teachersLabel:
      shortText(config.HOMEPAGE_TEACHERS_LABEL, HOMEPAGE_LIMITS.teachersLabel) || SITE_DEFAULTS.teachersLabel,
    testimonials: parseTestimonials(config.HOMEPAGE_TESTIMONIALS),
    supportEmail: (config.SUPPORT_EMAIL ?? "").trim(),
    supportPhone: shortText(config.SUPPORT_PHONE, HOMEPAGE_LIMITS.phone),
    supportAddress: shortText(config.SUPPORT_ADDRESS, HOMEPAGE_LIMITS.address),
  };
}

/** Chuỗi ngắn đổi theo nội dung, để gắn vào URL ảnh chia sẻ: đổi thương hiệu thì mạng xã hội tải ảnh mới. */
export function shortHash(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}
