import type { Metadata } from "next";
import { getPublicCourse, getSiteConfig } from "@/lib/publicConfigServer";

// Tiêu đề tab, mô tả và canonical theo từng khóa (trang là client component nên không tự đặt được metadata).
// Tiêu đề viết đủ cả hậu tố tên trung tâm: template của layout gốc không được áp xuống tới tầng lồng này.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const courseId = Number(id);
  const [course, site] = await Promise.all([
    Number.isInteger(courseId) && courseId > 0 ? getPublicCourse(courseId) : Promise.resolve(null),
    getSiteConfig(),
  ]);
  return {
    title: { absolute: `${course?.title || "Khóa học"} — ${site.siteName}` },
    description: course?.summary ? course.summary.slice(0, 160) : undefined,
    alternates: { canonical: `/courses/${encodeURIComponent(id)}` },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
