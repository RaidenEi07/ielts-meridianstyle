"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { rosterApi } from "@/lib/api";
import type { StudentSummary } from "@/lib/types";
import { useAuthStore } from "@/store/auth";

export default function TeacherStudentsPage() {
  const router = useRouter();
  const { accessToken, hydrated, loadMe } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const token = accessToken ?? "";

  const [students, setStudents] = useState<StudentSummary[] | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    loadMe()
      .then(() => setAllowed(useAuthStore.getState().systemCapabilities.includes("question:manage")))
      .catch(() => {})
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, accessToken]);

  useEffect(() => {
    if (!allowed) return;
    rosterApi.myStudents(token).then(setStudents).catch(() => setStudents([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  if (!hydrated || !ready) {
    return <div className="grid min-h-screen place-items-center text-muted">Đang tải…</div>;
  }

  if (!allowed) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="text-lg font-semibold">Không có quyền truy cập</p>
          <Link href="/dashboard" className="mt-4 inline-block text-accent">
            ← Về bảng điều khiển
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <PageHeader title="Học sinh của tôi" backHref="/dashboard" backLabel="Bảng điều khiển" />

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <h1 className="text-xl font-bold">Học sinh được phân công ({students?.length ?? 0})</h1>

        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-soft text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Họ tên</th>
                <th className="px-4 py-2.5 font-medium">Tên đăng nhập</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {students === null ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    Đang tải…
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    Bạn chưa được phân công học sinh nào. Liên hệ quản trị viên để được gán.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{s.fullName}</td>
                    <td className="px-4 py-3 text-muted">{s.username}</td>
                    <td className="px-4 py-3 text-muted">{s.email}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/teacher/students/${s.id}`} className="text-sm font-semibold text-accent">
                        Xem kết quả →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
