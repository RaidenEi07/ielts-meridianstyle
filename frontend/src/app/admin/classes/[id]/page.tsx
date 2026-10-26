"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ApiError, catalogAdminApi, classApi, usersAdminApi } from "@/lib/api";
import type { AdminUser, ClassDetail, CourseSummary } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { useConfirm } from "@/store/confirm";
import { useToast } from "@/store/toast";

export default function AdminClassDetailPage() {
  const params = useParams<{ id: string }>();
  const classId = Number(params.id);
  const router = useRouter();
  const { accessToken, hydrated, loadMe } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const token = accessToken ?? "";
  const toast = useToast();
  const confirm = useConfirm();

  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");

  // sửa tên / mô tả
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // thêm thành viên
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerResults, setPickerResults] = useState<AdminUser[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  // gắn khóa học
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [courseId, setCourseId] = useState("");
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    loadMe()
      .then(() => setAllowed(useAuthStore.getState().systemCapabilities.includes("enrollment:manage")))
      .catch(() => {})
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, accessToken]);

  function refresh() {
    classApi
      .detail(token, classId)
      .then((d) => {
        setDetail(d);
        setName(d.name);
        setDescription(d.description ?? "");
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Không tải được lớp"));
  }

  useEffect(() => {
    if (!allowed) return;
    refresh();
    catalogAdminApi
      .courses(token)
      .then((list) => setCourses(list.filter((c) => c.status === "PUBLISHED")))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, classId]);

  // Tìm tài khoản để thêm vào lớp (gõ chậm 300ms để không gọi API mỗi phím).
  useEffect(() => {
    if (!pickerOpen) return;
    const q = pickerQuery.trim();
    if (q.length < 2) return;
    const t = setTimeout(() => {
      usersAdminApi
        .list(token, q)
        .then(setPickerResults)
        .catch(() => setPickerResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [pickerOpen, pickerQuery, token]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    try {
      await classApi.update(token, classId, { name: name.trim(), description: description.trim() || undefined });
      setEditing(false);
      toast.success("Đã lưu thông tin lớp");
      refresh();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Lưu thất bại";
      setError(msg);
      toast.error(msg);
    }
  }

  async function removeClass() {
    if (!detail) return;
    if (
      !(await confirm(
        `Xóa lớp "${detail.name}"? Thành viên không bị xóa tài khoản và vẫn giữ ghi danh các khóa học đã có.`,
      ))
    ) {
      return;
    }
    try {
      await classApi.remove(token, classId);
      toast.success("Đã xóa lớp");
      router.push("/admin/classes");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Xóa lớp thất bại");
    }
  }

  async function addPicked() {
    if (picked.size === 0) return;
    setAdding(true);
    setError(null);
    try {
      const r = await classApi.addMembers(token, classId, [...picked]);
      const parts = [`Đã thêm ${r.added} tài khoản vào lớp`];
      if (r.alreadyInClass > 0) parts.push(`${r.alreadyInClass} đã có trong lớp`);
      if (r.newlyEnrolled > 0) parts.push(`${r.newlyEnrolled} lượt ghi danh khóa học mới`);
      toast.success(parts.join(", "));
      setPicked(new Set());
      setPickerQuery("");
      setPickerResults([]);
      refresh();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Thêm thành viên thất bại";
      setError(msg);
      toast.error(msg);
    } finally {
      setAdding(false);
    }
  }

  async function removeMember(userId: string, fullName: string) {
    if (!(await confirm(`Gỡ ${fullName} khỏi lớp? Ghi danh các khóa học của họ vẫn được giữ.`))) return;
    try {
      await classApi.removeMember(token, classId, userId);
      toast.success("Đã gỡ khỏi lớp");
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gỡ thất bại");
    }
  }

  async function linkCourse() {
    if (!courseId) return;
    setLinking(true);
    setError(null);
    try {
      const r = await classApi.linkCourse(token, classId, Number(courseId));
      toast.success(
        r.memberCount === 0
          ? "Đã gắn khóa học. Lớp chưa có thành viên nên chưa ghi danh ai."
          : `Đã ghi danh ${r.newlyEnrolled} học viên mới vào khóa (${r.alreadyEnrolled} người đã có sẵn)`,
      );
      setCourseId("");
      refresh();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Gắn khóa học thất bại";
      setError(msg);
      toast.error(msg);
    } finally {
      setLinking(false);
    }
  }

  async function unlinkCourse(id: number, title: string) {
    if (
      !(await confirm(
        `Gỡ khóa "${title}" khỏi lớp? Những người đã ghi danh khóa vẫn được giữ; thành viên vào lớp sau này sẽ không tự được ghi danh khóa này nữa.`,
      ))
    ) {
      return;
    }
    try {
      await classApi.unlinkCourse(token, classId, id);
      toast.success("Đã gỡ khóa học khỏi lớp");
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gỡ thất bại");
    }
  }

  function togglePicked(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
            Trang này cần quyền <code>enrollment:manage</code>.
          </p>
          <Link href="/dashboard" className="mt-4 inline-block text-accent">
            ← Về bảng điều khiển
          </Link>
        </div>
      </div>
    );
  }

  const memberIds = new Set((detail?.members ?? []).map((m) => m.userId));
  const linkedCourseIds = new Set((detail?.courses ?? []).map((c) => c.courseId));
  const shownMembers = (detail?.members ?? []).filter((m) =>
    `${m.fullName} ${m.username} ${m.email}`.toLowerCase().includes(memberSearch.trim().toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-bg">
      <PageHeader title="Lớp học" backHref="/admin/classes" backLabel="Danh sách lớp" />

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        {error && <p className="text-sm text-red">{error}</p>}
        {!detail && !error ? (
          <p className="text-sm text-muted">Đang tải…</p>
        ) : detail ? (
          <>
            <section className="rounded-card border border-border bg-surface p-6">
              {editing ? (
                <form onSubmit={save} className="space-y-3">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={150}
                    className="input w-full text-sm"
                    aria-label="Tên lớp"
                    required
                  />
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={500}
                    placeholder="Mô tả (không bắt buộc)"
                    className="input w-full text-sm"
                    aria-label="Mô tả lớp"
                  />
                  <div className="flex gap-3">
                    <button type="submit" className="rounded-lg bg-primary-fill px-4 py-2 text-sm font-semibold text-white">
                      Lưu
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(false);
                        setName(detail.name);
                        setDescription(detail.description ?? "");
                      }}
                      className="text-sm font-medium text-muted hover:text-text"
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-bold">{detail.name}</h1>
                    {detail.description && <p className="mt-1 text-sm text-muted">{detail.description}</p>}
                    <p className="mt-2 text-sm text-muted">
                      {detail.members.length} thành viên · {detail.courses.length} khóa học đã gắn
                    </p>
                  </div>
                  <div className="flex gap-4 text-sm font-semibold">
                    <button type="button" onClick={() => setEditing(true)} className="text-primary">
                      Sửa
                    </button>
                    <button type="button" onClick={removeClass} className="text-red">
                      Xóa lớp
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-card border border-border bg-surface p-6" data-testid="class-courses">
              <h2 className="mb-1 text-lg font-semibold">Khóa học của lớp</h2>
              <p className="mb-4 text-sm text-muted">
                Gắn khóa học: mọi thành viên hiện tại được ghi danh khóa đó, và thành viên thêm vào sau cũng tự được ghi danh.
              </p>
              {detail.courses.length === 0 ? (
                <p className="mb-4 text-sm text-muted">Lớp chưa được gắn vào khóa học nào.</p>
              ) : (
                <ul className="mb-4 space-y-2">
                  {detail.courses.map((c) => (
                    <li
                      key={c.courseId}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-2.5 text-sm"
                    >
                      <Link href={`/admin/courses/${c.courseId}`} className="font-semibold text-accent hover:underline">
                        {c.title}
                      </Link>
                      <button
                        type="button"
                        onClick={() => unlinkCourse(c.courseId, c.title)}
                        className="text-xs font-semibold text-red"
                      >
                        Gỡ khỏi lớp
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="input w-72 text-sm"
                  aria-label="Chọn khóa học để gắn"
                >
                  <option value="">— Chọn khóa học đã xuất bản —</option>
                  {courses
                    .filter((c) => !linkedCourseIds.has(c.id))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={linkCourse}
                  disabled={!courseId || linking}
                  className="rounded-lg bg-primary-fill px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {linking ? "Đang gắn…" : "Gắn vào khóa"}
                </button>
              </div>
            </section>

            <section className="rounded-card border border-border bg-surface p-6" data-testid="class-members">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Thành viên ({detail.members.length})</h2>
                <button
                  type="button"
                  onClick={() => setPickerOpen((v) => !v)}
                  className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-accent hover:bg-soft"
                >
                  {pickerOpen ? "Đóng" : "+ Thêm thành viên"}
                </button>
              </div>

              {pickerOpen && (
                <div className="mb-5 rounded-lg bg-soft p-4" data-testid="class-member-picker">
                  <input
                    value={pickerQuery}
                    onChange={(e) => setPickerQuery(e.target.value)}
                    placeholder="Gõ ít nhất 2 ký tự: tên, tên đăng nhập hoặc email…"
                    className="input w-full text-sm"
                    aria-label="Tìm tài khoản để thêm"
                    autoFocus
                  />
                  {pickerQuery.trim().length >= 2 && (
                    <div className="mt-3 max-h-56 overflow-auto rounded-lg border border-border bg-surface">
                      {pickerResults.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-muted">Không tìm thấy tài khoản nào.</p>
                      ) : (
                        pickerResults.map((u) => {
                          const already = memberIds.has(u.id);
                          return (
                            <label
                              key={u.id}
                              className={`flex items-center gap-3 border-b border-border px-4 py-2 text-sm last:border-0 ${
                                already ? "opacity-50" : "cursor-pointer hover:bg-soft"
                              }`}
                            >
                              <input
                                type="checkbox"
                                disabled={already}
                                checked={picked.has(u.id)}
                                onChange={() => togglePicked(u.id)}
                              />
                              <span className="font-medium">{u.fullName}</span>
                              <span className="text-muted">@{u.username}</span>
                              <span className="ml-auto text-xs text-muted">{already ? "Đã trong lớp" : u.email}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={addPicked}
                      disabled={picked.size === 0 || adding}
                      className="rounded-lg bg-primary-fill px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {adding ? "Đang thêm…" : `Thêm ${picked.size} tài khoản đã chọn`}
                    </button>
                    <span className="text-xs text-muted">
                      Muốn thêm nhiều người cùng lúc: dùng ô chọn ở trang{" "}
                      <Link href="/admin/users" className="font-semibold text-accent hover:underline">
                        Quản lý tài khoản
                      </Link>{" "}
                      hoặc nhập từ file Excel.
                    </span>
                  </div>
                </div>
              )}

              <input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Tìm trong lớp…"
                className="input mb-3 w-full max-w-sm text-sm"
                aria-label="Tìm thành viên trong lớp"
              />
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-soft text-muted">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Họ tên</th>
                      <th className="px-4 py-2.5 font-medium">Tên đăng nhập</th>
                      <th className="px-4 py-2.5 font-medium">Email</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {shownMembers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-muted">
                          {detail.members.length === 0 ? "Lớp chưa có thành viên." : "Không tìm thấy thành viên phù hợp."}
                        </td>
                      </tr>
                    ) : (
                      shownMembers.map((m) => (
                        <tr key={m.userId} className="border-t border-border">
                          <td className="px-4 py-2.5">
                            <Link href={`/admin/users/${m.username}`} className="font-semibold text-accent hover:underline">
                              {m.fullName}
                            </Link>
                            {m.status === "SUSPENDED" && (
                              <span className="ml-2 rounded-full bg-red-soft px-2 py-0.5 text-xs font-semibold text-red">Bị khóa</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-muted">@{m.username}</td>
                          <td className="px-4 py-2.5 text-muted">{m.email}</td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => removeMember(m.userId, m.fullName)}
                              className="text-xs font-semibold text-red"
                            >
                              Gỡ khỏi lớp
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
