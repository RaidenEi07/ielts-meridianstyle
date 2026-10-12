"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSiteConfig } from "@/components/SiteConfigProvider";
import { catalogApi } from "@/lib/api";

// Cao ~30px (WCAG 2.2 yêu cầu vùng chạm tối thiểu 24px); trước đây link chân trang chỉ cao 18px.
const LINK = "block py-1 hover:text-white";
const HEADING = "mb-3 font-semibold text-white";

export function Footer() {
  const { siteName, supportEmail, supportPhone, supportAddress } = useSiteConfig();
  const hasContact = supportEmail !== "" || supportPhone !== "" || supportAddress !== "";
  // Danh mục khóa học thật của trung tâm: trước đây chân trang ghi cứng "Luyện thi IELTS / Tiếng Anh giao tiếp"
  // dù trung tâm không hề có danh mục đó.
  const [categories, setCategories] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    catalogApi
      .categories()
      .then((list) => {
        if (!cancelled) setCategories(list.map((c) => c.name));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer style={{ background: "var(--brand-footer-bg, #14110D)", color: "var(--brand-footer-text, #cbbfa9)" }}>
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <div className="text-lg font-semibold text-white" style={{ fontFamily: "var(--font-serif)" }}>
            {siteName}
          </div>
          <p className="mt-2 text-sm">Luyện thi IELTS theo chuẩn phòng thi máy.</p>
        </div>
        <div>
          <h2 className={HEADING}>Khóa học</h2>
          <ul className="text-sm">
            <li><Link href="/courses" className={LINK}>Tất cả khóa học</Link></li>
            {categories.map((name) => (
              <li key={name}><Link href="/courses" className={LINK}>{name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className={HEADING}>Về chúng tôi</h2>
          <ul className="text-sm">
            <li><Link href="/contact" className={LINK}>Đội ngũ giáo viên</Link></li>
            <li><Link href="/contact" className={LINK}>Học viên tiêu biểu</Link></li>
            <li><Link href="/contact" className={LINK}>Liên hệ</Link></li>
          </ul>
        </div>
        <div>
          <h2 className={HEADING}>Liên hệ</h2>
          <ul className="space-y-1.5 text-sm">
            {supportEmail && <li>{supportEmail}</li>}
            {supportPhone && <li>{supportPhone}</li>}
            {supportAddress && <li>{supportAddress}</li>}
            {!hasContact && (
              <li><Link href="/contact" className={LINK}>Trang Liên hệ</Link></li>
            )}
          </ul>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-2 border-t border-white/10 px-6 py-3 text-center text-xs">
        <span>© {new Date().getFullYear()} {siteName}</span>
        <span aria-hidden="true">·</span>
        <Link href="/terms" className="px-1 py-2 hover:text-white">
          Điều khoản sử dụng
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/privacy" className="px-1 py-2 hover:text-white">
          Chính sách bảo mật
        </Link>
      </div>
    </footer>
  );
}
