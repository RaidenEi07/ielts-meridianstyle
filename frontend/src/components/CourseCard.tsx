import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { CourseSummary } from "@/lib/types";

export function CourseCard({ course, href }: { course: CourseSummary; href?: string }) {
  return (
    <Link
      href={href ?? `/courses/${course.id}`}
      className="group flex flex-col overflow-hidden rounded-[18px] border border-border bg-surface transition-shadow hover:shadow-[0_12px_36px_-14px_rgba(38,33,27,.13)]"
    >
      {/* Ảnh bìa (ảnh đại diện, hoặc placeholder hatch nếu chưa có) */}
      <div
        className="relative h-[150px] w-full bg-cover bg-center"
        style={{
          backgroundImage: course.coverImageUrl
            ? `url(${course.coverImageUrl})`
            : "repeating-linear-gradient(45deg, var(--soft), var(--soft) 10px, var(--card) 10px, var(--card) 20px)",
        }}
      >
        <span className="absolute left-3 top-3 rounded-full bg-surface/90 px-3 py-1 text-xs font-semibold text-primary">
          {course.categoryName}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-lg font-semibold leading-snug group-hover:text-primary">
          {course.title}
        </h3>
        {course.summary && (
          <p className="line-clamp-2 text-sm text-muted">{course.summary}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span
            className="text-[19px] font-semibold text-accent"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {formatPrice(course.price)}
          </span>
          <span className="text-xs text-muted">
            {course.enrolledCount} học viên
          </span>
        </div>
      </div>
    </Link>
  );
}
