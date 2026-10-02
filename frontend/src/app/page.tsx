"use client";

import Link from "next/link";
import { PartyPopper } from "lucide-react";
import { useEffect, useState } from "react";
import { CourseCard } from "@/components/CourseCard";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
import { useSiteConfig } from "@/components/SiteConfigProvider";
import { ApiError, catalogApi, configApi, portalApi } from "@/lib/api";
import type { CourseSummary, PublicStats, TeacherPublic } from "@/lib/types";
import { useBrokenImage } from "@/lib/useBrokenImage";

interface HomepageInfoCard {
  icon: string;
  title: string;
  description: string;
}

// Số cột của dải số liệu ở màn rộng, theo số ô (3 khi ẩn con số nổi bật, 4 khi có). Viết sẵn cả chuỗi class để
// Tailwind nhận ra lúc build.
const STAT_COLUMNS: Record<number, string> = { 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" };

export default function HomePage() {
  // Con số nổi bật, nhãn giáo viên và lời chứng thực do admin nhập ở Cấu hình hệ thống (rỗng = ẩn).
  const { siteName, heroImageUrl, highlightValue, highlightLabel, teachersLabel, testimonials } =
    useSiteConfig();
  // Ảnh đầu trang chủ do admin tải lên (Cấu hình hệ thống); chưa có hoặc không tải được thì hiện họa tiết sọc mẫu.
  const heroImage = useBrokenImage(heroImageUrl);
  const showHeroImage = heroImageUrl !== "" && !heroImage.broken;
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [teachers, setTeachers] = useState<TeacherPublic[]>([]);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [infoCards, setInfoCards] = useState<HomepageInfoCard[]>([]);

  const statCells: [string, string][] = [
    ...(highlightValue ? ([[highlightValue, highlightLabel]] as [string, string][]) : []),
    [stats ? `${stats.publishedCourses}+` : "—", "Khóa học"],
    [stats ? `${stats.teachers}` : "—", teachersLabel],
    [stats ? `${stats.students}+` : "—", "Học viên"],
  ];

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
            <em className="not-italic text-accent">mơ ước</em> cùng {siteName}
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
            data-testid="hero-image"
            className="aspect-[4/3] w-full overflow-hidden rounded-[18px] border border-border"
            style={
              showHeroImage
                ? undefined
                : {
                    background:
                      "repeating-linear-gradient(45deg, var(--soft), var(--soft) 14px, var(--card) 14px, var(--card) 28px)",
                  }
            }
          >
            {showHeroImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                {...heroImage.imgProps}
                src={heroImageUrl}
                alt=""
                fetchPriority="high"
                decoding="async"
                className="h-full w-full object-cover"
              />
            )}
          </div>
          {highlightValue && (
            <div
              data-testid="hero-highlight"
              className="absolute -bottom-4 -left-4 rounded-2xl bg-surface px-5 py-3 shadow-[0_16px_40px_-10px_rgba(38,33,27,.22)]"
            >
              <div className="text-3xl font-bold text-green" style={{ fontFamily: "var(--font-serif)" }}>
                {highlightValue}
              </div>
              {highlightLabel && <div className="text-xs text-muted">{highlightLabel}</div>}
            </div>
          )}
          <div className="absolute -right-3 -top-3 rounded-full bg-red px-4 py-2 text-sm font-bold text-white shadow-lg">
            CDT
          </div>
        </div>
      </section>

      {/* Stats strip: con số nổi bật (nếu admin nhập) + 3 số thật lấy từ hệ thống */}
      <section className="border-y border-border bg-soft">
        <dl
          data-testid="stats-strip"
          className={`mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden bg-border ${STAT_COLUMNS[statCells.length]}`}
        >
          {statCells.map(([num, label], i) => (
            <div
              key={i}
              // Trên điện thoại (2 cột), ô lẻ cuối chiếm cả hàng để khỏi lộ ô trống màu viền.
              className={`bg-soft px-6 py-8 text-center ${
                statCells.length % 2 === 1 && i === statCells.length - 1 ? "col-span-2 sm:col-span-1" : ""
              }`}
            >
              <dt className="text-3xl font-semibold md:text-4xl" style={{ fontFamily: "var(--font-serif)" }}>
                {num}
              </dt>
              {label && <dd className="mt-1 text-sm text-muted">{label}</dd>}
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

      {/* Lời chứng thực (admin nhập ở Cấu hình hệ thống) + form tư vấn. Chưa có lời nào thì ẩn cả mục
          và form tư vấn đứng một mình ở giữa. */}
      {testimonials.length > 0 ? (
        <section
          data-testid="testimonials-section"
          className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 md:grid-cols-2"
        >
          <div>
            <h2 className="mb-6 text-3xl font-bold">Học viên nói gì</h2>
            <div className="space-y-4">
              {testimonials.map((t, i) => (
                <div key={i} className="rounded-card border border-border bg-surface p-5">
                  <p className="text-muted">“{t.text}”</p>
                  {(t.name || t.band) && (
                    <div className="mt-3 flex items-center gap-2">
                      {t.name && <span className="font-semibold">{t.name}</span>}
                      {t.band && (
                        <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent">
                          Band {t.band.replace(/^band\s+/i, "")}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <ConsultationForm />
        </section>
      ) : (
        <section className="mx-auto w-full max-w-2xl px-6 py-16">
          <ConsultationForm />
        </section>
      )}

      <Footer />
    </div>
  );
}

function ConsultationForm() {
  const { siteName } = useSiteConfig();
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
        Để lại thông tin, đội ngũ {siteName} sẽ liên hệ trong 24h.
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
