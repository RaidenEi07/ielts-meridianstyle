"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GradebookTable } from "@/components/GradebookTable";
import { PageHeader } from "@/components/PageHeader";
import { WrongTypesSummary } from "@/components/WrongTypesSummary";
import { ApiError, catalogAdminApi, catalogApi, enrollmentApi, gradebookApi, usersAdminApi } from "@/lib/api";
import type { AdminUser, CourseSummary, GradebookRow, TypeBreakdown } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { useToast } from "@/store/toast";

export default function AdminStudentDetailPage() {
  // Route dùng username thay vì UUID nội bộ — chỉ để tra ra đúng user; các
  // lệnh gọi API bên dưới vẫn cần UUID thật (`student.id`) nên phải đợi tra
  // xong (student != null) mới gọi.
  const params = useParams<{ username: string }>();
  const router = useRouter();
  const { accessToken, hydrated, loadMe } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const token = accessToken ?? "";

  const [student, setStudent] = useState<AdminUser | null>(null);
  const [rows, setRows] = useState<GradebookRow[] | null>(null);
  const [wrongTypes, setWrongTypes] = useState<TypeBreakdown[]>([]);

  const [allCourses, setAllCourses] = useState<CourseSummary[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    loadMe()
      .then(() => {
        const caps = useAuthStore.getState().systemCapabilities;
        setAllowed(caps.includes("user:manage") || caps.includes("enrollment:manage"));
      })
      .catch(() => {})
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, accessToken]);

  useEffect(() => {
    if (!allowed) return;
    usersAdminApi.list(token).then((users) => {
      setStudent(users.find((u) => u.username === params.username) ?? null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, params.username]);

  function reloadGradebook() {
    if (!student) return;
    gradebookApi.forStudentAsAdmin(token, student.id).then(setRows).catch(() => setRows([]));
    gradebookApi
      .wrongTypesAsAdmin(token, student.id)
      .then(setWrongTypes)
      .catch(() => setWrongTypes([]));
  }

  useEffect(reloadGradebook, [student, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Danh sách mọi khóa học đã xuất bản (mọi danh mục) — admin được ghi danh
  // học sinh vào bất kỳ khóa nào, không giới hạn như giáo viên (chỉ khóa
  // mình quản lý).
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
      setAllCourses(courses);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  async function handleEnroll() {
    if (!selectedCourseId || !student) return;
    setEnrolling(true);
    try {
      await enrollmentApi.enrollStudentAsAdmin(token, student.id, Number(selectedCourseId));
      toast.success("Đã ghi danh học sinh vào khóa học.");
      setSelectedCourseId("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Ghi danh thất bại");
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
        title="Theo dõi học sinh"
        backHref="/admin/students"
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
          <h2 className="font-semibold">Ghi danh vào khóa học</h2>
          <p className="text-sm text-muted">
            Admin ghi danh trực tiếp học sinh này vào bất kỳ khóa học nào đã xuất bản.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="input flex-1"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              <option value="">-- Chọn khóa học --</option>
              {allCourses.map((c) => (
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
              {enrolling ? "Đang ghi danh…" : "Ghi danh"}
            </button>
          </div>
        </div>
        {rows === null ? (
          <p className="text-muted">Đang tải…</p>
        ) : (
          <>
            <WrongTypesSummary rows={wrongTypes} />
            <GradebookTable
              rows={rows}
              emptyLabel="Học sinh này chưa có điểm nào."
              token={token}
              studentName={student?.fullName}
              onGraded={reloadGradebook}
            />
          </>
        )}
      </main>
    </div>
  );
}
