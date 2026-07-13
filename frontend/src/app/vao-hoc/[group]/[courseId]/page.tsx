"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { ApiError, catalogApi, enrollmentApi } from "@/lib/api";
import { groupLabel } from "@/lib/audienceGroups";
import type { CourseDetail } from "@/lib/types";
import { useAuthStore } from "@/store/auth";

export default function VaoHocCoursePage() {
  const params = useParams<{ group: string; courseId: string }>();
  const courseId = Number(params.courseId);
  const { accessToken, hydrated } = useAuthStore();

  const [course, setCourse] = useState<CourseDetail | null>(null);
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

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link href={`/vao-hoc/${params.group}`} className="text-sm text-accent">
          ← {groupLabel(params.group)}
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{course.title}</h1>

        <div className="mt-8 space-y-3">
          {course.sections.length === 0 ? (
            <p className="text-muted">Chưa có bài học nào.</p>
          ) : (
            course.sections
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((s, i) => (
                <Link
                  key={s.id}
                  href={`/vao-hoc/${params.group}/${courseId}/${s.id}`}
                  className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4 transition-shadow hover:shadow-[0_8px_24px_-12px_rgba(38,33,27,.13)]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="font-medium">{s.title}</span>
                </Link>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
