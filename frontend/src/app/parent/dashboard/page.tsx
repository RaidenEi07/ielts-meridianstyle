"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WeeklyBarChart } from "@/components/WeeklyBarChart";
import { ApiError, familyApi } from "@/lib/api";
import type { ChildProfile, ChildProgress } from "@/lib/types";
import { useAuthStore } from "@/store/auth";

export default function ParentDashboardPage() {
  const router = useRouter();
  const { user, accessToken, hydrated, loadMe, logout } = useAuthStore();

  const [ready, setReady] = useState(false);
  const [children, setChildren] = useState<ChildProfile[] | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ChildProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!ready || !accessToken) return;
    familyApi
      .children(accessToken)
      .then((list) => {
        setChildren(list);
        if (list.length > 0) setSelectedChildId(list[0].id);
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Không tải được danh sách hồ sơ con"),
      );
  }, [ready, accessToken]);

  useEffect(() => {
    if (!accessToken || !selectedChildId) return;
    familyApi
      .childProgress(accessToken, selectedChildId)
      .then(setProgress)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Không tải được tiến độ học"));
  }, [accessToken, selectedChildId]);

  if (!hydrated || !ready || !user) {
    return <div className="grid min-h-screen place-items-center text-muted">Đang tải…</div>;
  }

  const selectedChild = children?.find((c) => c.id === selectedChildId);

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:text-text"
            >
              ← Bảng điều khiển
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
        <div>
          <h1 className="text-2xl font-bold">Tiến độ học của con</h1>
          <p className="mt-1 text-sm text-muted">
            Theo dõi số buổi học đã hoàn thành và điểm luyện tập trung bình của từng con.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red/30 bg-red-soft px-4 py-3 text-sm text-red">
            {error}
          </div>
        )}

        {!children ? (
          <p className="text-sm text-muted">Đang tải…</p>
        ) : children.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface p-6 text-center text-sm text-muted">
            Chưa có hồ sơ con nào.{" "}
            <Link href="/parent/children" className="text-accent">
              Thêm hồ sơ con
            </Link>{" "}
            trước khi xem tiến độ.
          </p>
        ) : (
          <>
            {children.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {children.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedChildId(c.id)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      selectedChildId === c.id
                        ? "bg-primary text-white"
                        : "border border-border text-muted hover:text-text"
                    }`}
                  >
                    {c.fullName}
                  </button>
                ))}
              </div>
            )}

            {!progress ? (
              <p className="text-sm text-muted">Đang tải tiến độ…</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm text-muted">Buổi học đã hoàn thành</p>
                    <p className="mt-1 text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
                      {progress.totalLessonsCompleted}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm text-muted">Điểm luyện tập trung bình</p>
                    <p className="mt-1 text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
                      {progress.averageScorePct !== null
                        ? `${progress.averageScorePct.toFixed(0)}%`
                        : "—"}
                    </p>
                    {progress.averageScorePct === null && (
                      <p className="mt-1 text-xs text-faint">Chưa có bài luyện tập nào</p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="mb-2 text-sm font-medium">
                    Buổi học hoàn thành theo tuần (8 tuần gần nhất)
                  </p>
                  <WeeklyBarChart
                    data={progress.weeklyLessons.map((w) => ({
                      label: w.weekStart.slice(5),
                      value: w.count,
                    }))}
                  />
                </div>

                <div className="rounded-lg border border-border bg-surface p-6">
                  <h2 className="mb-3 text-lg font-semibold">Buổi học gần đây</h2>
                  {progress.recentLessons.length === 0 ? (
                    <p className="text-sm text-muted">
                      {selectedChild?.fullName ?? "Con"} chưa hoàn thành buổi học nào.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {progress.recentLessons.map((l, i) => (
                        <li
                          key={`${l.sectionTitle}-${i}`}
                          className="flex items-center justify-between rounded-lg border border-border px-4 py-2 text-sm"
                        >
                          <div>
                            <p className="font-medium">{l.sectionTitle}</p>
                            <p className="text-xs text-muted">{l.courseTitle}</p>
                          </div>
                          <span className="text-xs text-muted">
                            {new Date(l.completedAt).toLocaleDateString("vi-VN")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
