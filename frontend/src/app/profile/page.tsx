"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ApiError, authApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export default function ProfilePage() {
  const router = useRouter();
  const { accessToken, hydrated, user, loadMe } = useAuthStore();
  const token = accessToken ?? "";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    loadMe().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, accessToken]);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setEmail(user.email);
    }
  }, [user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      await authApi.updateMe(token, {
        fullName,
        email,
        newPassword: newPassword || undefined,
        currentPassword: newPassword ? currentPassword : undefined,
      });
      setCurrentPassword("");
      setNewPassword("");
      setSuccess(true);
      await loadMe();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Cập nhật hồ sơ thất bại");
    } finally {
      setSaving(false);
    }
  }

  if (!hydrated || !user) {
    return <div className="grid min-h-screen place-items-center text-muted">Đang tải…</div>;
  }

  return (
    <div className="min-h-screen bg-bg">
      <PageHeader title="Hồ sơ của tôi" backHref="/dashboard" backLabel="Bảng điều khiển" />

      <main className="mx-auto max-w-lg px-6 py-8">
        <form onSubmit={save} className="space-y-4 rounded-card border border-border bg-surface p-6">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Tên đăng nhập</span>
            <input value={user.username} disabled className="input opacity-60" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Họ tên</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
              required
            />
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

          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs font-medium text-muted">
              Đổi mật khẩu (để trống nếu không đổi)
            </p>
            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-medium text-muted">Mật khẩu hiện tại</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Mật khẩu mới</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input"
                minLength={8}
              />
            </label>
          </div>

          {error && <p className="text-sm text-red">{error}</p>}
          {success && <p className="text-sm text-green">Đã lưu thay đổi.</p>}

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
        </form>
      </main>
    </div>
  );
}
