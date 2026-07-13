"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { ApiError, catalogApi, quizApi } from "@/lib/api";
import type { CourseDetail, QuizSummary, Section } from "@/lib/types";
import { useAuthStore } from "@/store/auth";

export default function VaoHocLessonPage() {
  const params = useParams<{ group: string; courseId: string; sectionId: string }>();
  const courseId = Number(params.courseId);
  const sectionId = Number(params.sectionId);
  const router = useRouter();
  const { accessToken, hydrated } = useAuthStore();

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [starting, setStarting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(courseId)) return;
    catalogApi.course(courseId).then(setCourse).catch((e) => setError(e.message));
  }, [courseId]);

  useEffect(() => {
    if (!hydrated || !accessToken || !Number.isFinite(courseId)) return;
    quizApi
      .courseQuizzes(courseId, accessToken)
      .then((all) => setQuizzes(all.filter((q) => q.sectionId === sectionId)))
      .catch(() => {});
  }, [hydrated, accessToken, courseId, sectionId]);

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
      setError(e instanceof ApiError ? e.message : "Không bắt đầu được bài luyện tập");
      setStarting(null);
    }
  }

  const section: Section | undefined = course?.sections.find((s) => s.id === sectionId);

  if (!course) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-3xl px-6 py-20 text-center text-muted">Đang tải…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link href={`/vao-hoc/${params.group}/${courseId}`} className="text-sm text-accent">
          ← {course.title}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{section?.title ?? "Bài học"}</h1>

        {section?.videoUrl ? (
          <video
            controls
            src={section.videoUrl}
            className="mt-6 w-full rounded-xl border border-border bg-black"
          />
        ) : (
          <p className="mt-6 rounded-lg border border-border bg-surface p-6 text-center text-muted">
            Bài này chưa có video.
          </p>
        )}

        {error && <p className="mt-4 text-sm text-red">{error}</p>}

        {quizzes.length > 0 && (
          <div className="mt-6 space-y-3">
            <h2 className="text-lg font-semibold">Luyện tập</h2>
            {quizzes.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface p-4"
              >
                <span className="font-medium">{q.title}</span>
                <button
                  type="button"
                  onClick={() => startQuiz(q.id)}
                  disabled={starting === q.id}
                  className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {starting === q.id ? "Đang mở…" : "Luyện tập"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
