import type { Metadata } from "next";

// Trang này là client component nên không tự đặt được metadata; layout này cho trang có tiêu đề/mô tả riêng
// (hậu tố tên trung tâm do template ở app/layout.tsx thêm).
export const metadata: Metadata = {
  title: "Khóa học",
  description: "Danh sách khóa học luyện thi IELTS và tiếng Anh: nội dung, trình độ và số học viên của từng khóa.",
  alternates: { canonical: "/courses" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
