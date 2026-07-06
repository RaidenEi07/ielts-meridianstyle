"use client";

import Link from "next/link";
import { PartyPopper } from "lucide-react";
import { useEffect, useState } from "react";
import { CourseCard } from "@/components/CourseCard";
import { SiteHeader } from "@/components/SiteHeader";
import { ApiError, catalogApi, configApi, portalApi } from "@/lib/api";
import type { CourseSummary, PublicStats, TeacherPublic } from "@/lib/types";

interface HomepageInfoCard {
  icon: string;
  title: string;
  description: string;
}

const TESTIMONIALS = [
  {
    name: "Hoàng Anh",
    band: "7.5",
    text: "Mô phỏng phòng thi máy giống thi thật đến từng chi tiết. Mình vào phòng thi không hề bỡ ngỡ.",
  },
  {
    name: "Thùy Dung",
    band: "8.0",
    text: "Giáo viên tận tâm, lộ trình rõ ràng. Từ 6.0 lên 8.0 chỉ sau một khóa học.",
  },
  {
    name: "Minh Quân",
    band: "7.0",
    text: "Ngân hàng đề phong phú, chấm tự động nhanh. Biết ngay điểm yếu để cải thiện.",
  },
];

export default function HomePage() {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [teachers, setTeachers] = useState<TeacherPublic[]>([]);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [infoCards, setInfoCards] = useState<HomepageInfoCard[]>([]);

  useEffect(() => {
    catalogApi.courses().then((c) => setCourses(c.slice(0, 3))).catch(() => {});
    catalogApi.teachers().then(setTeachers).catch(() => {});
    catalogApi.stats().then(setStats).catch(() => {});
    configApi.getPublic().then((cfg) => {
      const raw = cfg.HOMEPAGE_INFO_CARDS;
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as HomepageInfoCard[];
        if (Array.isArray(parsed)) setInfoCards(parsed);
      } catch {
        /* bỏ qua nếu JSON hỏng */
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Hero */}
      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-24">
        <div className="space-y-6">
          <span className="inline-block rounded-full bg-accent-soft px-4 py-1.5 text-sm font-medium text-accent">
            Luyện thi IELTS theo chuẩn phòng thi máy (CDT)
          </span>
          <h1 className="text-5xl font-bold leading-[1.08] tracking-tight md:text-6xl">
            Chinh phục band điểm{" "}
            <em className="not-italic text-accent">mơ ước</em> cùng Anh ngữ
            Meridian
          </h1>
          <p className="max-w-lg text-lg text-muted">
            Hệ thống quản lý khóa học và mô phỏng phòng thi IELTS đầy đủ
            Listening, Reading, Writing — chấm tự động, quy đổi band ngay.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/login"
              className="rounded-full bg-primary px-7 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Bắt đầu ngay
            </Link>
            <Link
              href="/courses"
              className="border-b-2 border-accent pb-0.5 font-semibold text-accent"
            >
              Xem khóa học →
            </Link>
          </div>
        </div>

        {/* Ảnh hero + floating badges */}
        <div className="relative">
          <div
            className="aspect-[4/3] w-full rounded-[18px] border border-border"
            style={{
              background:
                "repeating-linear-gradient(45deg, var(--soft), var(--soft) 14px, var(--card) 14px, var(--card) 28px)",
            }}
          />
          <div className="absolute -bottom-4 -left-4 rounded-2xl bg-surface px-5 py-3 shadow-[0_16px_40px_-10px_rgba(38,33,27,.22)]">
            <div className="text-3xl font-bold text-green" style={{ fontFamily: "var(--font-serif)" }}>
              92%
            </div>
            <div className="text-xs text-muted">Đạt mục tiêu</div>
          </div>
          <div className="absolute -right-3 -top-3 rounded-full bg-red px-4 py-2 text-sm font-bold text-white shadow-lg">
            CDT
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-border bg-soft">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden bg-border sm:grid-cols-4">
          {[
            ["92%", "Đạt mục tiêu"],
            [stats ? `${stats.publishedCourses}+` : "—", "Khóa học"],
            [stats ? `${stats.teachers}` : "—", "Giáo viên IELTS 8.0+"],
            [stats ? `${stats.students}+` : "—", "Học viên"],
          ].map(([num, label]) => (
            <div key={label} className="bg-soft px-6 py-8 text-center">
              <dt className="text-3xl font-semibold md:text-4xl" style={{ fontFamily: "var(--font-serif)" }}>
                {num}
              </dt>
              <dd className="mt-1 text-sm text-muted">{label}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Khóa nổi bật */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold">Khóa học nổi bật</h2>
            <p className="mt-1 text-muted">Lộ trình được thiết kế theo từng mục tiêu band.</p>
          </div>
          <Link href="/courses" className="hidden font-semibold text-accent sm:block">
            Tất cả khóa học →
          </Link>
        </div>
        {courses.length === 0 ? (
          <p className="text-muted">Đang cập nhật khóa học…</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        )}
      </section>

      {/* 4 thẻ thông tin (chỉnh sửa ở /admin/settings) */}
      {infoCards.length > 0 && (
        <section className="border-t border-border bg-soft">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 md:grid-cols-2 md:items-center">
            <h2 className="text-3xl font-bold leading-tight md:text-4xl">
              Giáo dục chất lượng hơn, thế hệ tốt hơn
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {infoCards.map((card, i) => (
                <div
                  key={i}
                  className="rounded-[18px] border border-border bg-surface p-5 shadow-sm"
                >
                  <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-primary-soft text-xl">
                    {card.icon}
                  </div>
                  <h3 className="font-semibold">{card.title}</h3>
                  <p className="mt-1 text-sm text-muted">{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Giáo viên */}
      {teachers.length > 0 && (
        <section className="border-t border-border bg-soft">
          <div className="mx-auto w-full max-w-6xl px-6 py-16">
            <h2 className="mb-8 text-3xl font-bold">Đội ngũ giáo viên</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {teachers.map((t) => (
                <div key={t.id} className="rounded-[18px] border border-border bg-surface p-5 text-center">
                  <div
                    className="mx-auto h-20 w-20 rounded-full border border-border"
                    style={{
                      background:
                        "radial-gradient(circle at 50% 40%, var(--primary-soft), var(--soft))",
                    }}
                  />
                  <h3 className="mt-3 text-lg font-semibold">{t.fullName}</h3>
                  <p className="mt-1 text-sm font-medium text-accent">{t.headline}</p>
                  {t.bio && <p className="mt-2 text-xs text-muted">{t.bio}</p>}
                  <p className="mt-2 text-xs text-faint">{t.yearsExperience} năm kinh nghiệm</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials + form tư vấn */}
      <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 md:grid-cols-2">
        <div>
          <h2 className="mb-6 text-3xl font-bold">Học viên nói gì</h2>
          <div className="space-y-4">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-card border border-border bg-surface p-5">
                <p className="text-muted">“{t.text}”</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="font-semibold">{t.name}</span>
                  <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent">
                    Band {t.band}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <ConsultationForm />
      </section>

      {/* Footer */}
      <footer style={{ background: "#14110D", color: "#cbbfa9" }}>
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <div className="text-lg font-semibold text-white" style={{ fontFamily: "var(--font-serif)" }}>
              Anh ngữ Meridian
            </div>
            <p className="mt-2 text-sm">Luyện thi IELTS theo chuẩn phòng thi máy.</p>
          </div>
          <div>
            <h4 className="mb-3 font-semibold text-white">Khóa học</h4>
            <ul className="space-y-1.5 text-sm">
              <li><Link href="/courses" className="hover:text-white">Tất cả khóa học</Link></li>
              <li>Luyện thi IELTS</li>
              <li>Tiếng Anh giao tiếp</li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-semibold text-white">Về chúng tôi</h4>
            <ul className="space-y-1.5 text-sm">
              <li>Đội ngũ giáo viên</li>
              <li>Học viên tiêu biểu</li>
              <li>Liên hệ</li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-semibold text-white">Liên hệ</h4>
            <ul className="space-y-1.5 text-sm">
              <li>lienhe@meridian.edu.vn</li>
              <li>Hà Nội · TP.HCM</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs">
          © 2026 Anh ngữ Meridian · Nội dung demo
        </div>
      </footer>
    </div>
  );
}

function ConsultationForm() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setError(null);
    try {
      await portalApi.submitInquiry(form);
      setState("done");
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch (err) {
      setState("idle");
      setError(err instanceof ApiError ? err.message : "Gửi thất bại");
    }
  }

  return (
    <div className="rounded-[18px] border border-border bg-primary p-8 text-white">
      <h2 className="text-2xl font-bold">Đăng ký tư vấn miễn phí</h2>
      <p className="mt-1 text-sm text-white/70">
        Để lại thông tin, đội ngũ Meridian sẽ liên hệ trong 24h.
      </p>
      {state === "done" ? (
        <div className="mt-6 rounded-lg bg-white/10 p-6 text-center">
          <p className="flex items-center justify-center gap-2 text-lg font-semibold">
            <PartyPopper className="h-5 w-5" /> Cảm ơn bạn!
          </p>
          <p className="mt-1 text-sm text-white/80">Chúng tôi sẽ liên hệ sớm nhất.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Họ và tên"
            className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
              className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Số điện thoại"
              className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
          <textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="Bạn quan tâm khóa học nào?"
            rows={3}
            className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
          {error && <p className="text-sm text-red">{error}</p>}
          <button
            type="submit"
            disabled={state === "loading"}
            className="w-full rounded-lg bg-accent py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {state === "loading" ? "Đang gửi…" : "Đăng ký tư vấn"}
          </button>
        </form>
      )}
    </div>
  );
}
