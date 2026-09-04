"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GradebookTable } from "@/components/GradebookTable";
import { PageHeader } from "@/components/PageHeader";
import { WrongTypesSummary } from "@/components/WrongTypesSummary";
import { ApiError, catalogAdminApi, enrollmentApi, gradebookApi, usersAdminApi } from "@/lib/api";
import type {
  AdminUser,
  Capability,
  CourseSummary,
  Enrollment,
  GradebookRow,
  TypeBreakdown,
  UserCourseGrant,
} from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { useConfirm } from "@/store/confirm";
import { useToast } from "@/store/toast";

/** 5 quyền chỉ có tác dụng khi gán tại SYSTEM context (mọi nơi trong backend
 * đều kiểm bằng requireSystemCapability, KHÔNG BAO GIỜ nhìn tới context của
 * 1 khóa học cụ thể) — ẩn khỏi màn tick chọn quyền THEO KHÓA HỌC vì tick vào
 * đây ở màn này sẽ không có tác dụng gì (dễ gây hiểu lầm là đã cấp được).
 * Vẫn còn nguyên trong danh sách 14 quyền chung, chỉ lọc riêng ở màn này. */
const SYSTEM_ONLY_CAPABILITIES = new Set([
  "system:manage",
  "user:manage",
  "role:assign",
  "user:bulkupload",
  "course:distribute",
]);

const ENROLLMENT_STATUS_META: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Đang học", cls: "bg-primary-soft text-primary" },
  COMPLETED: { label: "Hoàn thành", cls: "bg-green-soft text-green" },
  CANCELLED: { label: "Đã hủy", cls: "bg-soft text-muted" },
};

export default function AdminStudentDetailPage() {
  // Route dùng username (duy nhất, dễ đọc) thay vì UUID nội bộ — chỉ dùng để
  // tra ra đúng user trong danh sách; mọi lệnh gọi API bên dưới (ghi danh,
  // điểm số) vẫn cần UUID thật (`user.id`) nên phải đợi tra xong mới gọi.
  const params = useParams<{ username: string }>();
  const username = params.username;
  const router = useRouter();
  const { accessToken, hydrated, loadMe } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const token = accessToken ?? "";

  const [user, setUser] = useState<AdminUser | null>(null);
  const [userLookupDone, setUserLookupDone] = useState(false);
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null);
  const [gradebook, setGradebook] = useState<GradebookRow[] | null>(null);
  const [wrongTypes, setWrongTypes] = useState<TypeBreakdown[]>([]);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();
  const toast = useToast();

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
      .then((list) => setUser(list.find((u) => u.username === username) ?? null))
      .catch(() => {})
      .finally(() => setUserLookupDone(true));
  }, [allowed, token, username]);

  function reloadGradebook() {
    if (!user) return;
    gradebookApi
      .forStudentAsAdmin(token, user.id)
      .then(setGradebook)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Không tải được điểm số"));
    gradebookApi
      .wrongTypesAsAdmin(token, user.id)
      .then(setWrongTypes)
      .catch(() => setWrongTypes([]));
  }

  useEffect(() => {
    if (!user) return;
    enrollmentApi
      .forStudentAsAdmin(token, user.id)
      .then(setEnrollments)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Không tải được danh sách ghi danh"));
    reloadGradebook();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  async function handleUnenroll(enrollmentId: number, courseTitle: string) {
    if (!(await confirm(`Hủy ghi danh khỏi "${courseTitle}"? Tiến độ và điểm số của khóa này sẽ không còn hiển thị.`))) {
      return;
    }
    try {
      await enrollmentApi.unenrollAsAdmin(token, enrollmentId);
      setEnrollments((prev) => (prev ? prev.filter((e) => e.id !== enrollmentId) : prev));
      toast.success("Đã hủy ghi danh");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Hủy ghi danh thất bại");
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

        {userLookupDone && !user && (
          <p className="text-sm text-muted">Không tìm thấy tài khoản với tên đăng nhập &quot;{username}&quot;.</p>
        )}

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

        {user && <CourseGrantsSection token={token} userId={user.id} />}

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
                  <th className="px-4 py-2.5 text-right font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {enrollments === null ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted">
                      Đang tải…
                    </td>
                  </tr>
                ) : enrollments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted">
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
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleUnenroll(e.id, e.courseTitle)}
                            className="text-xs font-semibold text-red"
                          >
                            Hủy ghi danh
                          </button>
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
          {gradebook === null ? (
            <p className="text-muted">Đang tải…</p>
          ) : (
            <div className="space-y-6">
              <GradebookTable
                rows={gradebook}
                emptyLabel="Học sinh này chưa có điểm nào."
                token={token}
                studentName={user?.fullName}
                onGraded={reloadGradebook}
              />
              <WrongTypesSummary rows={wrongTypes} />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

/** Quyền lẻ theo khóa học (không qua role) — bổ sung cho role hệ thống (nếu
 * có): mỗi tài khoản có thể có quyền khác nhau, khác nhau theo từng khóa học
 * họ được gán, độc lập với role gán ở /admin/users (xem user_capability_
 * grants, V47). */
function CourseGrantsSection({ token, userId }: { token: string; userId: string }) {
  const [grants, setGrants] = useState<UserCourseGrant[] | null>(null);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  // "new" = đang thêm khóa mới, number = đang sửa đúng khóa đó, null = không mở editor nào.
  const [editingCourseId, setEditingCourseId] = useState<number | "new" | null>(null);
  const [draftCourseId, setDraftCourseId] = useState<number | "">("");
  const [draftCapabilities, setDraftCapabilities] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();

  useEffect(() => {
    usersAdminApi.courseGrants(token, userId).then(setGrants).catch(() => setGrants([]));
    usersAdminApi.capabilities(token).then(setCapabilities).catch(() => {});
    catalogAdminApi.courses(token).then(setCourses).catch(() => {});
  }, [token, userId]);

  const courseScopedCapabilities = capabilities.filter(
    (c) => !SYSTEM_ONLY_CAPABILITIES.has(c.name),
  );

  function openEditor(courseId: number | "new", existing?: string[]) {
    setEditingCourseId(courseId);
    setDraftCourseId(courseId === "new" ? "" : courseId);
    setDraftCapabilities(new Set(existing ?? []));
  }

  function toggleCapability(name: string) {
    setDraftCapabilities((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function save() {
    if (!draftCourseId) return;
    setSaving(true);
    try {
      const updated = await usersAdminApi.setCourseGrants(
        token, userId, Number(draftCourseId), [...draftCapabilities],
      );
      setGrants(updated);
      setEditingCourseId(null);
      toast.success("Đã lưu quyền theo khóa học");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lưu quyền thất bại");
    } finally {
      setSaving(false);
    }
  }

  async function clearAll(courseId: number, courseTitle: string) {
    if (!(await confirm(`Gỡ hết quyền lẻ của tài khoản này ở khóa "${courseTitle}"?`))) return;
    try {
      await usersAdminApi.clearCourseGrants(token, userId, courseId);
      setGrants((prev) => (prev ? prev.filter((g) => g.courseId !== courseId) : prev));
      if (editingCourseId === courseId) setEditingCourseId(null);
      toast.success("Đã gỡ quyền theo khóa học");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gỡ quyền thất bại");
    }
  }

  const grantedCourseIds = new Set((grants ?? []).map((g) => g.courseId));
  const pickableCourses = courses.filter((c) => !grantedCourseIds.has(c.id));

  return (
    <section>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Quyền theo khóa học</h2>
        {editingCourseId === null && (
          <button
            type="button"
            onClick={() => openEditor("new")}
            className="text-sm font-semibold text-accent"
          >
            + Gán quyền cho khóa học
          </button>
        )}
      </div>
      <p className="mb-3 text-xs text-muted">
        Quyền lẻ riêng cho tài khoản này, chỉ có hiệu lực ở đúng khóa học đã chọn — cộng thêm vào
        (không thay thế) role hệ thống nếu tài khoản này đang có.
      </p>

      {grants === null ? (
        <p className="text-muted">Đang tải…</p>
      ) : (
        <div className="space-y-2">
          {grants.length === 0 && editingCourseId !== "new" && (
            <p className="text-sm text-muted">Chưa gán quyền lẻ theo khóa học nào.</p>
          )}
          {grants.map((g) => (
            <div key={g.courseId} className="rounded-card border border-border bg-surface p-4">
              {editingCourseId === g.courseId ? (
                <GrantEditor
                  courses={courses}
                  capabilities={courseScopedCapabilities}
                  courseId={draftCourseId}
                  onCourseIdChange={setDraftCourseId}
                  selected={draftCapabilities}
                  onToggle={toggleCapability}
                  onSave={save}
                  onCancel={() => setEditingCourseId(null)}
                  saving={saving}
                  lockCourse
                />
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{g.courseTitle}</p>
                    <p className="mt-1 text-xs text-muted">
                      {g.capabilities
                        .map((name) => capabilities.find((c) => c.name === name)?.description ?? name)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-3">
                    <button
                      type="button"
                      onClick={() => openEditor(g.courseId, g.capabilities)}
                      className="text-xs font-semibold text-accent"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => clearAll(g.courseId, g.courseTitle)}
                      className="text-xs font-semibold text-red"
                    >
                      Gỡ hết
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editingCourseId === "new" && (
        <div className="mt-3 rounded-card border border-border bg-surface p-4">
          <GrantEditor
            courses={pickableCourses}
            capabilities={courseScopedCapabilities}
            courseId={draftCourseId}
            onCourseIdChange={setDraftCourseId}
            selected={draftCapabilities}
            onToggle={toggleCapability}
            onSave={save}
            onCancel={() => setEditingCourseId(null)}
            saving={saving}
          />
        </div>
      )}
    </section>
  );
}

function GrantEditor({
  courses, capabilities, courseId, onCourseIdChange, selected, onToggle,
  onSave, onCancel, saving, lockCourse,
}: {
  courses: CourseSummary[];
  capabilities: Capability[];
  courseId: number | "";
  onCourseIdChange: (id: number | "") => void;
  selected: Set<string>;
  onToggle: (name: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  /** Đang sửa 1 khóa đã gán sẵn — khóa cứng dropdown, chỉ đổi được tick quyền
   * (đổi khóa học thì nên gỡ hết rồi gán mới, tránh nhầm "sửa" thành "chuyển
   * nhầm sang khóa khác"). */
  lockCourse?: boolean;
}) {
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Khóa học</span>
        <select
          value={courseId}
          onChange={(e) => onCourseIdChange(e.target.value ? Number(e.target.value) : "")}
          disabled={lockCourse}
          className="input"
        >
          <option value="">— Chọn khóa học —</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </label>
      <div>
        <span className="mb-1 block text-xs font-medium text-muted">Quyền</span>
        <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
          {capabilities.map((cap) => (
            <label key={cap.name} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.has(cap.name)}
                onChange={() => onToggle(cap.name)}
                className="mt-0.5"
              />
              <span>
                {cap.description ?? cap.name}
                <span className="block font-mono text-[11px] text-faint">{cap.name}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !courseId}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Đang lưu…" : "Lưu"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm font-semibold text-muted">
          Hủy
        </button>
      </div>
    </div>
  );
}
