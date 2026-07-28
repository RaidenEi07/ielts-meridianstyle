import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Không tìm thấy trang — Anh ngữ Meridian",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <Link href="/">
        <Logo />
      </Link>
      <div>
        <h1 className="text-6xl font-bold text-primary" style={{ fontFamily: "var(--font-serif)" }}>
          404
        </h1>
        <p className="mt-3 text-lg font-semibold">Không tìm thấy trang bạn cần</p>
        <p className="mt-1 text-muted">
          Trang này có thể đã bị xóa hoặc đường dẫn không chính xác.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-full bg-primary px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
      >
        Về trang chủ
      </Link>
    </div>
  );
}
