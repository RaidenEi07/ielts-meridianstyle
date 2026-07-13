"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CourseCard } from "@/components/CourseCard";
import { SiteHeader } from "@/components/SiteHeader";
import { catalogApi } from "@/lib/api";
import { groupLabel, groupSlugToAudience } from "@/lib/audienceGroups";
import type { CourseSummary } from "@/lib/types";

export default function VaoHocGroupPage() {
  const params = useParams<{ group: string }>();
  const audienceGroup = groupSlugToAudience(params.group);

  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!audienceGroup) return;
    setLoading(true);
    catalogApi
      .courses({ audienceGroup })
      .then(setCourses)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [audienceGroup]);

  if (!audienceGroup) {
    notFound();
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link href="/vao-hoc" className="text-sm text-accent">
          ← Vào học
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{groupLabel(params.group)}</h1>
        <p className="mt-1 text-muted">Chọn khóa học để bắt đầu.</p>

        <div className="mt-8">
          {loading ? (
            <p className="text-muted">Đang tải…</p>
          ) : error ? (
            <p className="text-red">{error}</p>
          ) : courses.length === 0 ? (
            <p className="text-muted">Chưa có khóa học nào trong nhóm này.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  href={`/vao-hoc/${params.group}/${course.id}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
