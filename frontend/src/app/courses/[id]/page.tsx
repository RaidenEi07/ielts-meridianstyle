"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Check, CheckCircle2, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { ApiError, catalogApi, enrollmentApi, quizApi } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { CourseDetail, QuizSummary } from "@/lib/types";
import { useAuthStore } from "@/store/auth";

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const courseId = Number(params.id);
  const router = useRouter();

  const { accessToken, hydrated } = useAuthStore();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enrollState, setEnrollState] = useState<
    "idle" | "loading" | "done" | "already"
  >("idle");
  const [enrollMsg, setEnrollMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(courseId)) return;
    catalogApi
      .course(courseId)
      .then(setCourse)
      .catch((e) => setError(e.message));
  }, [courseId]);

  async function handleEnroll() {
    if (!accessToken) {
      router.push("/login");
      return;
    }
    setEnrollState("loading");
    setEnrollMsg(null);
    try {
      await enrollmentApi.enroll(courseId, accessToken);
      setEnrollState("done");
      setEnrollMsg("Ghi danh thành công! Vào bảng điều khiển để bắt đầu học.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setEnrollState("already");
        setEnrollMsg("Bạn đã ghi danh khóa học này rồi.");
      } else {
        setEnrollState("idle");
        setEnrollMsg(err instanceof ApiError ? err.message : "Ghi danh thất bại");
      }
    }
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <p className="text-red">{error}</p>
          <Link href="/courses" className="mt-4 inline-block text-accent">
            ← Về danh sách khóa học
          </Link>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="grid place-items-center px-6 py-20 text-muted">Đang tải…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Banner */}
      <div
        className="relative h-[260px] w-full bg-cover bg-center"
        style={{
          background: course.coverImageUrl
            ? `linear-gradient(180deg, transparent, rgba(30,58,95,.85)), url(${course.coverImageUrl}) center/cover`
            : "linear-gradient(180deg, transparent, rgba(30,58,95,.85)), repeating-linear-gradient(45deg, var(--soft), var(--soft) 12px, var(--card) 12px, var(--card) 24px)",
        }}
      >
        <div className="mx-auto flex h-full max-w-5xl flex-col justify-end px-6 pb-6">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-surface/90 px-3 py-1 text-xs font-semibold text-primary">
              {course.categoryName}
            </span>
            {course.examTemplateCode && (
              <span className="rounded-full bg-red px-3 py-1 text-xs font-bold text-white">
                Mô phỏng {course.examTemplateCode}
              </span>
            )}
          </div>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold text-white md:text-4xl">
            {course.title}
          </h1>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-8 px-6 py-10 md:grid-cols-[1fr_320px]">
        {/* Nội dung */}
        <main className="space-y-8">
          <section>
            <h2 className="mb-2 text-xl font-semibold">Giới thiệu</h2>
            <p className="text-muted">
              {course.summary ?? "Đang cập nhật nội dung khóa học."}
            </p>
          </section>

          {course.descriptionHtml && (
            <section>
              <h2 className="mb-2 text-xl font-semibold">Mô tả chi tiết</h2>
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: course.descriptionHtml }}
              />
            </section>
          )}

          {course.objectives.length > 0 && (
            <section>
              <h2 className="mb-3 text-xl font-semibold">Bạn sẽ học được gì</h2>
              <ul className="space-y-2">
                {course.objectives.map((o, i) => (
                  <li key={i} className="flex items-start gap-2 text-muted">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green" />
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {course.prerequisites && (
            <section>
              <h2 className="mb-2 text-xl font-semibold">Yêu cầu đầu vào</h2>
              <p className="text-muted">{course.prerequisites}</p>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-xl font-semibold">Đề cương</h2>
            {course.sections.length === 0 ? (
              <p className="text-muted">Đề cương đang được cập nhật.</p>
            ) : (
              <ol className="space-y-2">
                {course.sections.map((s, i) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                      {i + 1}
                    </span>
                    <div>
                      <span className="font-medium">{s.title}</span>
                      {s.shortDescription && (
                        <p className="text-sm text-muted">{s.shortDescription}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Bài kiểm tra */}
          <QuizzesSection courseId={courseId} />
        </main>

        {/* Sidebar ghi danh */}
        <aside className="md:sticky md:top-24 md:self-start">
          <div className="rounded-[18px] border border-border bg-surface p-6">
            <div
              className="text-3xl font-bold text-accent"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {formatPrice(course.price)}
            </div>
            <p className="mt-1 text-sm text-muted">
              {course.enrolledCount} học viên đã ghi danh
            </p>

            <button
              type="button"
              onClick={handleEnroll}
              disabled={enrollState === "loading" || enrollState === "done"}
              className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {enrollState === "loading"
                ? "Đang xử lý…"
                : enrollState === "done"
                  ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Đã ghi danh
                    </>
                  )
                  : enrollState === "already"
                    ? "Đã ghi danh trước đó"
                    : hydrated && !accessToken
                      ? "Đăng nhập để ghi danh"
                      : "Ghi danh ngay"}
            </button>

            {enrollMsg && (
              <p
                className={`mt-3 text-sm ${
                  enrollState === "done" || enrollState === "already"
                    ? "text-green"
                    : "text-red"
                }`}
              >
                {enrollMsg}
              </p>
            )}

            <Link
              href="/courses"
              className="mt-4 block text-center text-sm text-muted hover:text-text"
            >
              ← Tất cả khóa học
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function QuizzesSection({ courseId }: { courseId: number }) {
  const router = useRouter();
  const { accessToken, hydrated } = useAuthStore();
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [starting, setStarting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated || !accessToken) return;
    quizApi.courseQuizzes(courseId, accessToken).then(setQuizzes).catch(() => {});
  }, [hydrated, accessToken, courseId]);

  async function startQuiz(quizId: number) {
    if (!accessToken) {
      router.push("/login");
      return;
    }
    setStarting(quizId);
    setError(null);
    try {
      const attempt = await quizApi.start(quizId, accessToken);
      router.push(`/quiz/${attempt.attemptId}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không bắt đầu được bài làm");
      setStarting(null);
    }
  }

  if (hydrated && !accessToken) {
    return (
      <section>
        <h2 className="mb-3 text-xl font-semibold">Bài kiểm tra</h2>
        <p className="text-sm text-muted">
          <Link href="/login" className="text-accent">
            Đăng nhập
          </Link>{" "}
          để làm bài kiểm tra của khóa học.
        </p>
      </section>
    );
  }

  if (quizzes.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold">Bài kiểm tra</h2>
      {error && <p className="mb-2 text-sm text-red">{error}</p>}
      <ul className="space-y-2">
        {quizzes.map((q) => (
          <li
            key={q.id}
            className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{q.title}</span>
                {q.examTemplateCode && (
                  <span className="rounded-full bg-red px-2 py-0.5 text-[10px] font-bold text-white">
                    {q.examTemplateCode}
                  </span>
                )}
                {q.antiCheatEnabled && (
                  <span className="text-xs text-muted">
                    <Lock className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
              <p className="text-xs text-muted">
                {q.questionCount} câu
                {q.timeLimitSeconds
                  ? ` · ${Math.round(q.timeLimitSeconds / 60)} phút`
                  : ""}
                {q.maxAttempts > 0 ? ` · tối đa ${q.maxAttempts} lượt` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => startQuiz(q.id)}
              disabled={starting === q.id}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {starting === q.id ? "Đang mở…" : "Làm bài →"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
