"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GradebookTable } from "@/components/GradebookTable";
import { PageHeader } from "@/components/PageHeader";
import { gradebookApi, usersAdminApi } from "@/lib/api";
import type { AdminUser, GradebookRow } from "@/lib/types";
import { useAuthStore } from "@/store/auth";

export default function AdminStudentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, hydrated, loadMe } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const token = accessToken ?? "";

  const [student, setStudent] = useState<AdminUser | null>(null);
  const [rows, setRows] = useState<GradebookRow[] | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    loadMe()
      .then(() => setAllowed(useAuthStore.getState().systemCapabilities.includes("user:manage")))
      .catch(() => {})
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, accessToken]);

  useEffect(() => {
    if (!allowed) return;
    usersAdminApi.list(token).then((users) => {
      setStudent(users.find((u) => u.id === params.id) ?? null);
    });
    gradebookApi.forStudentAsAdmin(token, params.id).then(setRows).catch(() => setRows([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, params.id]);

  if (!hydrated || !ready) {
    return <div className="grid min-h-screen place-items-center text-muted">Đang tải…</div>;
  }

  if (!allowed) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <p className="text-lg font-semibold">Không có quyền truy cập</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <PageHeader
        title="Theo dõi học sinh"
        backHref="/admin/students"
        backLabel="Danh sách học sinh"
        maxWidthClass="max-w-5xl"
      />

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <div>
          <h1 className="text-2xl font-bold">{student?.fullName ?? "Học sinh"}</h1>
          {student && (
            <p className="text-sm text-muted">
              {student.username} · {student.email}
            </p>
          )}
        </div>
        {rows === null ? (
          <p className="text-muted">Đang tải…</p>
        ) : (
          <GradebookTable rows={rows} emptyLabel="Học sinh này chưa có điểm nào." />
        )}
      </main>
    </div>
  );
}
