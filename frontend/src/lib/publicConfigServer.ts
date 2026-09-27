// Đọc cấu hình công khai từ backend ở phía server, để layout.tsx và các trang tĩnh ghi thẳng tên, logo và
// bộ màu thương hiệu vào HTML đầu tiên: trình duyệt vẽ đúng ngay từ khung hình đầu, không nháy tên/màu mặc định.
//
// Chỉ import từ server component / route handler.
import { brandColorsFromConfig, brandThemeCss } from "./brandTheme";
import { siteConfigFromPublic, type SiteConfig } from "./siteConfig";

export type PublicConfig = Record<string, string | undefined>;

// Trong container, frontend gọi backend qua mạng nội bộ (INTERNAL_API_BASE_URL, vd http://backend:8090);
// không đặt thì dùng chính URL công khai mà trình duyệt dùng.
export const INTERNAL_API_BASE =
  process.env.INTERNAL_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8090";

const FRESH_MS = 5_000; // admin lưu cấu hình → người dùng thấy trong vài giây
const TIMEOUT_MS = 1_500; // backend chậm/chết thì không được kéo theo cả trang
const RETRY_AFTER_FAILURE_MS = 10_000; // đang lỗi thì đừng làm mỗi request chờ hết timeout

let cached: { config: PublicConfig; at: number } | null = null;
let inflight: Promise<PublicConfig> | null = null;
let failedAt = 0;

/** Lỗi fetch của Node chỉ nói "fetch failed"; nguyên nhân thật (ECONNREFUSED, timeout…) nằm ở `cause`. */
function describe(err: unknown): string {
  const cause = err instanceof Error ? (err.cause as { code?: string } | undefined) : undefined;
  return cause?.code ?? (err instanceof Error ? err.message : String(err));
}

async function load(): Promise<PublicConfig> {
  const res = await fetch(`${INTERNAL_API_BASE}/api/config/public`, {
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as PublicConfig;
}

/**
 * Cấu hình công khai (có cache ngắn). Không bao giờ ném lỗi: backend không trả lời được thì dùng bản gần
 * nhất còn nhớ (hoặc rỗng → mọi nơi rơi về giá trị mặc định), trang vẫn hiển thị bình thường.
 */
export async function getPublicConfig(): Promise<PublicConfig> {
  const now = Date.now();
  if (cached && now - cached.at < FRESH_MS) return cached.config;
  if (failedAt && now - failedAt < RETRY_AFTER_FAILURE_MS) return cached?.config ?? {};
  inflight ??= load()
    .then((config) => {
      cached = { config, at: Date.now() };
      failedAt = 0;
      return config;
    })
    .catch((err: unknown) => {
      failedAt = Date.now();
      console.warn(`[public-config] không đọc được cấu hình (${describe(err)}), dùng bản gần nhất`);
      return cached?.config ?? {};
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** CSS của bộ màu thương hiệu; chuỗi rỗng nghĩa là dùng màu mặc định. */
export async function getBrandThemeCss(): Promise<string> {
  return brandThemeCss(brandColorsFromConfig(await getPublicConfig()));
}

export async function getSiteConfig(): Promise<SiteConfig> {
  return siteConfigFromPublic(await getPublicConfig());
}
