// Đọc màu thương hiệu từ backend ở phía server, để layout.tsx nhét thẳng vào <head> của HTML đầu tiên:
// trình duyệt vẽ đúng màu ngay từ khung hình đầu, không nháy màu mặc định rồi mới đổi.
//
// Chỉ import từ server component (layout.tsx).
import { brandColorsFromConfig, brandThemeCss } from "./brandTheme";

// Trong container, frontend gọi backend qua mạng nội bộ (INTERNAL_API_BASE_URL, vd http://backend:8090);
// không đặt thì dùng chính URL công khai mà trình duyệt dùng.
const API_BASE =
  process.env.INTERNAL_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8090";

const FRESH_MS = 5_000; // admin lưu màu → người dùng thấy trong vài giây
const TIMEOUT_MS = 1_500; // backend chậm/chết thì không được kéo theo cả trang
const RETRY_AFTER_FAILURE_MS = 10_000; // đang lỗi thì đừng làm mỗi request chờ hết timeout

let cached: { css: string; at: number } | null = null;
let inflight: Promise<string> | null = null;
let failedAt = 0;

/** Lỗi fetch của Node chỉ nói "fetch failed"; nguyên nhân thật (ECONNREFUSED, timeout…) nằm ở `cause`. */
function describe(err: unknown): string {
  const cause = err instanceof Error ? (err.cause as { code?: string } | undefined) : undefined;
  return cause?.code ?? (err instanceof Error ? err.message : String(err));
}

async function load(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/config/public`, {
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const config = (await res.json()) as Record<string, string | undefined>;
  return brandThemeCss(brandColorsFromConfig(config));
}

/**
 * CSS của bộ màu thương hiệu; chuỗi rỗng nghĩa là dùng màu mặc định. Không bao giờ ném lỗi: backend
 * không trả lời được thì dùng bản gần nhất còn nhớ (hoặc mặc định), trang vẫn hiển thị bình thường.
 */
export async function getBrandThemeCss(): Promise<string> {
  const now = Date.now();
  if (cached && now - cached.at < FRESH_MS) return cached.css;
  if (failedAt && now - failedAt < RETRY_AFTER_FAILURE_MS) return cached?.css ?? "";
  inflight ??= load()
    .then((css) => {
      cached = { css, at: Date.now() };
      failedAt = 0;
      return css;
    })
    .catch((err: unknown) => {
      failedAt = Date.now();
      console.warn(`[brand-theme] không đọc được cấu hình màu (${describe(err)}), dùng bản gần nhất`);
      return cached?.css ?? "";
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
