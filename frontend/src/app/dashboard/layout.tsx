import type { Metadata } from "next";

// Trang này là client component nên không tự đặt được metadata; layout này cho trang có tiêu đề/mô tả riêng
// (hậu tố tên trung tâm do template ở app/layout.tsx thêm).
export const metadata: Metadata = {
  title: "Bảng điều khiển",
  description: "Bảng điều khiển cá nhân.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
