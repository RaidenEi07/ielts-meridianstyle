"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  History,
  LayoutDashboard,
  LogOut,
  Network,
  School,
  Settings,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";

interface MenuItem {
  icon: LucideIcon;
  label: string;
  href: string;
  capability?: string;
  /** Chỉ hiện trên deployment "web tổng" (isMaster). */
  masterOnly?: boolean;
}

const PRIMARY_ITEMS: MenuItem[] = [
  { icon: LayoutDashboard, label: "Bảng điều khiển", href: "/dashboard" },
  { icon: History, label: "Lịch sử làm bài", href: "/attempts" },
  { icon: BarChart3, label: "Điểm số của tôi", href: "/grades" },
  { icon: User, label: "Hồ sơ của tôi", href: "/profile" },
];

// Cùng danh sách + điều kiện quyền với BubbleNav trước đây (nay hợp nhất vào
// đây - xem [[navigation]] / feedback "unify header" 2026-08-19).
const MANAGE_ITEMS: MenuItem[] = [
  { icon: School, label: "Quản lý khóa học", href: "/admin/courses", capability: "course:manage" },
  { icon: BookOpen, label: "Ngân hàng câu hỏi", href: "/teacher/question-bank", capability: "question:manage" },
  { icon: Settings, label: "Cấu hình hệ thống", href: "/admin/settings", capability: "system:manage" },
  { icon: Users, label: "Quản lý tài khoản", href: "/admin/users", capability: "user:manage" },
  {
    icon: Network,
    label: "Web con",
    href: "/admin/child-sites",
    capability: "course:distribute",
    masterOnly: true,
  },
];

const ROLE_PRIORITY = ["admin", "teacher", "student"];
const ROLE_LABEL: Record<string, string> = {
  admin: "Quản trị viên",
  teacher: "Giáo viên",
  student: "Học viên",
};
const ROLE_STYLE: Record<string, string> = {
  admin: "bg-red-soft text-red",
  teacher: "bg-accent-soft text-accent",
  student: "bg-primary-soft text-primary",
};

/**
 * Menu người dùng dùng chung toàn site — Logo/Header nào cũng gắn được (xem
 * SiteHeader, PageHeader). Gộp lại từ 3 chỗ từng tách rời: nút "Bảng điều
 * khiển" của SiteHeader, khối thẻ điều hướng riêng trong dashboard/page.tsx,
 * và BubbleNav (đã gỡ) - giờ chỉ 1 nơi giữ danh sách mục + quyền + nút Đăng
 * xuất, tránh lặp lại tình trạng "mỗi trang một kiểu nav, đăng xuất chỉ có ở
 * dashboard" đã xảy ra trước đây.
 */
export function UserMenu() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const hasCapability = useAuthStore((s) => s.hasCapability);
  const roleAssignments = useAuthStore((s) => s.roleAssignments);
  const isMaster = useAuthStore((s) => s.isMaster);
  const logout = useAuthStore((s) => s.logout);

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (!hydrated || !user) return null;

  const manageItems = MANAGE_ITEMS.filter(
    (i) => (!i.capability || hasCapability(i.capability)) && (!i.masterOnly || isMaster),
  );
  const primaryRole = ROLE_PRIORITY.find((r) => roleAssignments.some((ra) => ra.roleShortname === r));
  const initial = user.fullName.trim().charAt(0).toUpperCase() || "?";

  function handleLogout() {
    setOpen(false);
    logout();
    router.push("/");
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu tài khoản"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-2.5 text-sm font-medium text-text transition-colors hover:bg-soft sm:pr-3"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">
          {initial}
        </span>
        <span className="hidden max-w-[9rem] truncate sm:inline">{user.fullName}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 w-64 overflow-hidden rounded-lg border border-border bg-surface shadow-[0_16px_40px_-10px_rgba(38,33,27,.22)]">
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-semibold">{user.fullName}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
            {primaryRole && (
              <span
                className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${ROLE_STYLE[primaryRole]}`}
              >
                {ROLE_LABEL[primaryRole]}
              </span>
            )}
          </div>

          <nav className="py-1">
            {PRIMARY_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-text hover:bg-soft"
              >
                <item.icon className="h-4 w-4 text-muted" /> {item.label}
              </Link>
            ))}
          </nav>

          {manageItems.length > 0 && (
            <nav className="border-t border-border py-1">
              {manageItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-text hover:bg-soft"
                >
                  <item.icon className="h-4 w-4 text-muted" /> {item.label}
                </Link>
              ))}
            </nav>
          )}

          <div className="border-t border-border py-1">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm font-medium text-red hover:bg-red-soft"
            >
              <LogOut className="h-4 w-4" /> Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
