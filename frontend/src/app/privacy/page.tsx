import type { Metadata } from "next";
import Link from "next/link";
import { StaticPageShell } from "@/components/StaticPageShell";

export const metadata: Metadata = {
  title: "Chính sách bảo mật — Anh ngữ Meridian",
};

export default function PrivacyPage() {
  return (
    <StaticPageShell title="Chính sách bảo mật">
      <p>
        Anh ngữ Meridian tôn trọng quyền riêng tư của học viên và phụ huynh. Trang
        này mô tả những dữ liệu chúng tôi thu thập và cách chúng tôi sử dụng chúng.
      </p>

      <h2>Dữ liệu chúng tôi thu thập</h2>
      <p>
        Khi bạn đăng ký tài khoản, chúng tôi thu thập họ tên, tên đăng nhập, email
        và mật khẩu (được mã hóa, chúng tôi không bao giờ lưu mật khẩu dạng văn bản
        thô). Trong quá trình học, hệ thống ghi nhận kết quả làm bài, tiến độ khóa
        học, và với các khóa dành cho trẻ em/tiểu học có thể ghi âm giọng nói phục
        vụ luyện tập.
      </p>

      <h2>Cách chúng tôi sử dụng dữ liệu</h2>
      <p>
        Dữ liệu chỉ được dùng để vận hành dịch vụ học tập: chấm điểm, theo dõi tiến
        độ, gợi ý khóa học phù hợp, và liên hệ hỗ trợ khi cần. Chúng tôi không bán
        hoặc chia sẻ dữ liệu cá nhân cho bên thứ ba ngoài mục đích vận hành nêu trên.
      </p>

      <h2>Cookie</h2>
      <p>
        Hệ thống dùng cookie/local storage để duy trì phiên đăng nhập và lưu tùy
        chọn giao diện (sáng/tối). Không dùng cookie theo dõi quảng cáo bên thứ ba.
      </p>

      <h2>Quyền của bạn</h2>
      <p>
        Bạn có thể yêu cầu xem, chỉnh sửa hoặc xóa dữ liệu cá nhân của mình bất cứ
        lúc nào bằng cách liên hệ qua trang{" "}
        <Link href="/contact" className="text-accent hover:underline">
          Liên hệ
        </Link>
        .
      </p>

      <p className="!mt-10 text-sm italic">
        Đây là bản nội dung mẫu — vui lòng rà soát lại trước khi công bố chính thức.
      </p>
    </StaticPageShell>
  );
}
