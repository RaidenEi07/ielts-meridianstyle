"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check, Lock, Search } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { ApiError, catalogApi, enrollmentApi, progressApi } from "@/lib/api";
import { groupLabel, isGroupSlug } from "@/lib/audienceGroups";
import type { CourseDetail, Section } from "@/lib/types";
import { useAuthStore } from "@/store/auth";

export default function VaoHocCoursePage() {
  const params = useParams<{ group: string; courseId: string }>();
  const courseId = Number(params.courseId);
  const { accessToken, hydrated } = useAuthStore();

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [completedSectionIds, setCompletedSectionIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(courseId)) return;
    catalogApi
      .course(courseId)
      .then(setCourse)
      .catch((e) => setError(e.message));
  }, [courseId]);

  // Ghi danh ngầm (không hiện nút "Ghi danh" cho trẻ em/tiểu học) để bài luyện
  // tập (quiz gắn theo section) chạy được — AttemptService yêu cầu đã ghi danh.
  useEffect(() => {
    if (!hydrated || !accessToken || !Number.isFinite(courseId)) return;
    enrollmentApi.enroll(courseId, accessToken).catch((e) => {
      if (e instanceof ApiError && e.status === 409) return; // đã ghi danh rồi, bỏ qua
    });
  }, [hydrated, accessToken, courseId]);

  function loadProgress() {
    if (!accessToken || !Number.isFinite(courseId)) return;
    progressApi
      .courseProgress(courseId, accessToken)
      .then((p) => setCompletedSectionIds(new Set(p.completedSectionIds)))
      .catch(() => {});
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

  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedSections;
    return sortedSections.filter((s) => s.title.toLowerCase().includes(q));
  }, [sortedSections, search]);

  function isUnlocked(index: number, section: Section): boolean {
    if (index === 0) return true;
    if (completedSectionIds.has(section.id)) return true;
    const prev = sortedSections[index - 1];
    return prev ? completedSectionIds.has(prev.id) : true;
  }

  if (!isGroupSlug(params.group)) {
    notFound();
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <p className="text-red">{error}</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-3xl px-6 py-20 text-center text-muted">Đang tải…</div>
      </div>
    );
  }

  const total = sortedSections.length;
  const doneCount = sortedSections.filter((s) => completedSectionIds.has(s.id)).length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Banner */}
      <div
        className="h-[180px] w-full bg-cover bg-center"
        style={{
          backgroundImage: course.coverImageUrl
            ? `url(${course.coverImageUrl})`
            : "repeating-linear-gradient(45deg, var(--soft), var(--soft) 10px, var(--card) 10px, var(--card) 20px)",
        }}
      />

      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link href={`/vao-hoc/${params.group}`} className="text-sm text-accent">
          ← {groupLabel(params.group)}
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{course.title}</h1>
        {course.summary && <p className="mt-2 text-muted">{course.summary}</p>}

        {total > 0 && (
          <div className="mt-6">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">Tiến độ</span>
              <span className="text-muted">
                {doneCount}/{total} buổi ({pct}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-soft">
              <div
                className="h-full rounded-full bg-green transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {total > 0 && (
          <div className="relative mt-6">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm buổi học…"
              className="input pl-9"
            />
          </div>
        )}

        <div className="mt-6 space-y-3">
          {sortedSections.length === 0 ? (
            <p className="text-muted">Chưa có bài học nào.</p>
          ) : filteredSections.length === 0 ? (
            <p className="text-muted">Không tìm thấy buổi học phù hợp.</p>
          ) : (
            filteredSections.map((s) => {
              const index = sortedSections.findIndex((x) => x.id === s.id);
              const completed = completedSectionIds.has(s.id);
              const unlocked = isUnlocked(index, s);

              const badge = completed ? (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-soft text-green">
                  <Check className="h-4 w-4" />
                </span>
              ) : unlocked ? (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                  {index + 1}
                </span>
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-soft text-muted">
                  <Lock className="h-4 w-4" />
                </span>
              );

              const content = (
                <>
                  {badge}
                  <span className={`font-medium ${!unlocked ? "text-muted" : ""}`}>{s.title}</span>
                </>
              );

              return unlocked ? (
                <Link
                  key={s.id}
                  href={`/vao-hoc/${params.group}/${courseId}/${s.id}`}
                  className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4 transition-shadow hover:shadow-[0_8px_24px_-12px_rgba(38,33,27,.13)]"
                >
                  {content}
                </Link>
              ) : (
                <div
                  key={s.id}
                  title="Hoàn thành buổi trước để mở khóa"
                  className="flex cursor-not-allowed items-center gap-4 rounded-lg border border-border bg-surface/60 p-4 opacity-70"
                >
                  {content}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

