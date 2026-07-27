"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ApiError, enrollmentApi, gradebookApi, usersAdminApi } from "@/lib/api";
import type { AdminUser, Enrollment, GradebookRow } from "@/lib/types";
import { useAuthStore } from "@/store/auth";

const ENROLLMENT_STATUS_META: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Đang học", cls: "bg-primary-soft text-primary" },
  COMPLETED: { label: "Hoàn thành", cls: "bg-green-soft text-green" },
  CANCELLED: { label: "Đã hủy", cls: "bg-soft text-muted" },
};

export default function AdminStudentDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = params.id;
  const router = useRouter();
  const { accessToken, hydrated, loadMe } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const token = accessToken ?? "";

  const [user, setUser] = useState<AdminUser | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null);
  const [gradebook, setGradebook] = useState<GradebookRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    loadMe()
      .then(() => setAllowed(useAuthStore.getState().systemCapabilities.includes("user:manage")))
      .catch(() => {})
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, accessToken]);

  useEffect(() => {
    if (!allowed || !token) return;
    usersAdminApi
      .list(token)
      .then((list) => setUser(list.find((u) => u.id === userId) ?? null))
      .catch(() => {});
    enrollmentApi
      .forStudentAsAdmin(token, userId)
      .then(setEnrollments)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Không tải được danh sách ghi danh"));
    gradebookApi
      .forStudentAsAdmin(token, userId)
      .then(setGradebook)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Không tải được điểm số"));
  }, [allowed, token, userId]);

  if (!hydrated || !ready) {
    return <div className="grid min-h-screen place-items-center text-muted">Đang tải…</div>;
  }

  if (!allowed) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="text-lg font-semibold">Không có quyền truy cập</p>
          <p className="mt-1 text-sm text-muted">
            Trang này cần quyền <code>user:manage</code>.
          </p>
          <Link href="/dashboard" className="mt-4 inline-block text-accent">
            ← Về bảng điều khiển
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <PageHeader
        title={user ? `Chi tiết: ${user.fullName}` : "Chi tiết học viên"}
        backHref="/admin/users"
        backLabel="Quản lý tài khoản"
      />

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        {error && <p className="text-sm text-red">{error}</p>}

        {user && (
          <div className="grid gap-3 rounded-card border border-border bg-surface p-4 text-sm sm:grid-cols-3">
            <p>
              <span className="text-muted">Tên đăng nhập: </span>
              {user.username}
            </p>
            <p>
              <span className="text-muted">Email: </span>
              {user.email}
            </p>
            <p>
              <span className="text-muted">Họ tên: </span>
              {user.fullName}
            </p>
          </div>
        )}

        <section>
          <h2 className="mb-3 text-lg font-semibold">
            Khóa học đã ghi danh ({enrollments?.length ?? 0})
          </h2>
          <div className="overflow-hidden rounded-card border border-border bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="bg-soft text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Khóa học</th>
                  <th className="px-4 py-2.5 font-medium">Trạng thái</th>
                  <th className="px-4 py-2.5 text-right font-medium">Tiến độ</th>
                  <th className="px-4 py-2.5 text-right font-medium">Ngày ghi danh</th>
                </tr>
              </thead>
              <tbody>
                {enrollments === null ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted">
                      Đang tải…
                    </td>
                  </tr>
                ) : enrollments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted">
                      Chưa ghi danh khóa học nào.
                    </td>
                  </tr>
                ) : (
                  enrollments.map((e) => {
                    const st = ENROLLMENT_STATUS_META[e.status] ?? ENROLLMENT_STATUS_META.ACTIVE;
                    return (
                      <tr key={e.id} className="border-t border-border">
                        <td className="px-4 py-3 font-medium">{e.courseTitle}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-muted">
                          {e.progressPct}%
                        </td>
                        <td className="px-4 py-3 text-right text-muted">
                          {new Date(e.enrolledAt).toLocaleDateString("vi-VN")}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Lượt làm bài & điểm số</h2>
          <div className="overflow-hidden rounded-card border border-border bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="bg-soft text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Quiz</th>
                  <th className="px-4 py-2.5 font-medium">Khóa học</th>
                  <th className="px-4 py-2.5 text-right font-medium">Điểm</th>
                  <th className="px-4 py-2.5 text-right font-medium">Band</th>
                  <th className="px-4 py-2.5 font-medium">Trạng thái</th>
                  <th className="px-4 py-2.5 text-right font-medium">Số lượt làm</th>
                  <th className="px-4 py-2.5 text-right font-medium">Nộp gần nhất</th>
                </tr>
              </thead>
              <tbody>
                {gradebook === null ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-muted">
                      Đang tải…
                    </td>
                  </tr>
                ) : gradebook.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-muted">
                      Chưa có lượt làm bài nào.
                    </td>
                  </tr>
                ) : (
                  gradebook.map((row) => (
                    <tr key={row.quizId} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{row.quizTitle}</td>
                      <td className="px-4 py-3 text-muted">{row.courseName}</td>
                      <td className="px-4 py-3 text-right font-mono text-muted">
                        {row.bestScore ?? "—"}
                        {row.maxScore != null ? ` / ${row.maxScore}` : ""}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted">
                        {row.bandScore ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted">{row.status}</td>
                      <td className="px-4 py-3 text-right text-muted">{row.attempts}</td>
                      <td className="px-4 py-3 text-right text-muted">
                        {row.lastSubmittedAt
                          ? new Date(row.lastSubmittedAt).toLocaleDateString("vi-VN")
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
