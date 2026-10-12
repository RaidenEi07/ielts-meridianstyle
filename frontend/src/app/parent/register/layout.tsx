import type { Metadata } from "next";

// Trang này là client component nên không tự đặt được metadata; layout này cho trang có tiêu đề/mô tả riêng
// (hậu tố tên trung tâm do template ở app/layout.tsx thêm).
export const metadata: Metadata = {
  title: "Đăng ký tài khoản phụ huynh",
  description: "Tạo tài khoản phụ huynh để theo dõi tiến độ học và kết quả của con.",
  alternates: { canonical: "/parent/register" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
