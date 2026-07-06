"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuthStore } from "@/store/auth";

export function SiteHeader() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/">
          <Logo />
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium text-muted">
          <Link href="/courses" className="hidden hover:text-text sm:inline">
            Khóa học
          </Link>
          <ThemeToggle />
          {hydrated && user ? (
            <Link
              href="/dashboard"
              className="rounded-full bg-primary px-5 py-2 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Bảng điều khiển
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-primary px-5 py-2 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Đăng nhập
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
