import type { Metadata } from "next";
import { Be_Vietnam_Pro, Source_Serif_4 } from "next/font/google";
import { ConfirmDialogHost } from "@/components/ConfirmDialogHost";
import { ToastHost } from "@/components/ToastHost";
import { getBrandThemeCss } from "@/lib/brandThemeServer";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-be-vietnam",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-source-serif",
  display: "swap",
});

const SITE_NAME = "Anh ngữ Meridian";
const SITE_DESCRIPTION =
  "Nền tảng quản lý khóa học và luyện thi IELTS theo chuẩn phòng thi máy (CDT).";
// Đổi biến môi trường NEXT_PUBLIC_SITE_URL sang domain thật khi triển khai production.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${SITE_NAME} — Hệ thống luyện thi IELTS`,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: `${SITE_NAME} — Hệ thống luyện thi IELTS`,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    locale: "vi_VN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Hệ thống luyện thi IELTS`,
    description: SITE_DESCRIPTION,
  },
};

// Đặt class .dark trước first paint để tránh nhấp nháy theme.
const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('theme');
    if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

// Màu thương hiệu (Cấu hình hệ thống) được đọc từ backend mỗi lần render để có mặt ngay trong HTML đầu
// tiên, nên layout không prerender tĩnh được.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const brandCss = await getBrandThemeCss();
  return (
    <html
      lang="vi"
      className={`${beVietnam.variable} ${sourceSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Luôn render (kể cả rỗng) để trang Cấu hình cập nhật tại chỗ sau khi lưu màu. */}
        <style id="brand-theme" dangerouslySetInnerHTML={{ __html: brandCss }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <ConfirmDialogHost />
        <ToastHost />
      </body>
    </html>
  );
}
