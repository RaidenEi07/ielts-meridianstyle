"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ApiError, childSiteAdminApi } from "@/lib/api";
import type { ChildSite } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { useConfirm } from "@/store/confirm";

export default function ChildSitesPage() {
  const router = useRouter();
  const { accessToken, hydrated, loadMe } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const token = accessToken ?? "";

  const [sites, setSites] = useState<ChildSite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const confirm = useConfirm();

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    loadMe()
      .then(() => setAllowed(useAuthStore.getState().systemCapabilities.includes("course:distribute")))
      .catch(() => {})
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, accessToken]);

  function refresh() {
    if (!token) return;
    childSiteAdminApi.list(token).then(setSites).catch(() => {});
  }

  useEffect(() => {
    if (!allowed) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  async function toggleActive(site: ChildSite) {
    setError(null);
    try {
      await childSiteAdminApi.update(token, site.id, { active: !site.active });
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Đổi trạng thái thất bại");
    }
  }

  async function removeSite(site: ChildSite) {
    if (!(await confirm(`Xóa web con "${site.name}"? Web con này sẽ không nhận được khóa học gửi tới nữa.`))) return;
    setError(null);
    try {
      await childSiteAdminApi.remove(token, site.id);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xóa thất bại");
    }
  }

  async function copyKey(apiKey: string) {
    try {
      await navigator.clipboard.writeText(apiKey);
    } catch {
      /* trình duyệt không hỗ trợ clipboard — bỏ qua, người dùng tự chọn text */
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
            Trang này cần quyền <code>course:distribute</code>.
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
      <PageHeader title="Web con" backHref="/dashboard" backLabel="Bảng điều khiển" />

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Web con đã đăng ký ({sites.length})</h1>
          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            {creating ? "Đóng" : "+ Thêm web con"}
          </button>
        </div>

        <p className="text-sm text-muted">
          Mỗi web con cần cấu hình đúng API key này ở phía deployment của nó để nhận khóa học
          được gửi tới (xem lát tiếp theo).
        </p>

        {error && <p className="text-sm text-red">{error}</p>}

        {creating && (
          <CreateChildSiteForm
            token={token}
            onCreated={() => {
              setCreating(false);
              refresh();
            }}
          />
        )}

        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-soft text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Tên</th>
                <th className="px-4 py-2.5 font-medium">Base URL</th>
                <th className="px-4 py-2.5 font-medium">API key</th>
                <th className="px-4 py-2.5 font-medium">Trạng thái</th>
                <th className="px-4 py-2.5 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {sites.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted">
                    Chưa có web con nào.
                  </td>
                </tr>
              )}
              {sites.map((s) =>
                editingId === s.id ? (
                  <EditChildSiteRow
                    key={s.id}
                    site={s}
                    token={token}
                    onDone={() => {
                      setEditingId(null);
                      refresh();
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <tr key={s.id} className="border-t border-border align-top">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-muted">{s.baseUrl}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code
                          className="max-w-[220px] truncate text-xs text-muted"
                          title={s.apiKey}
                        >
                          {s.apiKey}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyKey(s.apiKey)}
                          className="shrink-0 rounded-md border border-border px-2 py-0.5 text-xs text-muted hover:text-text"
                        >
                          Sao chép
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleActive(s)}
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          s.active ? "bg-green-soft text-green" : "bg-soft text-muted"
                        }`}
                      >
                        {s.active ? "Hoạt động" : "Tạm dừng"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setEditingId(s.id)}
                          className="text-xs font-medium text-accent"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSite(s)}
                          className="text-xs font-medium text-red"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function CreateChildSiteForm({
  token,
  onCreated,
}: {
  token: string;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await childSiteAdminApi.create(token, { name, baseUrl });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Thêm web con thất bại");
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
        <span className="mb-1 block text-xs font-medium text-muted">Tên web con</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Vd: Chi nhánh Quận 1"
          className="input"
          required
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Base URL</span>
        <input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://chinhanh1.example.com"
          className="input"
          required
        />
      </label>

      {error && <p className="text-sm text-red sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Đang thêm…" : "Thêm web con"}
        </button>
        <p className="mt-2 text-xs text-muted">
          API key sẽ được tự sinh ngẫu nhiên sau khi thêm — sao chép để cấu hình phía web con.
        </p>
      </div>
    </form>
  );
}

function EditChildSiteRow({
  site,
  token,
  onDone,
  onCancel,
}: {
  site: ChildSite;
  token: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(site.name);
  const [baseUrl, setBaseUrl] = useState(site.baseUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await childSiteAdminApi.update(token, site.id, { name, baseUrl });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lưu thất bại");
      setSaving(false);
    }
  }

  return (
    <tr className="border-t border-border bg-soft/50 align-top">
      <td className="px-4 py-3">
        <input value={name} onChange={(e) => setName(e.target.value)} className="input text-sm" />
      </td>
      <td className="px-4 py-3">
        <input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          className="input text-sm"
        />
      </td>
      <td className="px-4 py-3">
        <code className="text-xs text-muted">{site.apiKey}</code>
      </td>
      <td className="px-4 py-3 text-xs text-muted">
        {site.active ? "Hoạt động" : "Tạm dừng"}
      </td>
      <td className="px-4 py-3">
        {error && <p className="mb-1 text-xs text-red">{error}</p>}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="text-xs font-medium text-accent disabled:opacity-60"
          >
            {saving ? "Đang lưu…" : "Lưu"}
          </button>
          <button type="button" onClick={onCancel} className="text-xs font-medium text-muted">
            Hủy
          </button>
        </div>
      </td>
    </tr>
  );
}
