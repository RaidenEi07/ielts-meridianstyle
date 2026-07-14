"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  GraduationCap,
  LineChart,
  Megaphone,
  School,
  Settings,
  Siren,
  Users,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";
import { announcementApi, apiFetch, enrollmentApi, reportApi } from "@/lib/api";
import type { Announcement, Enrollment, SystemAnalytics, User } from "@/lib/types";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuthStore } from "@/store/auth";

function fmtVnd(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "tr";
  if (n >= 1000) return Math.round(n / 1000) + "k";
  return String(n);
}

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-red-soft text-red",
  teacher: "bg-accent-soft text-accent",
  student: "bg-primary-soft text-primary",
};

export default function DashboardPage() {
  const router = useRouter();
  const {
    user,
    accessToken,
    roleAssignments,
    systemCapabilities,
    hydrated,
    loadMe,
    logout,
    hasCapability,
  } = useAuthStore();

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    loadMe()
      .catch(() => {
        logout();
        router.replace("/login");
      })
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, accessToken]);

  if (!hydrated || !ready || !user) {
    return (
      <div className="grid min-h-screen place-items-center text-muted">
        Đang tải…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <ThemeToggle />
            <button
              type="button"
              onClick={() => {
                logout();
                router.replace("/login");
              }}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-text"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
        {/* Thông báo hệ thống */}
        {accessToken && <AnnouncementsBanner token={accessToken} />}

        {/* Lời chào */}
        <section className="rounded-lg border border-border bg-surface p-6">
          <p className="text-sm text-muted">Xin chào,</p>
          <h1 className="mt-1 text-2xl font-bold">{user.fullName}</h1>
          <p className="mt-1 text-sm text-muted">{user.email}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {roleAssignments.map((ra) => (
              <span
                key={ra.id}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  ROLE_STYLES[ra.roleShortname] ?? "bg-soft text-muted"
                }`}
              >
                {ra.roleName} · {ra.contextType}
              </span>
            ))}
          </div>
        </section>

        {/* Quyền hiệu lực */}
        <section className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold">
            Quyền hiệu lực tại hệ thống
          </h2>
          <p className="mb-4 text-sm text-muted">
            Tập capability được phân giải từ các role của bạn (có kế thừa theo
            context).
          </p>
          {systemCapabilities.length === 0 ? (
            <p className="text-sm text-faint">Chưa có quyền nào.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {systemCapabilities.map((cap) => (
                <code
                  key={cap}
                  className="rounded-md bg-soft px-2.5 py-1 text-xs text-text"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {cap}
                </code>
              ))}
            </div>
          )}
        </section>

        {/* Analytics hệ thống (admin) */}
        {hasCapability("report:viewlive") && accessToken && (
          <AdminAnalytics token={accessToken} />
        )}

        {/* Công cụ */}
        <section className="rounded-lg border border-border bg-surface p-6">
          <h2 className="mb-3 text-lg font-semibold">Công cụ</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/grades"
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-medium transition-transform hover:-translate-y-0.5 hover:bg-soft"
            >
              <BarChart3 className="h-4 w-4" /> Điểm số của tôi →
            </Link>
            {hasCapability("course:manage") && (
              <Link
                href="/admin/courses"
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-medium transition-transform hover:-translate-y-0.5 hover:bg-soft"
              >
                <School className="h-4 w-4" /> Quản lý khóa học →
              </Link>
            )}
            {hasCapability("question:manage") && (
              <Link
                href="/teacher/questions"
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-medium transition-transform hover:-translate-y-0.5 hover:bg-soft"
              >
                <BookOpen className="h-4 w-4" /> Ngân hàng câu hỏi →
              </Link>
            )}
            {hasCapability("question:manage") && (
              <Link
                href="/teacher/students"
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-medium transition-transform hover:-translate-y-0.5 hover:bg-soft"
              >
                <GraduationCap className="h-4 w-4" /> Học sinh của tôi →
              </Link>
            )}
            {hasCapability("system:manage") && (
              <Link
                href="/admin/settings"
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-medium transition-transform hover:-translate-y-0.5 hover:bg-soft"
              >
                <Settings className="h-4 w-4" /> Cấu hình hệ thống →
              </Link>
            )}
            {hasCapability("user:manage") && (
              <Link
                href="/admin/users"
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-medium transition-transform hover:-translate-y-0.5 hover:bg-soft"
              >
                <Users className="h-4 w-4" /> Quản lý tài khoản →
              </Link>
            )}
            {hasCapability("user:manage") && (
              <Link
                href="/admin/students"
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-medium transition-transform hover:-translate-y-0.5 hover:bg-soft"
              >
                <LineChart className="h-4 w-4" /> Theo dõi học sinh →
              </Link>
            )}
            {roleAssignments.some((ra) => ra.roleShortname === "parent") && (
              <Link
                href="/parent/children"
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-medium transition-transform hover:-translate-y-0.5 hover:bg-soft"
              >
                <Users className="h-4 w-4" /> Hồ sơ con →
              </Link>
            )}
          </div>
        </section>

        {/* Khóa học của tôi */}
        {accessToken && <MyEnrollments token={accessToken} />}

        {/* Khu vực admin — chỉ hiện khi có quyền user:manage */}
        {hasCapability("user:manage") && accessToken && (
          <AdminUsers token={accessToken} />
        )}
      </main>
    </div>
  );
}

const ENROLL_STATUS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Đang học", cls: "bg-primary-soft text-primary" },
  COMPLETED: { label: "Hoàn thành", cls: "bg-green-soft text-green" },
  CANCELLED: { label: "Đã hủy", cls: "bg-soft text-muted" },
};

function MyEnrollments({ token }: { token: string }) {
  const [items, setItems] = useState<Enrollment[] | null>(null);

  useEffect(() => {
    enrollmentApi.mine(token).then(setItems).catch(() => setItems([]));
  }, [token]);

  return (
    <section className="rounded-lg border border-border bg-surface p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Khóa học của tôi</h2>
        <Link href="/courses" className="text-sm font-medium text-accent">
          Khám phá thêm →
        </Link>
      </div>
      {!items ? (
        <p className="text-sm text-muted">Đang tải…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted">
          Bạn chưa ghi danh khóa học nào.{" "}
          <Link href="/courses" className="text-accent">
            Xem khóa học
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((e) => {
            const st = ENROLL_STATUS[e.status] ?? ENROLL_STATUS.ACTIVE;
            return (
              <li
                key={e.id}
                className="flex items-center gap-4 rounded-lg border border-border p-4"
              >
                <Link
                  href={`/courses/${e.courseId}`}
                  className="flex-1 font-medium hover:text-primary"
                >
                  {e.courseTitle}
                </Link>
                <div className="hidden h-2 w-32 overflow-hidden rounded-full bg-soft sm:block">
                  <div
                    className="h-full rounded-full bg-green"
                    style={{ width: `${e.progressPct}%` }}
                  />
                </div>
                <span className="w-10 text-right text-sm text-muted">
                  {e.progressPct}%
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${st.cls}`}
                >
                  {st.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function AnnouncementsBanner({ token }: { token: string }) {
  const [anns, setAnns] = useState<Announcement[]>([]);

  useEffect(() => {
    announcementApi.active(token).then(setAnns).catch(() => {});
  }, [token]);

  if (anns.length === 0) return null;

  const style = (level: string) =>
    level === "CRITICAL"
      ? "border-red/40 bg-red-soft text-red"
      : level === "WARNING"
        ? "border-accent/40 bg-accent-soft text-accent"
        : "border-primary/30 bg-primary-soft text-primary";

  return (
    <div className="space-y-2">
      {anns.map((a) => (
        <div
          key={a.id}
          className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${style(a.level)}`}
        >
          <span className="mt-0.5">
            {a.level === "CRITICAL" ? (
              <Siren className="h-4 w-4" />
            ) : a.level === "WARNING" ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <Megaphone className="h-4 w-4" />
            )}
          </span>
          <div>
            <p className="text-sm font-semibold">{a.title}</p>
            {a.body && <p className="text-sm opacity-90">{a.body}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminAnalytics({ token }: { token: string }) {
  const [data, setData] = useState<SystemAnalytics | null>(null);

  useEffect(() => {
    reportApi.analytics(token).then(setData).catch(() => {});
  }, [token]);

  if (!data) return null;

  const cards = [
    { label: "Người dùng", value: data.totalUsers },
    { label: "Khóa học", value: data.totalCourses },
    { label: "Ghi danh", value: data.totalEnrollments },
    { label: "Lượt thi", value: data.totalAttempts },
  ];

  // Chart
  const W = 520;
  const H = 160;
  const pad = 28;
  const n = data.monthly.length;
  const groupW = (W - pad * 2) / n;
  const maxRev = Math.max(1, ...data.monthly.map((m) => m.revenue));
  const maxEnr = Math.max(1, ...data.monthly.map((m) => m.enrollments));
  const chartH = H - pad - 20;

  return (
    <section className="rounded-lg border border-border bg-surface p-6">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-lg font-semibold">Tổng quan hệ thống</h2>
        <span className="rounded-full bg-red-soft px-2 py-0.5 text-xs font-semibold text-red">
          Admin
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-border bg-card p-4">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-sm font-medium">Doanh thu & ghi danh 6 tháng</p>
          <p className="text-sm font-semibold text-accent">
            Tổng: {fmtVnd(data.totalRevenue)}đ
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-primary" /> Doanh thu
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-accent" /> Ghi danh
          </span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full">
          {data.monthly.map((m, i) => {
            const x = pad + i * groupW;
            const revH = (m.revenue / maxRev) * chartH;
            const enrH = (m.enrollments / maxEnr) * chartH;
            const bw = groupW / 3.2;
            const baseY = H - 20;
            return (
              <g key={m.month}>
                <rect
                  x={x + groupW / 2 - bw - 2}
                  y={baseY - revH}
                  width={bw}
                  height={revH}
                  rx={2}
                  fill="var(--primary)"
                />
                <rect
                  x={x + groupW / 2 + 2}
                  y={baseY - enrH}
                  width={bw}
                  height={enrH}
                  rx={2}
                  fill="var(--accent)"
                />
                <text
                  x={x + groupW / 2}
                  y={H - 6}
                  textAnchor="middle"
                  fontSize="9"
                  fill="var(--muted)"
                >
                  {m.month.slice(5)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

function AdminUsers({ token }: { token: string }) {
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<User[]>("/api/admin/users", { token })
      .then(setUsers)
      .catch((e) => setError(e.message));
  }, [token]);

  return (
    <section className="rounded-lg border border-border bg-surface p-6">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-lg font-semibold">Quản lý người dùng</h2>
        <span className="rounded-full bg-red-soft px-2 py-0.5 text-xs font-semibold text-red">
          Admin
        </span>
      </div>
      {error && <p className="text-sm text-red">{error}</p>}
      {!users && !error && <p className="text-sm text-muted">Đang tải…</p>}
      {users && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-soft text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Họ tên</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-4 py-2.5 font-medium">{u.fullName}</td>
                  <td className="px-4 py-2.5 text-muted">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-green-soft px-2.5 py-0.5 text-xs font-semibold text-green">
                      {u.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
