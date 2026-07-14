"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuthStore } from "@/store/auth";

export function SiteHeader() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const activeChildId = useAuthStore((s) => s.activeChildId);
  const switchBackToParent = useAuthStore((s) => s.switchBackToParent);

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
          {hydrated && user && activeChildId && (
            <button
              type="button"
              onClick={async () => {
                await switchBackToParent();
                router.push("/parent/children");
              }}
              className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent transition-opacity hover:opacity-80"
            >
              Đang học: {user.fullName} · Quay lại phụ huynh
            </button>
          )}
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
