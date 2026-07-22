"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Compass,
  GraduationCap,
  Home,
  School,
  Settings,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/auth";

interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  capability?: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: Home, label: "Bảng điều khiển", href: "/dashboard" },
  { icon: GraduationCap, label: "Khóa học", href: "/courses" },
  { icon: BarChart3, label: "Điểm số của tôi", href: "/grades" },
  { icon: School, label: "Quản lý khóa học", href: "/admin/courses", capability: "course:manage" },
  { icon: BookOpen, label: "Ngân hàng câu hỏi", href: "/teacher/question-bank", capability: "question:manage" },
  { icon: Settings, label: "Cấu hình hệ thống", href: "/admin/settings", capability: "system:manage" },
  { icon: Users, label: "Quản lý tài khoản", href: "/admin/users", capability: "user:manage" },
];

const ROLE_PRIORITY = ["admin", "teacher", "student"];
const ROLE_RING: Record<string, string> = {
  admin: "border-red",
  teacher: "border-accent",
  student: "border-primary",
};

const HIDDEN_PREFIXES = ["/login", "/quiz/"];

function isActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export function BubbleNav() {
  const { accessToken, hydrated, hasCapability, roleAssignments } = useAuthStore();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const containerRef = useRef<HTMLDivElement>(null);

  // Đóng menu khi đổi trang — điều chỉnh state ngay trong lúc render (theo
  // đúng khuyến nghị của React cho "reset state khi 1 giá trị bên ngoài đổi"),
  // không dùng effect để tránh cascading render.
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (!hydrated || !accessToken) return null;
  if (HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p))) return null;

  const items = NAV_ITEMS.filter((i) => !i.capability || hasCapability(i.capability));
  const primaryRole = ROLE_PRIORITY.find((r) => roleAssignments.some((ra) => ra.roleShortname === r));
  const ringClass = (primaryRole && ROLE_RING[primaryRole]) || "border-border";

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {open &&
        items.map((item, i) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="group flex animate-bubble-pop items-center gap-2 transition-transform hover:-translate-y-0.5"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <span className="pointer-events-none whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text shadow-[0_8px_20px_-6px_rgba(38,33,27,.22)]">
                {item.label}
              </span>
              <span
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border shadow-[0_8px_20px_-6px_rgba(38,33,27,.22)] transition-colors ${
                  isActive(item.href, pathname)
                    ? "border-primary bg-primary-soft"
                    : "border-border bg-surface group-hover:bg-soft"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
            </Link>
          );
        })}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
        className={`grid h-14 w-14 place-items-center rounded-full border-2 bg-primary text-white shadow-[0_16px_40px_-10px_rgba(38,33,27,.35)] transition-transform hover:scale-105 active:scale-95 ${ringClass}`}
      >
        {open ? <X className="h-6 w-6" /> : <Compass className="h-6 w-6" />}
      </button>
    </div>
  );
}
