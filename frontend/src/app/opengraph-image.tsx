import { ImageResponse } from "next/og";

export const alt = "Anh ngữ Meridian — Hệ thống luyện thi IELTS";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
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
          background: "#1e3a5f",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 14,
              background: "#c2691d",
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            M
          </div>
          <div style={{ fontSize: 40, fontWeight: 700 }}>Anh ngữ Meridian</div>
        </div>
        <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.15, maxWidth: 900 }}>
          Chinh phục band điểm IELTS mơ ước
        </div>
        <div style={{ fontSize: 28, opacity: 0.8, maxWidth: 820 }}>
          Luyện thi IELTS theo chuẩn phòng thi máy — chấm tự động, quy đổi band ngay.
        </div>
      </div>
    ),
    { ...size },
  );
}
