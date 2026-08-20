"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ApiError, catalogAdminApi, catalogApi, enrollmentApi, rosterApi, usersAdminApi } from "@/lib/api";
import type { AdminUser, CourseSummary } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { useToast } from "@/store/toast";

function hasRole(u: AdminUser, shortname: string) {
  return u.roleAssignments.some((ra) => ra.roleShortname === shortname);
}

// Cùng ngưỡng phân trang với /teacher/questions và /admin/users — tránh dồn
// hết danh sách học sinh (có thể hàng trăm) vào 1 lần render.
const PAGE_SIZE = 50;

export default function AdminStudentsPage() {
  const router = useRouter();
  const { accessToken, hydrated, loadMe } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const token = accessToken ?? "";
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<AdminUser[]>([]);
  const [teachers, setTeachers] = useState<AdminUser[]>([]);
  const [courses, setCourses] = useState<CourseSummary[]>([]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCourseId, setBulkCourseId] = useState("");
  const [bulkTeacherId, setBulkTeacherId] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [page, setPage] = useState(0);

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

  function refresh() {
    if (!token) return;
    usersAdminApi.list(token, search || undefined).then((users) => {
      setStudents(users.filter((u) => hasRole(u, "student")));
      setTeachers(users.filter((u) => hasRole(u, "teacher") || hasRole(u, "manager")));
    });
    setPage(0);
  }

  useEffect(() => {
    if (!allowed) return;
    refresh();
    // Danh sách mọi khóa học đã xuất bản (mọi danh mục) — dùng cho ô chọn
    // khóa ghi danh hàng loạt, giống cách trang chi tiết 1 học sinh đang làm.
    catalogApi.categories().then(async (categories) => {
      const perCategory = await Promise.all(
        categories.map((cat) => catalogAdminApi.courses(token, cat.id).catch(() => [] as CourseSummary[])),
      );
      const seen = new Set<number>();
      const published = perCategory.flat().filter((c) => {
        if (c.status !== "PUBLISHED" || seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });
      setCourses(published);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalPages = Math.max(1, Math.ceil(students.length / PAGE_SIZE));
  const pageStudents = students.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === students.length ? new Set() : new Set(students.map((s) => s.id))));
  }

  async function bulkEnroll() {
    if (!bulkCourseId || selected.size === 0) return;
    setEnrolling(true);
    let ok = 0;
    let already = 0;
    let failed = 0;
    for (const studentId of selected) {
      try {
        await enrollmentApi.enrollStudentAsAdmin(token, studentId, Number(bulkCourseId));
        ok++;
      } catch (err) {
        // 409 = "Đã ghi danh khóa học này" — không phải lỗi thật, chỉ là đã
        // ghi danh từ trước, đếm riêng để báo rõ ràng thay vì gộp vào "lỗi".
        if (err instanceof ApiError && err.status === 409) already++;
        else failed++;
      }
    }
    setEnrolling(false);
    setSelected(new Set());
    setBulkCourseId("");
    const parts = [`${ok} thành công`];
    if (already > 0) parts.push(`${already} đã ghi danh từ trước`);
    if (failed > 0) parts.push(`${failed} lỗi`);
    if (failed > 0) toast.error(`Ghi danh hàng loạt: ${parts.join(", ")}`);
    else toast.success(`Ghi danh hàng loạt: ${parts.join(", ")}`);
  }

  async function bulkAssign() {
    if (!bulkTeacherId || selected.size === 0) return;
    setAssigning(true);
    try {
      await rosterApi.assign(token, bulkTeacherId, [...selected]);
      const count = selected.size;
      setSelected(new Set());
      setBulkTeacherId("");
      toast.success(`Đã gán ${count} học sinh cho giáo viên`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gán học sinh thất bại");
    } finally {
      setAssigning(false);
    }
  }

  if (!hydrated || !ready) {
    return <div className="grid min-h-screen place-items-center text-muted">Đang tải…</div>;
  }

  if (!allowed) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="text-lg font-semibold">Không có quyền truy cập</p>
          <p className="mt-1 text-sm text-muted">
            Trang này cần quyền <code>user:manage</code> hoặc <code>enrollment:manage</code>.
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
      <PageHeader title="Theo dõi học sinh" backHref="/dashboard" backLabel="Bảng điều khiển" />

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Học sinh ({students.length})</h1>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              refresh();
            }}
            className="flex gap-2"
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, username, email…"
              className="input w-64 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:text-text"
            >
              Tìm
            </button>
          </form>
        </div>

        {selected.size > 0 && (
          <div className="space-y-3 rounded-card border border-accent/30 bg-accent-soft/40 p-4">
            <p className="text-sm font-semibold">Đã chọn {selected.size} học sinh</p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="input flex-1 text-sm"
                value={bulkCourseId}
                onChange={(e) => setBulkCourseId(e.target.value)}
              >
                <option value="">-- Chọn khóa học để ghi danh hàng loạt --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={bulkEnroll}
                disabled={!bulkCourseId || enrolling}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {enrolling ? "Đang ghi danh…" : "Ghi danh hàng loạt"}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="input flex-1 text-sm"
                value={bulkTeacherId}
                onChange={(e) => setBulkTeacherId(e.target.value)}
              >
                <option value="">-- Chọn giáo viên để gán học sinh --</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} ({t.username})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={bulkAssign}
                disabled={!bulkTeacherId || assigning}
                className="rounded-lg border border-accent px-4 py-2 text-sm font-semibold text-accent disabled:opacity-60"
              >
                {assigning ? "Đang gán…" : "Gán cho giáo viên"}
              </button>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-soft text-muted">
              <tr>
                <th className="w-10 px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={students.length > 0 && selected.size === students.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-2.5 font-medium">Họ tên</th>
                <th className="px-4 py-2.5 font-medium">Tên đăng nhập</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    Không tìm thấy học sinh nào.
                  </td>
                </tr>
              ) : (
                pageStudents.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(s.id)}
                        onChange={() => toggleSelected(s.id)}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{s.fullName}</td>
                    <td className="px-4 py-3 text-muted">{s.username}</td>
                    <td className="px-4 py-3 text-muted">{s.email}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/students/${s.username}`} className="text-sm font-semibold text-accent">
                        Xem kết quả →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {students.length > PAGE_SIZE && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, students.length)} /{" "}
              {students.length} học sinh
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 font-semibold text-text disabled:opacity-40"
              >
                ← Trước
              </button>
              <span className="text-muted">
                Trang {page + 1}/{totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 font-semibold text-text disabled:opacity-40"
              >
                Sau →
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
