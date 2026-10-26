"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, FileText, Layers, Search, UserCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ApiError, authApi, reportApi } from "@/lib/api";
import { downloadCsvTable } from "@/lib/csvDownload";
import type { CourseGradebook, SectionGradebook } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { CourseClassesPanel } from "./CourseClassesPanel";

type Tab = "enrolled" | "students" | "sections" | "quizzes";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN");
}

function fmtDay(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN");
}

function pct(n: number | null): string {
  return n == null ? "—" : `${n}%`;
}

/** Tên tệp an toàn: bỏ dấu tiếng Việt, chỉ giữ chữ-số-gạch ngang. */
function slug(s: string): string {
  const out = s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return out || "khoa-hoc";
}

const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: "enrolled", label: "Học viên đăng ký", icon: Users },
  { id: "students", label: "Điểm theo học viên", icon: UserCheck },
  { id: "sections", label: "Điểm theo section", icon: Layers },
  { id: "quizzes", label: "Điểm theo đề thi", icon: FileText },
];

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
  const [tab, setTab] = useState<Tab>("enrolled");
  const [quizSearch, setQuizSearch] = useState("");
  const [enrolledSearch, setEnrolledSearch] = useState("");

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

  function loadGradebook() {
    reportApi
      .courseGradebook(token, courseId)
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Không tải được sổ điểm"));
  }

  useEffect(() => {
    if (!allowed) return;
    loadGradebook();
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

  const filteredEnrolled = data
    ? data.students.filter((s) =>
        `${s.userName} ${s.username} ${s.email ?? ""}`
          .toLowerCase()
          .includes(enrolledSearch.trim().toLowerCase()),
      )
    : [];

  function exportEnrolled() {
    if (!data) return;
    downloadCsvTable(
      `hoc-vien-${slug(data.courseTitle)}.csv`,
      ["Họ tên", "Tên đăng nhập", "Email", "Ngày ghi danh", "Số đề đã làm", "Tổng số đề", "Hoạt động gần nhất"],
      filteredEnrolled.map((s) => [
        s.userName,
        s.username,
        s.email,
        fmtDay(s.enrolledAt),
        s.quizzesAttempted,
        s.totalQuizzes,
        fmtDate(s.lastActivity),
      ]),
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <PageHeader
        title="Học viên & điểm số"
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
              <p className="text-sm text-muted">Danh sách học viên đăng ký và điểm số toàn khóa học</p>
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
              <div className="rounded-lg border border-border bg-primary-fill p-5 text-white">
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

            <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface p-1 sm:inline-flex">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                    tab === id ? "bg-primary-fill text-white" : "text-muted hover:text-text"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>

            {tab === "enrolled" && (
              <div className="space-y-3">
                <CourseClassesPanel token={token} courseId={courseId} onChanged={loadGradebook} />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="relative w-full max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                    <input
                      value={enrolledSearch}
                      onChange={(e) => setEnrolledSearch(e.target.value)}
                      placeholder="Tìm theo tên, tên đăng nhập hoặc email…"
                      className="input w-full pl-9 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted">
                      {enrolledSearch.trim()
                        ? `${filteredEnrolled.length}/${data.students.length} học viên`
                        : `${data.students.length} học viên đăng ký`}
                    </span>
                    <button
                      type="button"
                      onClick={exportEnrolled}
                      disabled={filteredEnrolled.length === 0}
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-accent hover:bg-soft disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" /> Xuất CSV
                    </button>
                  </div>
                </div>
                <div
                  data-testid="course-enrolled-students-table"
                  className="overflow-x-auto rounded-lg border border-border bg-surface"
                >
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-bg text-left text-xs uppercase tracking-wide text-muted">
                        <th className="px-4 py-3 font-semibold">Học viên</th>
                        <th className="px-4 py-3 font-semibold">Email</th>
                        <th className="px-4 py-3 font-semibold">Ngày ghi danh</th>
                        <th className="px-4 py-3 font-semibold">Đã làm / Tổng đề</th>
                        <th className="px-4 py-3 font-semibold">Hoạt động gần nhất</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEnrolled.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-muted">
                            {data.students.length === 0 ? (
                              <>
                                Chưa có học viên ghi danh khóa này. Ghi danh học viên tại{" "}
                                <Link href="/admin/students" className="font-semibold text-accent hover:underline">
                                  trang Quản lý học viên
                                </Link>
                                .
                              </>
                            ) : (
                              "Không tìm thấy học viên phù hợp."
                            )}
                          </td>
                        </tr>
                      ) : (
                        filteredEnrolled.map((s) => (
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
                            <td className="px-4 py-3 text-muted">{s.email ?? "—"}</td>
                            <td className="px-4 py-3 text-muted">{fmtDay(s.enrolledAt)}</td>
                            <td className="px-4 py-3 font-mono">
                              {s.quizzesAttempted}/{s.totalQuizzes}
                            </td>
                            <td className="px-4 py-3 text-muted">{fmtDate(s.lastActivity)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === "students" && (
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
            )}

            {tab === "sections" && (
              <SectionScores token={token} courseId={courseId} sections={data.sections ?? []} />
            )}

            {tab === "quizzes" && (
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

/** Điểm theo section: danh sách section có đề thi, bấm vào 1 section để xem từng học viên × từng đề. */
function SectionScores({
  token,
  courseId,
  sections,
}: {
  token: string;
  courseId: number;
  sections: CourseGradebook["sections"];
}) {
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [detail, setDetail] = useState<SectionGradebook | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (sectionId == null) return;
    let cancelled = false;
    reportApi
      .sectionGradebook(token, courseId, sectionId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof ApiError ? e.message : "Không tải được điểm của section");
      });
    return () => {
      cancelled = true;
    };
  }, [token, courseId, sectionId]);

  function open(id: number) {
    setDetail(null);
    setLoadError(null);
    setSectionId(id);
  }

  function back() {
    setSectionId(null);
    setDetail(null);
    setLoadError(null);
  }

  function exportMatrix() {
    if (!detail) return;
    downloadCsvTable(
      `diem-${slug(detail.sectionTitle)}.csv`,
      ["Học viên", "Tên đăng nhập", ...detail.quizzes.map((q) => q.quizTitle), "Điểm TB section (%)"],
      detail.students.map((s) => [
        s.userName,
        s.username,
        ...s.cells.map((c) => {
          if (c.attempts === 0) return "";
          if (!c.graded) return "Chưa có điểm";
          return `${c.rawScore}/${c.maxScore ?? "?"}${c.percent != null ? ` (${c.percent}%)` : ""}`;
        }),
        s.avgPercent,
      ]),
    );
  }

  if (sectionId == null) {
    return (
      <div
        data-testid="course-section-scores-list"
        className="overflow-x-auto rounded-lg border border-border bg-surface"
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-semibold">Section</th>
              <th className="px-4 py-3 font-semibold">Số đề</th>
              <th className="px-4 py-3 font-semibold">Học viên đã làm</th>
              <th className="px-4 py-3 font-semibold">Điểm TB</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {sections.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted">
                  Khóa học chưa có section nào có đề thi.
                </td>
              </tr>
            ) : (
              sections.map((s) => (
                <tr key={s.sectionId} className="border-b border-border last:border-0 hover:bg-soft">
                  <td className="px-4 py-3 font-semibold">{s.sectionTitle}</td>
                  <td className="px-4 py-3 font-mono">{s.quizCount}</td>
                  <td className="px-4 py-3 font-mono">{s.studentsAttempted}</td>
                  <td className="px-4 py-3 font-mono">{pct(s.avgPercent)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => open(s.sectionId)}
                      className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-accent hover:bg-soft"
                    >
                      Xem điểm
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={back}
          className="flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Tất cả section
        </button>
        {detail && (
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{detail.sectionTitle}</h2>
            <button
              type="button"
              onClick={exportMatrix}
              disabled={detail.students.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-accent hover:bg-soft disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> Xuất CSV
            </button>
          </div>
        )}
      </div>

      {loadError && <p className="text-sm text-red">{loadError}</p>}
      {!detail && !loadError && <p className="text-sm text-muted">Đang tải…</p>}

      {detail && (
        <div
          data-testid="section-scores-matrix"
          className="overflow-x-auto rounded-lg border border-border bg-surface"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg text-left text-xs uppercase tracking-wide text-muted">
                <th className="sticky left-0 bg-bg px-4 py-3 font-semibold">Học viên</th>
                {detail.quizzes.map((q) => (
                  <th key={q.quizId} className="px-4 py-3 font-semibold normal-case tracking-normal">
                    <Link href={`/admin/quizzes/${q.quizId}`} className="text-accent hover:underline">
                      {q.quizTitle}
                    </Link>
                    {q.maxScore != null && (
                      <p className="text-xs font-normal text-muted">Tối đa {q.maxScore}</p>
                    )}
                  </th>
                ))}
                <th className="px-4 py-3 font-semibold">TB section</th>
              </tr>
            </thead>
            <tbody>
              {detail.students.length === 0 ? (
                <tr>
                  <td colSpan={detail.quizzes.length + 2} className="px-4 py-6 text-center text-muted">
                    Chưa có học viên ghi danh khóa này.
                  </td>
                </tr>
              ) : (
                detail.students.map((s) => (
                  <tr key={s.userId} className="border-b border-border last:border-0 hover:bg-soft">
                    <td className="sticky left-0 bg-surface px-4 py-3">
                      <Link
                        href={`/admin/students/${s.username}`}
                        className="font-semibold text-accent hover:underline"
                      >
                        {s.userName}
                      </Link>
                      <p className="text-xs text-muted">@{s.username}</p>
                    </td>
                    {s.cells.map((c) => (
                      <td key={c.quizId} className="px-4 py-3 font-mono">
                        {c.attempts === 0 ? (
                          <span className="text-muted">—</span>
                        ) : !c.graded ? (
                          <span className="text-xs italic text-muted">Chưa có điểm</span>
                        ) : (
                          <>
                            <span className="font-semibold">
                              {c.rawScore}/{c.maxScore ?? "?"}
                            </span>
                            {c.percent != null && <p className="text-xs text-muted">{c.percent}%</p>}
                            {c.bandScore != null && <p className="text-xs text-muted">Band {c.bandScore}</p>}
                          </>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 font-mono font-semibold">{pct(s.avgPercent)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
