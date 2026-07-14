"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

type Tab = "login" | "register";

export default function AuthPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);

  const [tab, setTab] = useState<Tab>("login");
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
      if (tab === "login") {
        await login(username, password);
      } else {
        await register(username, email, password, fullName);
      }
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Đã xảy ra lỗi không mong muốn",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* Cột trái — panel tối với stats */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-white md:flex">
        <div
          aria-hidden
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #ffffff 0, transparent 40%), radial-gradient(circle at 80% 60%, #ffffff 0, transparent 35%)",
          }}
        />
        <Link href="/">
          <Logo className="relative text-white [&_span]:text-white" />
        </Link>
        <div className="relative space-y-6">
          <h2
            className="text-3xl font-semibold leading-tight text-white"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Học thông minh, thi tự tin theo chuẩn IELTS Computer-Delivered.
          </h2>
          <div className="flex gap-10">
            <div>
              <div
                className="text-4xl font-semibold"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                92%
              </div>
              <div className="text-sm text-white/70">Học viên đạt mục tiêu</div>
            </div>
            <div>
              <div
                className="text-4xl font-semibold"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                10+
              </div>
              <div className="text-sm text-white/70">Dạng câu hỏi luyện tập</div>
            </div>
          </div>
        </div>
        <p className="relative text-sm text-white/60">© 2026 Anh ngữ Meridian</p>
      </aside>

      {/* Cột phải — form */}
      <main className="flex items-center justify-center bg-bg px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 md:hidden">
            <Link href="/">
              <Logo />
            </Link>
          </div>

          {/* Tab switcher */}
          <div className="mb-8 inline-flex rounded-full bg-soft p-1">
            {(["login", "register"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setError(null);
                }}
                className={`rounded-full px-6 py-2 text-sm font-semibold transition-colors ${
                  tab === t ? "bg-surface text-text shadow-sm" : "text-muted"
                }`}
              >
                {t === "login" ? "Đăng nhập" : "Đăng ký"}
              </button>
            ))}
          </div>

          <h1 className="mb-1 text-2xl font-bold">
            {tab === "login" ? "Chào mừng trở lại" : "Tạo tài khoản mới"}
          </h1>
          <p className="mb-6 text-sm text-muted">
            {tab === "login"
              ? "Đăng nhập để tiếp tục hành trình học tập."
              : "Đăng ký miễn phí, bạn sẽ được cấp vai trò Học viên."}
          </p>

          {error && (
            <div className="mb-4 rounded-lg border border-red/30 bg-red-soft px-4 py-3 text-sm text-red">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "register" && (
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
            )}
            <Field label="Tên đăng nhập">
              <input
                type="text"
                required
                autoComplete="username"
                pattern={tab === "register" ? "[a-zA-Z0-9._]{3,50}" : undefined}
                title={
                  tab === "register"
                    ? "Chỉ gồm chữ, số, dấu chấm, gạch dưới (3-50 ký tự)"
                    : undefined
                }
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ten_dang_nhap"
                className="input"
              />
            </Field>
            {tab === "register" && (
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
            )}
            <Field label="Mật khẩu">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={tab === "register" ? 8 : undefined}
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
              {loading
                ? "Đang xử lý…"
                : tab === "login"
                  ? "Đăng nhập"
                  : "Tạo tài khoản"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            <Link href="/" className="hover:text-text">
              ← Về trang chủ
            </Link>
            {" · "}
            <Link href="/parent/register" className="text-accent hover:underline">
              Đăng ký tài khoản phụ huynh
            </Link>
          </p>
        </div>
      </main>
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
