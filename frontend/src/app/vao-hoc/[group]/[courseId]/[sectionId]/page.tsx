"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { LessonVideoPlayer } from "@/components/LessonVideoPlayer";
import { KidsVoiceRecorder } from "@/components/kids/KidsVoiceRecorder";
import { SiteHeader } from "@/components/SiteHeader";
import { ApiError, catalogApi, progressApi, quizApi } from "@/lib/api";
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
  const [completedSectionIds, setCompletedSectionIds] = useState<Set<number>>(new Set());
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [starting, setStarting] = useState<number | null>(null);
  const [completing, setCompleting] = useState(false);
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

  function loadProgress() {
    if (!accessToken || !Number.isFinite(courseId)) return;
    progressApi
      .courseProgress(courseId, accessToken)
      .then((p) => setCompletedSectionIds(new Set(p.completedSectionIds)))
      .finally(() => setProgressLoaded(true));
  }

  useEffect(() => {
    if (!hydrated) return;
    loadProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, accessToken, courseId]);

  const sortedSections = useMemo(
    () => (course?.sections ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder),
    [course],
  );

  // Chặn ở giao diện: nếu vào thẳng URL của buổi chưa mở khóa, quay lại trang khóa học.
  // Đợi progress tải xong (progressLoaded) mới kiểm tra — nếu không, completedSectionIds
  // rỗng lúc mới vào trang sẽ khiến buổi đã mở khóa bị coi nhầm là khóa.
  useEffect(() => {
    if (!course || !progressLoaded || sortedSections.length === 0) return;
    const index = sortedSections.findIndex((s) => s.id === sectionId);
    if (index <= 0) return;
    const completed = completedSectionIds.has(sectionId);
    if (completed) return;
    const prev = sortedSections[index - 1];
    if (prev && !completedSectionIds.has(prev.id)) {
      router.replace(`/vao-hoc/${params.group}/${courseId}`);
    }
  }, [
    course,
    progressLoaded,
    sortedSections,
    completedSectionIds,
    sectionId,
    courseId,
    params.group,
    router,
  ]);

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

  async function markComplete() {
    if (!accessToken) return;
    setCompleting(true);
    setError(null);
    try {
      await progressApi.markComplete(sectionId, accessToken);
      loadProgress();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không đánh dấu hoàn thành được");
    } finally {
      setCompleting(false);
    }
  }

  const section: Section | undefined = course?.sections.find((s) => s.id === sectionId);
  const isCompleted = completedSectionIds.has(sectionId);

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
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold">{section?.title ?? "Bài học"}</h1>
          {isCompleted && (
            <span className="flex items-center gap-1 rounded-full bg-green-soft px-3 py-1 text-xs font-semibold text-green">
              <Check className="h-3.5 w-3.5" /> Đã hoàn thành
            </span>
          )}
        </div>

        {section?.videoUrl ? (
          <div className="mt-6">
            <LessonVideoPlayer videoUrl={section.videoUrl} subtitleUrl={section.subtitleUrl} />
          </div>
        ) : (
          <p className="mt-6 rounded-lg border border-border bg-surface p-6 text-center text-muted">
            Bài này chưa có video.
          </p>
        )}

        {accessToken && (
          <div className="mt-6">
            <KidsVoiceRecorder sectionId={sectionId} token={accessToken} />
          </div>
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

        {quizzes.length === 0 && !isCompleted && (
          <button
            type="button"
            onClick={markComplete}
            disabled={completing}
            className="mt-6 w-full rounded-lg bg-primary py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {completing ? "Đang lưu…" : "Đánh dấu đã hoàn thành"}
          </button>
        )}
      </div>
    </div>
  );
}
