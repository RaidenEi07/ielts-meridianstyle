"use client";

import { useEffect, useState } from "react";
import { CourseCard } from "@/components/CourseCard";
import { SiteHeader } from "@/components/SiteHeader";
import { catalogApi } from "@/lib/api";
import type { Category, CourseSummary } from "@/lib/types";

export default function CoursesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    catalogApi.categories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    catalogApi
      .courses(activeCategory ?? undefined)
      .then(setCourses)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-bold">Khóa học</h1>
        <p className="mt-1 text-muted">
          Chọn lộ trình phù hợp với mục tiêu của bạn.
        </p>

        <div className="mt-8 grid gap-8 md:grid-cols-[264px_1fr]">
          {/* Sidebar filter */}
          <aside className="md:sticky md:top-24 md:self-start">
            <div className="rounded-card border border-border bg-surface p-5">
              <h2 className="mb-3 text-sm font-semibold text-muted">Danh mục</h2>
              <ul className="space-y-1">
                <FilterItem
                  active={activeCategory === null}
                  label="Tất cả khóa học"
                  onClick={() => setActiveCategory(null)}
                />
                {categories.map((c) => (
                  <FilterItem
                    key={c.id}
                    active={activeCategory === c.id}
                    label={c.name}
                    badge={c.examTemplate?.code}
                    onClick={() => setActiveCategory(c.id)}
                  />
                ))}
              </ul>
            </div>
          </aside>

          {/* Grid */}
          <main>
            {loading ? (
              <p className="text-muted">Đang tải…</p>
            ) : error ? (
              <p className="text-red">{error}</p>
            ) : courses.length === 0 ? (
              <p className="text-muted">Chưa có khóa học nào trong mục này.</p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {courses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function FilterItem({
  active,
  label,
  badge,
  onClick,
}: {
  active: boolean;
  label: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
          active
            ? "bg-primary-soft font-semibold text-primary"
            : "text-text hover:bg-soft"
        }`}
      >
        {label}
        {badge && (
          <span className="rounded-full bg-red-soft px-2 py-0.5 text-[10px] font-bold text-red">
            {badge}
          </span>
        )}
      </button>
    </li>
  );
}
