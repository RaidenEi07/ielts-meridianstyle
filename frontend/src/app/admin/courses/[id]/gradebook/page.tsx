"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FileText, Search, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ApiError, authApi, reportApi } from "@/lib/api";
import type { CourseGradebook } from "@/lib/types";
import { useAuthStore } from "@/store/auth";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN");
}

function pct(n: number | null): string {
  return n == null ? "—" : `${n}%`;
}

export default function AdminCourseGradebookPage() {
  const params = useParams<{ id: string }>();
  const courseId = Number(params.id);
  const router = useRouter();
  const { accessToken, hydrated, loadMe } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const token = accessToken ?? "";

  const [data, setData] = useState<CourseGradebook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"students" | "quizzes">("students");
  const [quizSearch, setQuizSearch] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    loadMe()
      .then(async () => {
        if (useAuthStore.getState().systemCapabilities.includes("report:viewlive")) {
          setAllowed(true);
          return;
        }
        // Chưa có quyền hệ thống — kiểm thêm quyền lẻ gán RIÊNG cho đúng khóa
        // này (giáo viên có thể chỉ được cấp report:viewlive ở 1 khóa cụ thể,
        // không có role hệ thống nào — xem authApi.myCourseCapabilities, cùng
        // cách trang chi tiết khóa học kiểm tra course:manage).
        try {
          const courseCaps = await authApi.myCourseCapabilities(token, courseId);
          setAllowed(courseCaps.includes("report:viewlive"));
        } catch {
          setAllowed(false);
        }
      })
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, accessToken]);

  useEffect(() => {
    if (!allowed) return;
    reportApi
      .courseGradebook(token, courseId)
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Không tải được sổ điểm"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, courseId]);

  if (!hydrated || !ready) {
    return <div className="grid min-h-screen place-items-center text-muted">Đang tải…</div>;
  }
  if (!allowed) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="text-lg font-semibold">Không có quyền truy cập</p>
          <p className="mt-1 text-sm text-muted">
            Trang này cần quyền <code>report:viewlive</code>.
          </p>
          <Link href="/dashboard" className="mt-4 inline-block text-accent">
            ← Về bảng điều khiển
          </Link>
        </div>
      </div>
    );
  }

  const filteredQuizzes = data
    ? data.quizzes.filter((q) =>
        `${q.quizTitle} ${q.sectionTitle ?? ""}`.toLowerCase().includes(quizSearch.trim().toLowerCase()),
      )
    : [];

  return (
    <div className="min-h-screen bg-bg">
      <PageHeader
        title="Sổ điểm khóa học"
        backHref={`/admin/courses/${courseId}`}
        backLabel="Chi tiết khóa học"
        maxWidthClass="max-w-6xl"
      />

      <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        {error && <p className="text-sm text-red">{error}</p>}
        {!data && !error ? (
          <p className="text-sm text-muted">Đang tải…</p>
        ) : data ? (
          <>
            <div>
              <h1 className="text-2xl font-bold">{data.courseTitle}</h1>
              <p className="text-sm text-muted">Sổ điểm tổng hợp toàn khóa học</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-surface p-5">
                <p className="text-sm text-muted">Học viên ghi danh</p>
                <p className="mt-1 text-3xl font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                  {data.enrolledCount}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-5">
                <p className="text-sm text-muted">Tổng số đề</p>
                <p className="mt-1 text-3xl font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                  {data.totalQuizzes}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-primary p-5 text-white">
                <p className="text-sm text-white/70">Tỷ lệ hoàn thành TB</p>
                <p className="mt-1 text-3xl font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                  {pct(data.avgCompletionPercent)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-5">
                <p className="text-sm text-muted">Điểm TB chung</p>
                <p className="mt-1 text-3xl font-bold text-accent" style={{ fontFamily: "var(--font-serif)" }}>
                  {pct(data.avgScorePercent)}
                </p>
              </div>
            </div>

            <div className="inline-flex rounded-lg border border-border bg-surface p-1">
              <button
                type="button"
                onClick={() => setTab("students")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                  tab === "students" ? "bg-primary text-white" : "text-muted hover:text-text"
                }`}
              >
                <Users className="h-4 w-4" /> Theo học viên
              </button>
              <button
                type="button"
                onClick={() => setTab("quizzes")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                  tab === "quizzes" ? "bg-primary text-white" : "text-muted hover:text-text"
                }`}
              >
                <FileText className="h-4 w-4" /> Theo đề thi
              </button>
            </div>

            {tab === "students" ? (
              <div
                data-testid="course-gradebook-students-table"
                className="overflow-x-auto rounded-lg border border-border bg-surface"
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg text-left text-xs uppercase tracking-wide text-muted">
                      <th className="px-4 py-3 font-semibold">Học viên</th>
                      <th className="px-4 py-3 font-semibold">Đã làm / Tổng đề</th>
                      <th className="px-4 py-3 font-semibold">Điểm TB</th>
                      <th className="px-4 py-3 font-semibold">Band cao nhất</th>
                      <th className="px-4 py-3 font-semibold">Hoạt động gần nhất</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.students.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-muted">
                          Chưa có học viên ghi danh.
                        </td>
                      </tr>
                    ) : (
                      data.students.map((s) => (
                        <tr key={s.userId} className="border-b border-border last:border-0 hover:bg-soft">
                          <td className="px-4 py-3">
                            <Link
                              href={`/admin/students/${s.username}`}
                              className="font-semibold text-accent hover:underline"
                            >
                              {s.userName}
                            </Link>
                            <p className="text-xs text-muted">@{s.username}</p>
                          </td>
                          <td className="px-4 py-3 font-mono">
                            {s.quizzesAttempted}/{s.totalQuizzes}
                          </td>
                          <td className="px-4 py-3 font-mono">{pct(s.avgPercent)}</td>
                          <td className="px-4 py-3 font-mono">{s.bestBand ?? "—"}</td>
                          <td className="px-4 py-3 text-muted">{fmtDate(s.lastActivity)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                  <input
                    value={quizSearch}
                    onChange={(e) => setQuizSearch(e.target.value)}
                    placeholder="Tìm đề thi…"
                    className="input w-full pl-9 text-sm"
                  />
                </div>
                <div
                  data-testid="course-gradebook-quizzes-table"
                  className="overflow-x-auto rounded-lg border border-border bg-surface"
                >
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-bg text-left text-xs uppercase tracking-wide text-muted">
                        <th className="px-4 py-3 font-semibold">Đề thi</th>
                        <th className="px-4 py-3 font-semibold">Section</th>
                        <th className="px-4 py-3 font-semibold">Học viên đã làm</th>
                        <th className="px-4 py-3 font-semibold">Đã chấm</th>
                        <th className="px-4 py-3 font-semibold">Điểm TB</th>
                        <th className="px-4 py-3 font-semibold">Tỷ lệ đạt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQuizzes.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-muted">
                            {data.quizzes.length === 0
                              ? "Khóa học chưa có đề thi."
                              : "Không tìm thấy đề thi phù hợp."}
                          </td>
                        </tr>
                      ) : (
                        filteredQuizzes.map((q) => (
                          <tr key={q.quizId} className="border-b border-border last:border-0 hover:bg-soft">
                            <td className="px-4 py-3">
                              <Link
                                href={`/admin/quizzes/${q.quizId}`}
                                className="font-semibold text-accent hover:underline"
                              >
                                {q.quizTitle}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-muted">{q.sectionTitle ?? "—"}</td>
                            <td className="px-4 py-3 font-mono">{q.distinctStudents}</td>
                            <td className="px-4 py-3 font-mono">{q.graded}</td>
                            <td className="px-4 py-3 font-mono">
                              {q.avgScore != null ? `${q.avgScore}/${q.maxScore ?? "—"}` : "—"}
                            </td>
                            <td className="px-4 py-3 font-mono">{pct(q.passRate)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
