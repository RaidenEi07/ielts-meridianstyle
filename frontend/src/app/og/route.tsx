import { ImageResponse } from "next/og";
import { brandColorsFromConfig, deriveBrandTheme } from "@/lib/brandTheme";
import { getPublicConfig, INTERNAL_API_BASE } from "@/lib/publicConfigServer";
import { siteConfigFromPublic } from "@/lib/siteConfig";

// Ảnh xem trước khi chia sẻ liên kết (Zalo, Facebook…): tên, logo và màu lấy từ Cấu hình hệ thống.
// Là route riêng thay vì file opengraph-image.tsx vì file-based metadata đè lên cấu hình, khiến layout
// không thể gắn `?v=` đổi theo thương hiệu — mà thiếu nó mạng xã hội giữ mãi ảnh cũ.
export const dynamic = "force-dynamic";

const SIZE = { width: 1200, height: 630 };
const LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/svg+xml"]);
const MAX_LOGO_BYTES = 1_000_000;

/**
 * Đọc logo về dạng data URL để nhúng vào ảnh. Chỉ đọc file đã tải lên chính backend này (đúng nguồn URL
 * công khai, đúng thư mục /uploads/images/) và luôn đi qua địa chỉ nội bộ — không bao giờ gọi tới host tùy ý.
 * Bất kỳ trục trặc nào thì trả null và ảnh dùng huy hiệu chữ cái như khi chưa có logo.
 */
async function logoDataUrl(logoUrl: string): Promise<string | null> {
  try {
    const url = new URL(logoUrl);
    const publicBase = new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8090");
    if (url.origin !== publicBase.origin || !url.pathname.startsWith("/uploads/images/")) return null;
    const res = await fetch(new URL(url.pathname, INTERNAL_API_BASE), {
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!LOGO_TYPES.has(type)) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > MAX_LOGO_BYTES) return null;
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

// Dựng ảnh tốn CPU nên nhớ bản gần nhất: nội dung chỉ đổi khi tên/logo/màu đổi.
let latest: { key: string; png: ArrayBuffer } | null = null;

export async function GET() {
  const config = await getPublicConfig();
  const site = siteConfigFromPublic(config);
  const colors = brandColorsFromConfig(config);
  const theme = deriveBrandTheme(colors);
  // Bản đã chỉnh cho đủ tương phản (chữ trắng đọc được trên nền này), không phải màu thô admin nhập.
  const primary = theme?.light.primary ?? colors.primary;
  const accent = theme?.light.accent ?? colors.accent;

  const key = [site.siteName, site.logoUrl, primary, accent].join("|");
  if (latest?.key !== key) {
    const logo = site.logoUrl ? await logoDataUrl(site.logoUrl) : null;
    const image = new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
            gap: 20,
            padding: 96,
            background: primary,
            color: "#ffffff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {logo ? (
              // Khung trắng để logo nào cũng nhìn rõ trên nền màu.
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 168,
                  height: 72,
                  borderRadius: 14,
                  background: "#ffffff",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo} width={152} height={56} style={{ objectFit: "contain" }} alt="" />
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 64,
                  height: 64,
                  borderRadius: 14,
                  background: accent,
                  fontSize: 32,
                  fontWeight: 700,
                }}
              >
                {site.siteName.trim().split(/\s+/).pop()?.charAt(0).toUpperCase() ?? "M"}
              </div>
            )}
            {!(logo && site.logoOnly) && (
              <div style={{ fontSize: 40, fontWeight: 700 }}>{site.siteName}</div>
            )}
          </div>
          <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.15, maxWidth: 1008 }}>
            Chinh phục band điểm IELTS mơ ước
          </div>
          <div style={{ fontSize: 28, opacity: 0.8, maxWidth: 820 }}>
            Luyện thi IELTS theo chuẩn phòng thi máy — chấm tự động, quy đổi band ngay.
          </div>
        </div>
      ),
      { ...SIZE },
    );
    latest = { key, png: await image.arrayBuffer() };
  }
  return new Response(latest.png, {
    headers: { "content-type": "image/png", "cache-control": "public, max-age=300" },
  });
}
