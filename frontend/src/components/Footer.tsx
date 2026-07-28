import Link from "next/link";

export function Footer() {
  return (
    <footer style={{ background: "#14110D", color: "#cbbfa9" }}>
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <div className="text-lg font-semibold text-white" style={{ fontFamily: "var(--font-serif)" }}>
            Anh ngữ Meridian
          </div>
          <p className="mt-2 text-sm">Luyện thi IELTS theo chuẩn phòng thi máy.</p>
        </div>
        <div>
          <h4 className="mb-3 font-semibold text-white">Khóa học</h4>
          <ul className="space-y-1.5 text-sm">
            <li><Link href="/courses" className="hover:text-white">Tất cả khóa học</Link></li>
            <li>Luyện thi IELTS</li>
            <li>Tiếng Anh giao tiếp</li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-semibold text-white">Về chúng tôi</h4>
          <ul className="space-y-1.5 text-sm">
            <li><Link href="/contact" className="hover:text-white">Đội ngũ giáo viên</Link></li>
            <li><Link href="/contact" className="hover:text-white">Học viên tiêu biểu</Link></li>
            <li><Link href="/contact" className="hover:text-white">Liên hệ</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-semibold text-white">Liên hệ</h4>
          <ul className="space-y-1.5 text-sm">
            <li>lienhe@meridian.edu.vn</li>
            <li>Hà Nội · TP.HCM</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 px-6 py-4 text-center text-xs">
        <span>© 2026 Anh ngữ Meridian</span>
        <span className="mx-2">·</span>
        <Link href="/terms" className="hover:text-white">
          Điều khoản sử dụng
        </Link>
        <span className="mx-2">·</span>
        <Link href="/privacy" className="hover:text-white">
          Chính sách bảo mật
        </Link>
      </div>
    </footer>
  );
}
