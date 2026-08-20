"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ApiError, rosterApi, usersAdminApi } from "@/lib/api";
import type { AdminUser, RoleOption, StudentSummary } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { useConfirm } from "@/store/confirm";
import { useToast } from "@/store/toast";

type RoleTab = "all" | "student" | "teacher";

// Cùng ngưỡng/kiểu phân trang với /teacher/questions (đã có sẵn) — danh sách
// dồn hết không phân trang từng gây "Sửa" bấm không phản hồi ở đó khi đủ lớn;
// áp dụng lại đây trước khi /admin/users (150 dòng) gặp đúng vấn đề.
const PAGE_SIZE = 50;

function hasRole(u: AdminUser, shortname: string) {
  return u.roleAssignments.some((ra) => ra.roleShortname === shortname);
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Hoạt động", cls: "bg-green-soft text-green" },
  SUSPENDED: { label: "Bị khóa", cls: "bg-red-soft text-red" },
  PENDING: { label: "Chờ duyệt", cls: "bg-soft text-muted" },
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { accessToken, hydrated, loadMe } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const token = accessToken ?? "";

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<RoleTab>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignTeacherId, setAssignTeacherId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [rosters, setRosters] = useState<Record<string, StudentSummary[]>>({});
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

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

  function refresh() {
    if (!token) return;
    usersAdminApi.list(token, search || undefined).then(setUsers).catch(() => {});
    setPage(0);
  }

  useEffect(() => {
    if (!allowed) return;
    refresh();
    usersAdminApi.roles(token).then(setRoles).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  const students = users.filter((u) => hasRole(u, "student"));
  const teachers = users.filter((u) => hasRole(u, "teacher"));
  const visibleUsers = tab === "student" ? students : tab === "teacher" ? teachers : users;
  const totalPages = Math.max(1, Math.ceil(visibleUsers.length / PAGE_SIZE));
  const pageUsers = visibleUsers.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    setSelected(new Set());
    setPage(0);
  }, [tab]);

  useEffect(() => {
    if (tab !== "teacher" || !token) return;
    teachers.forEach((t) => {
      if (rosters[t.id]) return;
      rosterApi
        .forTeacher(token, t.id)
        .then((list) => setRosters((prev) => ({ ...prev, [t.id]: list })))
        .catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, users, token]);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === students.length ? new Set() : new Set(students.map((s) => s.id)),
    );
  }

  async function assignSelected() {
    if (!assignTeacherId || selected.size === 0) return;
    setError(null);
    setAssigning(true);
    try {
      await rosterApi.assign(token, assignTeacherId, [...selected]);
      const count = selected.size;
      setSelected(new Set());
      setRosters((prev) => {
        const next = { ...prev };
        delete next[assignTeacherId];
        return next;
      });
      setAssignTeacherId("");
      toast.success(`Đã gán ${count} học sinh cho giáo viên`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Gán học sinh thất bại";
      setError(msg);
      toast.error(msg);
    } finally {
      setAssigning(false);
    }
  }

  async function unassignStudent(teacherId: string, studentId: string) {
    if (!(await confirm("Gỡ học sinh này khỏi giáo viên?"))) return;
    setError(null);
    try {
      await rosterApi.unassign(token, teacherId, studentId);
      setRosters((prev) => ({
        ...prev,
        [teacherId]: (prev[teacherId] ?? []).filter((s) => s.id !== studentId),
      }));
      toast.success("Đã gỡ học sinh khỏi giáo viên");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Gỡ học sinh thất bại";
      setError(msg);
      toast.error(msg);
    }
  }

  async function revokeRole(assignmentId: number) {
    if (!(await confirm("Thu hồi vai trò này?"))) return;
    setError(null);
    try {
      await usersAdminApi.revokeRole(token, assignmentId);
      refresh();
      toast.success("Đã thu hồi vai trò");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Thu hồi vai trò thất bại";
      setError(msg);
      toast.error(msg);
    }
  }

  async function assignRole(userId: string, roleShortname: string) {
    if (!roleShortname) return;
    setError(null);
    try {
      await usersAdminApi.assignRole(token, { userId, roleShortname });
      refresh();
      toast.success("Đã gán vai trò");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Gán vai trò thất bại";
      setError(msg);
      toast.error(msg);
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
      <PageHeader title="Quản lý tài khoản" backHref="/dashboard" backLabel="Bảng điều khiển" />

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Tài khoản ({users.length})</h1>
          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            {creating ? "Đóng" : "+ Tạo tài khoản mới"}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
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
          <div className="flex gap-1 rounded-lg bg-soft p-1">
            {(
              [
                ["all", "Tất cả"],
                ["student", "Học viên"],
                ["teacher", "Giáo viên"],
              ] as [RoleTab, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === value ? "bg-surface shadow-sm" : "text-muted hover:text-text"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red">{error}</p>}

        {creating && (
          <CreateUserForm
            token={token}
            roles={roles}
            onCreated={() => {
              setCreating(false);
              refresh();
            }}
          />
        )}

        {tab === "student" && selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-primary-soft p-3 text-sm">
            <span className="font-medium text-primary">{selected.size} học sinh đã chọn</span>
            <select
              value={assignTeacherId}
              onChange={(e) => setAssignTeacherId(e.target.value)}
              className="input w-56 py-1.5 text-sm"
            >
              <option value="">— Chọn giáo viên —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={assignSelected}
              disabled={!assignTeacherId || assigning}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {assigning ? "Đang gán…" : "Gán cho giáo viên"}
            </button>
          </div>
        )}

        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-soft text-muted">
              <tr>
                {tab === "student" && (
                  <th className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={students.length > 0 && selected.size === students.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                )}
                <th className="px-4 py-2.5 font-medium">Tên đăng nhập</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Họ tên</th>
                <th className="px-4 py-2.5 font-medium">Trạng thái</th>
                <th className="px-4 py-2.5 font-medium">Vai trò</th>
                <th className="px-4 py-2.5 font-medium">Gán thêm</th>
                {tab === "teacher" && (
                  <th className="px-4 py-2.5 font-medium">Học sinh phụ trách</th>
                )}
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {pageUsers.map((u) => {
                const st = STATUS_META[u.status] ?? STATUS_META.ACTIVE;
                const heldRoles = new Set(u.roleAssignments.map((ra) => ra.roleShortname));
                const assignableRoles = roles.filter((r) => !heldRoles.has(r.shortname));
                return (
                  <Fragment key={u.id}>
                  <tr className="border-t border-border align-top">
                    {tab === "student" && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(u.id)}
                          onChange={() => toggleSelected(u.id)}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 font-medium">{u.username}</td>
                    <td className="px-4 py-3 text-muted">{u.email}</td>
                    <td className="px-4 py-3">{u.fullName}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roleAssignments.length === 0 && (
                          <span className="whitespace-nowrap text-xs text-muted">Chưa có vai trò</span>
                        )}
                        {u.roleAssignments.map((ra) => (
                          <span
                            key={ra.id}
                            className="flex items-center gap-1 whitespace-nowrap rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary"
                          >
                            {ra.roleName}
                            <button
                              type="button"
                              onClick={() => revokeRole(ra.id)}
                              title="Thu hồi vai trò"
                              className="text-primary/70 hover:text-red"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {assignableRoles.length > 0 ? (
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) assignRole(u.id, e.target.value);
                            e.target.value = "";
                          }}
                          className="input min-w-[150px] text-xs"
                        >
                          <option value="">+ Gán vai trò…</option>
                          {assignableRoles.map((r) => (
                            <option key={r.id} value={r.shortname}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="whitespace-nowrap text-xs text-muted">Đủ vai trò</span>
                      )}
                    </td>
                    {tab === "teacher" && (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(rosters[u.id] ?? []).length === 0 && (
                            <span className="whitespace-nowrap text-xs text-muted">Chưa có học sinh</span>
                          )}
                          {(rosters[u.id] ?? []).map((s) => (
                            <span
                              key={s.id}
                              className="flex items-center gap-1 whitespace-nowrap rounded-full bg-green-soft px-2.5 py-1 text-xs font-semibold text-green"
                            >
                              {s.fullName}
                              <button
                                type="button"
                                onClick={() => unassignStudent(u.id, s.id)}
                                title="Gỡ khỏi giáo viên này"
                                className="text-green/70 hover:text-red"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </td>
                    )}
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setEditingUserId((v) => (v === u.id ? null : u.id))}
                          className="whitespace-nowrap text-xs font-semibold text-primary"
                        >
                          Sửa
                        </button>
                        <Link
                          href={`/admin/users/${u.username}`}
                          className="whitespace-nowrap text-xs font-semibold text-accent"
                        >
                          Xem chi tiết →
                        </Link>
                      </div>
                    </td>
                  </tr>
                  {editingUserId === u.id && (
                    <tr className="border-t border-border">
                      <td
                        colSpan={(tab === "student" ? 1 : 0) + 6 + (tab === "teacher" ? 1 : 0) + 1}
                        className="bg-bg px-4 py-4"
                      >
                        <EditUserForm
                          token={token}
                          user={u}
                          onCancel={() => setEditingUserId(null)}
                          onSaved={() => {
                            setEditingUserId(null);
                            refresh();
                          }}
                        />
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {visibleUsers.length > PAGE_SIZE && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, visibleUsers.length)} /{" "}
              {visibleUsers.length} tài khoản
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

function EditUserForm({
  token,
  user,
  onSaved,
  onCancel,
}: {
  token: string;
  user: AdminUser;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [status, setStatus] = useState(user.status);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await usersAdminApi.update(token, user.id, {
        fullName,
        email,
        status,
        newPassword: newPassword || undefined,
      });
      onSaved();
      toast.success("Đã cập nhật tài khoản");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Cập nhật tài khoản thất bại";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Họ tên</span>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" required />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          required
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Mật khẩu mới (để trống nếu không đổi)</span>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="input"
          minLength={8}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Trạng thái</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as AdminUser["status"])}
          className="input"
        >
          <option value="ACTIVE">Hoạt động</option>
          <option value="SUSPENDED">Bị khóa</option>
          <option value="PENDING">Chờ duyệt</option>
        </select>
      </label>
      {error && <p className="text-sm text-red sm:col-span-2">{error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Đang lưu…" : "Lưu thay đổi"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-4 py-2 text-sm text-muted"
        >
          Hủy
        </button>
      </div>
    </form>
  );
}

function CreateUserForm({
  token,
  roles,
  onCreated,
}: {
  token: string;
  roles: RoleOption[];
  onCreated: () => void;
}) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [roleShortname, setRoleShortname] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await usersAdminApi.createUser(token, {
        username,
        email,
        password,
        fullName,
        roleShortname: roleShortname || undefined,
      });
      onCreated();
      toast.success("Đã tạo tài khoản");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Tạo tài khoản thất bại";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={save}
      className="grid gap-3 rounded-card border border-border bg-surface p-6 sm:grid-cols-2"
    >
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Tên đăng nhập</span>
        <input value={username} onChange={(e) => setUsername(e.target.value)} className="input" required />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          required
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Mật khẩu (tối thiểu 8 ký tự)</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
          required
          minLength={8}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Họ tên</span>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" required />
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1 block text-xs font-medium text-muted">Vai trò ban đầu (tùy chọn)</span>
        <select
          value={roleShortname}
          onChange={(e) => setRoleShortname(e.target.value)}
          className="input"
        >
          <option value="">— Không gán —</option>
          {roles.map((r) => (
            <option key={r.id} value={r.shortname}>
              {r.name}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="text-sm text-red sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Đang tạo…" : "Tạo tài khoản"}
        </button>
      </div>
    </form>
  );
}
