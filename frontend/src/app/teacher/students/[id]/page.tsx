"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GradebookTable } from "@/components/GradebookTable";
import { PageHeader } from "@/components/PageHeader";
import { ApiError, catalogAdminApi, catalogApi, gradebookApi, rosterApi } from "@/lib/api";
import type { CourseSummary, GradebookRow, StudentSummary } from "@/lib/types";
import { useAuthStore } from "@/store/auth";

export default function TeacherStudentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, hydrated, loadMe } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const token = accessToken ?? "";

  const [student, setStudent] = useState<StudentSummary | null>(null);
  const [rows, setRows] = useState<GradebookRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [myCourses, setMyCourses] = useState<CourseSummary[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollMessage, setEnrollMessage] = useState<string | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    loadMe()
      .then(() => setAllowed(useAuthStore.getState().systemCapabilities.includes("question:manage")))
      .catch(() => {})
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, accessToken]);

  useEffect(() => {
    if (!allowed) return;
    rosterApi.myStudents(token).then((list) => {
      setStudent(list.find((s) => s.id === params.id) ?? null);
    });
    gradebookApi
      .forMyStudent(token, params.id)
      .then(setRows)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Không tải được kết quả");
        setRows([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, params.id]);

  useEffect(() => {
    if (!allowed) return;
    catalogApi.categories().then(async (categories) => {
      const perCategory = await Promise.all(
        categories.map((cat) =>
          catalogAdminApi.courses(token, cat.id).catch(() => [] as CourseSummary[]),
        ),
      );
      const seen = new Set<number>();
      const courses = perCategory.flat().filter((c) => {
        if (c.status !== "PUBLISHED" || seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });
      setMyCourses(courses);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  async function handleEnroll() {
    if (!selectedCourseId) return;
    setEnrolling(true);
    setEnrollMessage(null);
    setEnrollError(null);
    try {
      await rosterApi.enrollStudent(token, params.id, Number(selectedCourseId));
      setEnrollMessage("Đã cấp quyền truy cập khóa học cho học sinh.");
    } catch (err) {
      setEnrollError(err instanceof ApiError ? err.message : "Không thể cấp quyền truy cập");
    } finally {
      setEnrolling(false);
    }
  }

  if (!hydrated || !ready) {
    return <div className="grid min-h-screen place-items-center text-muted">Đang tải…</div>;
  }

  if (!allowed) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <p className="text-lg font-semibold">Không có quyền truy cập</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <PageHeader
        title="Học sinh của tôi"
        backHref="/teacher/students"
        backLabel="Danh sách học sinh"
        maxWidthClass="max-w-5xl"
      />

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <div>
          <h1 className="text-2xl font-bold">{student?.fullName ?? "Học sinh"}</h1>
          {student && (
            <p className="text-sm text-muted">
              {student.username} · {student.email}
            </p>
          )}
        </div>
        <div className="space-y-3 rounded-card border border-border bg-surface p-4">
          <h2 className="font-semibold">Cấp quyền truy cập khóa học</h2>
          <p className="text-sm text-muted">
            Chọn một khóa học bạn đang quản lý để cấp quyền truy cập cho học sinh này.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="input flex-1"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              <option value="">-- Chọn khóa học --</option>
              {myCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
              disabled={!selectedCourseId || enrolling}
              onClick={handleEnroll}
            >
              {enrolling ? "Đang cấp quyền…" : "Cấp quyền truy cập"}
            </button>
          </div>
          {enrollMessage && <p className="text-sm text-green">{enrollMessage}</p>}
          {enrollError && <p className="text-sm text-red">{enrollError}</p>}
        </div>

        {error && <p className="text-sm text-red">{error}</p>}
        {rows === null ? (
          <p className="text-muted">Đang tải…</p>
        ) : (
          <GradebookTable rows={rows} emptyLabel="Học sinh này chưa có điểm nào." />
        )}
      </main>
    </div>
  );
}
