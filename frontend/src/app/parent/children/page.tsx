"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ApiError, familyApi } from "@/lib/api";
import type { ChildProfile } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { useConfirm } from "@/store/confirm";

export default function ParentChildrenPage() {
  const router = useRouter();
  const { user, accessToken, hydrated, loadMe, logout, switchToChild } = useAuthStore();
  const confirm = useConfirm();

  const [ready, setReady] = useState(false);
  const [children, setChildren] = useState<ChildProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    loadMe()
      .catch(() => {
        logout();
        router.replace("/login");
      })
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, accessToken]);

  useEffect(() => {
    if (!ready || !accessToken) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, accessToken]);

  function refresh() {
    if (!accessToken) return;
    familyApi
      .children(accessToken)
      .then(setChildren)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Không tải được danh sách hồ sơ con"),
      );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await familyApi.createChild(accessToken, newName.trim());
      setNewName("");
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tạo hồ sơ con thất bại");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(child: ChildProfile) {
    if (!accessToken) return;
    if (
      !(await confirm(
        `Xóa hồ sơ "${child.fullName}"? Dữ liệu học tập của con vẫn được giữ lại, nhưng bạn sẽ không còn quản lý hồ sơ này.`,
      ))
    )
      return;
    try {
      await familyApi.deleteChild(accessToken, child.id);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xóa hồ sơ thất bại");
    }
  }

  async function handleSwitch(child: ChildProfile) {
    setSwitching(child.id);
    setError(null);
    try {
      await switchToChild(child.id);
      router.push("/vao-hoc");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Chuyển sang hồ sơ con thất bại");
      setSwitching(null);
    }
  }

  if (!hydrated || !ready || !user) {
    return (
      <div className="grid min-h-screen place-items-center text-muted">Đang tải…</div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:text-text"
            >
              ← Bảng điều khiển
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
        <div>
          <h1 className="text-2xl font-bold">Hồ sơ con</h1>
          <p className="mt-1 text-sm text-muted">
            Quản lý hồ sơ học tập của các con và vào học cùng con — không cần mật khẩu
            riêng cho từng con.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red/30 bg-red-soft px-4 py-3 text-sm text-red">
            {error}
          </div>
        )}

        <section className="rounded-lg border border-border bg-surface p-6">
          <h2 className="mb-3 text-lg font-semibold">Thêm hồ sơ mới</h2>
          <form onSubmit={handleCreate} className="flex gap-3">
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Tên của con, vd. Bé An"
              className="input flex-1"
            />
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {creating ? "Đang tạo…" : "+ Thêm hồ sơ"}
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold">Danh sách hồ sơ con</h2>
          {!children ? (
            <p className="text-sm text-muted">Đang tải…</p>
          ) : children.length === 0 ? (
            <p className="text-sm text-muted">Chưa có hồ sơ con nào. Thêm hồ sơ đầu tiên ở trên.</p>
          ) : (
            <ul className="space-y-3">
              {children.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"
                >
                  <div>
                    <p className="font-medium">{c.fullName}</p>
                    <p className="text-xs text-muted">@{c.username}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSwitch(c)}
                      disabled={switching === c.id}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      {switching === c.id ? "Đang chuyển…" : `Vào học cùng ${c.fullName}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c)}
                      className="rounded-lg border border-border px-3 py-2 text-sm text-muted hover:border-red/40 hover:text-red"
                    >
                      Xóa
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
