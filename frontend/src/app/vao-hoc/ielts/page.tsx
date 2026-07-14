"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CourseCard } from "@/components/CourseCard";
import { SiteHeader } from "@/components/SiteHeader";
import { catalogApi, enrollmentApi } from "@/lib/api";
import type { CourseSummary } from "@/lib/types";
import { useAuthStore } from "@/store/auth";

export default function VaoHocIeltsPage() {
  const { accessToken, hydrated } = useAuthStore();
  const [courses, setCourses] = useState<CourseSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated || !accessToken) return;
    Promise.all([
      enrollmentApi.mine(accessToken),
      catalogApi.courses({ audienceGroup: "IELTS" }),
    ])
      .then(([enrollments, ieltsCourses]) => {
        const enrolledIds = new Set(enrollments.map((e) => e.courseId));
        setCourses(ieltsCourses.filter((c) => enrolledIds.has(c.id)));
      })
      .catch((e) => setError(e.message));
  }, [hydrated, accessToken]);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link href="/vao-hoc" className="text-sm text-accent">
          ← Vào học
        </Link>
        <h1 className="mt-2 text-3xl font-bold">IELTS</h1>
        <p className="mt-1 text-muted">Các khóa IELTS bạn đang theo học.</p>

        <div className="mt-8">
          {!hydrated ? (
            <p className="text-muted">Đang tải…</p>
          ) : !accessToken ? (
            <div className="rounded-lg border border-border bg-surface p-8 text-center">
              <p className="text-muted">Đăng nhập để xem các khóa IELTS bạn đang theo học.</p>
              <Link
                href="/login"
                className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white"
              >
                Đăng nhập
              </Link>
            </div>
          ) : courses === null ? (
            <p className="text-muted">Đang tải…</p>
          ) : error ? (
            <p className="text-red">{error}</p>
          ) : courses.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface p-8 text-center">
              <p className="text-muted">Bạn chưa ghi danh khóa IELTS nào.</p>
              <Link href="/courses" className="mt-4 inline-block text-accent hover:underline">
                Xem tất cả khóa IELTS →
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
