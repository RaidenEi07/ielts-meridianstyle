import type { Metadata } from "next";
import { Be_Vietnam_Pro, Source_Serif_4 } from "next/font/google";
import { BubbleNav } from "@/components/BubbleNav";
import { ConfirmDialogHost } from "@/components/ConfirmDialogHost";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${beVietnam.variable} ${sourceSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <BubbleNav />
        <ConfirmDialogHost />
      </body>
    </html>
  );
}
