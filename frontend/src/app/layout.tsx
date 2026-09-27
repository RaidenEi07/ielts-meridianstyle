import type { Metadata } from "next";
import { Be_Vietnam_Pro, Source_Serif_4 } from "next/font/google";
import { ConfirmDialogHost } from "@/components/ConfirmDialogHost";
import { SiteConfigProvider } from "@/components/SiteConfigProvider";
import { ToastHost } from "@/components/ToastHost";
import { getBrandThemeCss, getSiteConfig } from "@/lib/publicConfigServer";
import { shortHash } from "@/lib/siteConfig";
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

const SITE_DESCRIPTION =
  "Nền tảng quản lý khóa học và luyện thi IELTS theo chuẩn phòng thi máy (CDT).";
// Đổi biến môi trường NEXT_PUBLIC_SITE_URL sang domain thật khi triển khai production.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100";

// Tên, khẩu hiệu, logo của trung tâm lấy từ Cấu hình hệ thống, nên tiêu đề tab, favicon và ảnh chia sẻ
// cũng theo đó. Trang con chỉ cần đặt `title: "Liên hệ"`, hậu tố " — <tên trung tâm>" do template thêm.
export async function generateMetadata(): Promise<Metadata> {
  const [site, brandCss] = await Promise.all([getSiteConfig(), getBrandThemeCss()]);
  const title = `${site.siteName} — ${site.tagline}`;
  // Ảnh chia sẻ dựng theo tên/logo/màu hiện tại; thương hiệu đổi thì URL đổi để Zalo/Facebook tải ảnh mới.
  const ogImage = `/og?v=${shortHash([site.siteName, site.logoUrl, brandCss].join("|"))}`;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s — ${site.siteName}` },
    description: SITE_DESCRIPTION,
    // favicon.ico đặt ở public/ (không phải app/) vì file trong app/ luôn đè cấu hình icons này.
    icons: site.logoUrl
      ? { icon: site.logoUrl, ...(/\.(png|jpe?g)$/i.test(site.logoUrl) && { apple: site.logoUrl }) }
      : { icon: [{ url: "/favicon.ico", sizes: "any" }] },
    openGraph: {
      title,
      description: SITE_DESCRIPTION,
      siteName: site.siteName,
      locale: "vi_VN",
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: SITE_DESCRIPTION,
      images: [ogImage],
    },
  };
}

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

// Cấu hình thương hiệu (màu, tên, logo) được đọc từ backend mỗi lần render để có mặt ngay trong HTML đầu
// tiên, nên layout không prerender tĩnh được.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [site, brandCss] = await Promise.all([getSiteConfig(), getBrandThemeCss()]);
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
        <SiteConfigProvider initial={site}>{children}</SiteConfigProvider>
        <ConfirmDialogHost />
        <ToastHost />
      </body>
    </html>
  );
}
