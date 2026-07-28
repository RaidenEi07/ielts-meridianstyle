import type { Metadata } from "next";
import Link from "next/link";
import { StaticPageShell } from "@/components/StaticPageShell";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng — Anh ngữ Meridian",
};

export default function TermsPage() {
  return (
    <StaticPageShell title="Điều khoản sử dụng">
      <p>
        Khi tạo tài khoản và sử dụng nền tảng Anh ngữ Meridian, bạn đồng ý với các
        điều khoản dưới đây.
      </p>

      <h2>Tài khoản</h2>
      <p>
        Bạn chịu trách nhiệm bảo mật thông tin đăng nhập của mình. Mỗi tài khoản
        chỉ dành cho một học viên; tài khoản phụ huynh có thể quản lý hồ sơ con
        theo tính năng riêng của hệ thống.
      </p>

      <h2>Nội dung khóa học</h2>
      <p>
        Toàn bộ video, câu hỏi, tài liệu trong khóa học thuộc bản quyền của Anh
        ngữ Meridian hoặc đối tác cấp phép. Học viên không được sao chép, phân
        phối lại nội dung ra ngoài phạm vi học tập cá nhân.
      </p>

      <h2>Ghi danh &amp; thanh toán</h2>
      <p>
        Hiện tại việc ghi danh khóa học được xử lý thủ công. Chi tiết học phí,
        hình thức thanh toán sẽ được trao đổi trực tiếp qua trang{" "}
        <Link href="/contact" className="text-accent hover:underline">
          Liên hệ
        </Link>
        .
      </p>

      <h2>Thay đổi điều khoản</h2>
      <p>
        Chúng tôi có thể cập nhật điều khoản này theo thời gian. Phiên bản mới sẽ
        được đăng tại trang này.
      </p>

      <p className="!mt-10 text-sm italic">
        Đây là bản nội dung mẫu — vui lòng rà soát lại trước khi công bố chính thức.
      </p>
    </StaticPageShell>
  );
}
