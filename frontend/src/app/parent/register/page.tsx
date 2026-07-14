"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export default function ParentRegisterPage() {
  const router = useRouter();
  const registerParent = useAuthStore((s) => s.registerParent);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await registerParent(username, email, password, fullName);
      router.push("/parent/children");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Đã xảy ra lỗi không mong muốn",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-bg px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <Logo />
          </Link>
        </div>

        <h1 className="mb-1 text-center text-2xl font-bold">Đăng ký tài khoản phụ huynh</h1>
        <p className="mb-6 text-center text-sm text-muted">
          Quản lý hồ sơ học tập của các con và theo dõi tiến độ từ một tài khoản.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red/30 bg-red-soft px-4 py-3 text-sm text-red">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Họ và tên">
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="input"
            />
          </Field>
          <Field label="Tên đăng nhập">
            <input
              type="text"
              required
              autoComplete="username"
              pattern="[a-zA-Z0-9._]{3,50}"
              title="Chỉ gồm chữ, số, dấu chấm, gạch dưới (3-50 ký tự)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ten_dang_nhap"
              className="input"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ban@email.com"
              className="input"
            />
          </Field>
          <Field label="Mật khẩu">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input pr-16"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted hover:text-text"
              >
                {showPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Đang xử lý…" : "Tạo tài khoản phụ huynh"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Đã có tài khoản?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Đăng nhập
          </Link>
          {" · "}
          <Link href="/" className="hover:text-text">
            Về trang chủ
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
