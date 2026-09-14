"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ApiError, catalogAdminApi, childSiteAdminApi, remoteAccountApi, usersAdminApi } from "@/lib/api";
import type { Capability, ChildSite, CourseSummary, RoleOption, SyncAccount, SyncCourseGrant } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { useToast } from "@/store/toast";

/** 5 quyền chỉ có tác dụng khi gán tại SYSTEM context — khớp
 * SYSTEM_ONLY_CAPABILITIES ở admin/users/[username]/page.tsx (không export
 * dùng chung được vì khác thư mục route — xem comment ở đó để giữ đồng bộ
 * nếu backend thêm capability system-only mới). */
const SYSTEM_ONLY_CAPABILITIES = new Set([
  "system:manage",
  "user:manage",
  "role:assign",
  "user:bulkupload",
  "course:distribute",
  "childsite:manage-accounts",
]);

const STATUS_META: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Hoạt động", cls: "bg-green-soft text-green" },
  PENDING: { label: "Chờ duyệt", cls: "bg-accent-soft text-accent" },
  SUSPENDED: { label: "Đã khóa", cls: "bg-red-soft text-red" },
};

export default function ChildSiteAccountsPage() {
  const params = useParams<{ id: string }>();
  const siteId = Number(params.id);
  const router = useRouter();
  const { accessToken, hydrated, loadMe } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const token = accessToken ?? "";

  const [site, setSite] = useState<ChildSite | null>(null);
  const [accounts, setAccounts] = useState<SyncAccount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [courses, setCourses] = useState<CourseSummary[]>([]);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    loadMe()
      .then(() => setAllowed(useAuthStore.getState().systemCapabilities.includes("childsite:manage-accounts")))
      .catch(() => {})
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, accessToken]);

  function refresh(q?: string) {
    if (!token) return;
    remoteAccountApi
      .list(token, siteId, q)
      .then(setAccounts)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Không tải được danh sách tài khoản"));
  }

  useEffect(() => {
    if (!allowed) return;
    childSiteAdminApi.list(token).then((sites) => setSite(sites.find((s) => s.id === siteId) ?? null));
    usersAdminApi.roles(token).then(setRoles).catch(() => {});
    usersAdminApi.capabilities(token).then(setCapabilities).catch(() => {});
    catalogAdminApi.courses(token).then(setCourses).catch(() => {});
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, siteId]);

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    refresh(search);
  }

  const courseScopedCapabilities = capabilities.filter((c) => !SYSTEM_ONLY_CAPABILITIES.has(c.name));

  if (!hydrated || !ready) {
    return <div className="grid min-h-screen place-items-center text-muted">Đang tải…</div>;
  }
  if (!allowed) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="text-lg font-semibold">Không có quyền truy cập</p>
          <p className="mt-1 text-sm text-muted">
            Trang này cần quyền <code>childsite:manage-accounts</code>.
          </p>
          <Link href="/admin/child-sites" className="mt-4 inline-block text-accent">
            ← Danh sách web con
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <PageHeader
        title="Tài khoản web con"
        backHref="/admin/child-sites"
        backLabel="Danh sách web con"
        maxWidthClass="max-w-5xl"
      />

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <div>
          <h1 className="text-xl font-bold">{site ? `Tài khoản trên "${site.name}"` : "Tài khoản trên web con"}</h1>
          <p className="mt-1 text-sm text-muted">
            Tài khoản vẫn do web con tự tạo — ở đây chỉ xem và chỉnh role/quyền theo khóa học của
            tài khoản đã có sẵn, không tạo hay xóa tài khoản.
          </p>
        </div>

        <form onSubmit={onSearchSubmit} className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên/username/email…"
            className="input w-full pl-9 text-sm"
          />
        </form>

        {error && <p className="text-sm text-red">{error}</p>}

        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-soft text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Tài khoản</th>
                <th className="px-4 py-2.5 font-medium">Trạng thái</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {accounts === null ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted">
                    Đang tải…
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted">
                    Không tìm thấy tài khoản nào.
                  </td>
                </tr>
              ) : (
                accounts.map((a) => {
                  const st = STATUS_META[a.status] ?? { label: a.status, cls: "bg-soft text-muted" };
                  const isOpen = expandedUserId === a.userId;
                  return (
                    <Fragment key={a.userId}>
                      <tr className="border-t border-border align-top">
                        <td className="px-4 py-3">
                          <p className="font-medium">{a.fullName}</p>
                          <p className="text-xs text-muted">
                            @{a.username} · {a.email}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {a.roleShortnames.length === 0 ? (
                              <span className="text-xs text-faint">— chưa có role</span>
                            ) : (
                              a.roleShortnames.map((r) => (
                                <span key={r} className="rounded-full bg-soft px-2 py-0.5 text-xs text-muted">
                                  {r}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setExpandedUserId(isOpen ? null : a.userId)}
                            className="text-xs font-semibold text-accent"
                          >
                            {isOpen ? "Đóng" : "Quản lý"}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-t border-border bg-soft/40">
                          <td colSpan={4} className="px-4 py-4">
                            <AccountDetailPanel
                              token={token}
                              siteId={siteId}
                              account={a}
                              roles={roles}
                              courses={courses}
                              capabilities={courseScopedCapabilities}
                              onRoleChanged={() => refresh(search)}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function AccountDetailPanel({
  token,
  siteId,
  account,
  roles,
  courses,
  capabilities,
  onRoleChanged,
}: {
  token: string;
  siteId: number;
  account: SyncAccount;
  roles: RoleOption[];
  courses: CourseSummary[];
  capabilities: Capability[];
  onRoleChanged: () => void;
}) {
  const toast = useToast();
  const [pendingRole, setPendingRole] = useState<string | null>(null);
  const [grants, setGrants] = useState<SyncCourseGrant[] | null>(null);
  const [editingCourse, setEditingCourse] = useState<string | "new" | null>(null);
  const [draftCourseShortname, setDraftCourseShortname] = useState("");
  const [draftCapabilities, setDraftCapabilities] = useState<Set<string>>(new Set());
  const [savingGrant, setSavingGrant] = useState(false);

  function loadGrants() {
    remoteAccountApi
      .courseGrants(token, siteId, account.userId)
      .then(setGrants)
      .catch(() => setGrants([]));
  }

  useEffect(loadGrants, [token, siteId, account.userId]);

  async function toggleRole(roleShortname: string, hasIt: boolean) {
    setPendingRole(roleShortname);
    try {
      if (hasIt) {
        await remoteAccountApi.revokeRole(token, siteId, account.userId, roleShortname);
        toast.success(`Đã gỡ role "${roleShortname}"`);
      } else {
        await remoteAccountApi.assignRole(token, siteId, account.userId, roleShortname);
        toast.success(`Đã gán role "${roleShortname}"`);
      }
      onRoleChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Cập nhật role thất bại");
    } finally {
      setPendingRole(null);
    }
  }

  function openEditor(courseShortname: string | "new", existing?: string[]) {
    setEditingCourse(courseShortname);
    setDraftCourseShortname(courseShortname === "new" ? "" : courseShortname);
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

  async function saveGrant() {
    if (!draftCourseShortname) return;
    setSavingGrant(true);
    try {
      await remoteAccountApi.setCourseGrants(
        token, siteId, account.userId, draftCourseShortname, [...draftCapabilities],
      );
      loadGrants();
      setEditingCourse(null);
      toast.success("Đã lưu quyền theo khóa học");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lưu quyền thất bại");
    } finally {
      setSavingGrant(false);
    }
  }

  async function clearGrant(courseShortname: string) {
    setSavingGrant(true);
    try {
      await remoteAccountApi.setCourseGrants(token, siteId, account.userId, courseShortname, []);
      loadGrants();
      if (editingCourse === courseShortname) setEditingCourse(null);
      toast.success("Đã gỡ quyền theo khóa học");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gỡ quyền thất bại");
    } finally {
      setSavingGrant(false);
    }
  }

  const grantedShortnames = new Set((grants ?? []).map((g) => g.courseShortname));
  const pickableCourses = courses.filter((c) => !grantedShortnames.has(c.shortname));

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <h3 className="mb-2 text-sm font-semibold">Role hệ thống</h3>
        <div className="space-y-1.5">
          {roles.map((r) => {
            const hasIt = account.roleShortnames.includes(r.shortname);
            return (
              <label
                key={r.shortname}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={hasIt}
                  disabled={pendingRole === r.shortname}
                  onChange={() => toggleRole(r.shortname, hasIt)}
                />
                <span className="font-medium">{r.name}</span>
                <span className="text-xs text-faint">({r.shortname})</span>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Quyền theo khóa học</h3>
          {editingCourse === null && (
            <button type="button" onClick={() => openEditor("new")} className="text-xs font-semibold text-accent">
              + Gán quyền
            </button>
          )}
        </div>

        <div className="space-y-2">
          {grants === null ? (
            <p className="text-xs text-muted">Đang tải…</p>
          ) : grants.length === 0 && editingCourse !== "new" ? (
            <p className="text-xs text-muted">Chưa có quyền lẻ theo khóa nào.</p>
          ) : (
            grants.map((g) =>
              editingCourse === g.courseShortname ? (
                <GrantEditorSync
                  key={g.courseShortname}
                  courses={courses}
                  capabilities={capabilities}
                  courseShortname={draftCourseShortname}
                  onCourseShortnameChange={setDraftCourseShortname}
                  selected={draftCapabilities}
                  onToggle={toggleCapability}
                  onSave={saveGrant}
                  onCancel={() => setEditingCourse(null)}
                  saving={savingGrant}
                  lockCourse
                />
              ) : (
                <div key={g.courseShortname} className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{g.courseTitle}</p>
                      <p className="mt-0.5 text-xs text-muted">{g.capabilities.join(" · ")}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => openEditor(g.courseShortname, g.capabilities)}
                        className="text-xs font-semibold text-accent"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => clearGrant(g.courseShortname)}
                        className="text-xs font-semibold text-red"
                      >
                        Gỡ
                      </button>
                    </div>
                  </div>
                </div>
              ),
            )
          )}
          {editingCourse === "new" && (
            <GrantEditorSync
              courses={pickableCourses}
              capabilities={capabilities}
              courseShortname={draftCourseShortname}
              onCourseShortnameChange={setDraftCourseShortname}
              selected={draftCapabilities}
              onToggle={toggleCapability}
              onSave={saveGrant}
              onCancel={() => setEditingCourse(null)}
              saving={savingGrant}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function GrantEditorSync({
  courses, capabilities, courseShortname, onCourseShortnameChange, selected, onToggle,
  onSave, onCancel, saving, lockCourse,
}: {
  courses: CourseSummary[];
  capabilities: Capability[];
  courseShortname: string;
  onCourseShortnameChange: (shortname: string) => void;
  selected: Set<string>;
  onToggle: (name: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  lockCourse?: boolean;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Khóa học</span>
        <select
          value={courseShortname}
          onChange={(e) => onCourseShortnameChange(e.target.value)}
          disabled={lockCourse}
          className="input text-sm"
        >
          <option value="">— Chọn khóa học —</option>
          {courses.map((c) => (
            <option key={c.shortname} value={c.shortname}>
              {c.title}
            </option>
          ))}
        </select>
      </label>
      <div className="max-h-40 space-y-1 overflow-y-auto">
        {capabilities.map((c) => (
          <label key={c.name} className="flex items-start gap-2 text-xs">
            <input
              type="checkbox"
              checked={selected.has(c.name)}
              onChange={() => onToggle(c.name)}
              className="mt-0.5"
            />
            <span>
              <span className="font-mono">{c.name}</span> — {c.description}
            </span>
          </label>
        ))}
      </div>
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !courseShortname}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Đang lưu…" : "Lưu"}
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-muted">
          Hủy
        </button>
      </div>
    </div>
  );
}
