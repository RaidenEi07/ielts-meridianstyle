"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ApiError, classApi } from "@/lib/api";
import type { ClassSummary } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { useToast } from "@/store/toast";

export default function AdminClassesPage() {
  const router = useRouter();
  const { accessToken, hydrated, loadMe } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const token = accessToken ?? "";
  const toast = useToast();

  const [classes, setClasses] = useState<ClassSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

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
      .list(token)
      .then(setClasses)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Không tải được danh sách lớp"));
  }

  useEffect(() => {
    if (!allowed) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const c = await classApi.create(token, { name: name.trim(), description: description.trim() || undefined });
      toast.success(`Đã tạo lớp "${c.name}"`);
      router.push(`/admin/classes/${c.id}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Tạo lớp thất bại";
      setError(msg);
      toast.error(msg);
    } finally {
      setCreating(false);
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
            Trang này cần quyền <code>enrollment:manage</code>.
          </p>
          <Link href="/dashboard" className="mt-4 inline-block text-accent">
            ← Về bảng điều khiển
          </Link>
        </div>
      </div>
    );
  }

  const shown = (classes ?? []).filter((c) =>
    `${c.name} ${c.description ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-bg">
      <PageHeader title="Lớp học" backHref="/admin/users" backLabel="Quản lý tài khoản" />

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <div>
          <h1 className="text-xl font-bold">Lớp học</h1>
          <p className="mt-1 text-sm text-muted">
            Gom nhiều tài khoản vào một lớp. Khi gắn lớp vào một khóa học, cả lớp được ghi danh khóa đó; thành viên vào
            lớp sau này cũng tự được ghi danh.
          </p>
        </div>

        <form onSubmit={create} className="rounded-card border border-border bg-surface p-5" data-testid="class-create-form">
          <h2 className="mb-3 text-sm font-semibold text-muted">Tạo lớp mới</h2>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={150}
              placeholder="Tên lớp, ví dụ: IELTS 6.5 tối 2-4-6"
              className="input text-sm"
              aria-label="Tên lớp"
              required
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              placeholder="Mô tả (không bắt buộc)"
              className="input text-sm"
              aria-label="Mô tả lớp"
            />
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="rounded-lg bg-primary-fill px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {creating ? "Đang tạo…" : "Tạo lớp"}
            </button>
          </div>
        </form>

        {error && <p className="text-sm text-red">{error}</p>}

        <div className="space-y-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm lớp…"
            className="input w-full max-w-sm text-sm"
            aria-label="Tìm lớp"
          />
          <div className="overflow-hidden rounded-card border border-border bg-surface" data-testid="class-list">
            <table className="w-full text-left text-sm">
              <thead className="bg-soft text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Tên lớp</th>
                  <th className="px-4 py-2.5 font-medium">Thành viên</th>
                  <th className="px-4 py-2.5 font-medium">Khóa học đã gắn</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {classes == null ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted">
                      Đang tải…
                    </td>
                  </tr>
                ) : shown.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted">
                      {classes.length === 0 ? "Chưa có lớp nào. Tạo lớp đầu tiên ở khung phía trên." : "Không tìm thấy lớp phù hợp."}
                    </td>
                  </tr>
                ) : (
                  shown.map((c) => (
                    <tr key={c.id} className="border-t border-border hover:bg-soft">
                      <td className="px-4 py-3">
                        <Link href={`/admin/classes/${c.id}`} className="font-semibold text-accent hover:underline">
                          {c.name}
                        </Link>
                        {c.description && <p className="text-xs text-muted">{c.description}</p>}
                      </td>
                      <td className="px-4 py-3 font-mono">{c.memberCount}</td>
                      <td className="px-4 py-3 font-mono">{c.courseCount}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/classes/${c.id}`} className="text-xs font-semibold text-accent">
                          Mở →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
