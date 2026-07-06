"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GradebookTable } from "@/components/GradebookTable";
import { PageHeader } from "@/components/PageHeader";
import { gradebookApi } from "@/lib/api";
import type { GradebookRow } from "@/lib/types";
import { useAuthStore } from "@/store/auth";

export default function GradesPage() {
  const router = useRouter();
  const { accessToken, hydrated } = useAuthStore();
  const [rows, setRows] = useState<GradebookRow[] | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    gradebookApi.me(accessToken).then(setRows).catch(() => setRows([]));
  }, [hydrated, accessToken, router]);

  if (!hydrated || rows === null) {
    return <div className="grid min-h-screen place-items-center text-muted">Đang tải…</div>;
  }

  return (
    <div className="min-h-screen bg-bg">
      <PageHeader backHref="/dashboard" backLabel="Bảng điều khiển" maxWidthClass="max-w-5xl" />

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <h1 className="text-2xl font-bold">Điểm số của tôi</h1>
        <GradebookTable rows={rows} emptyLabel="Bạn chưa có điểm nào. Hãy làm một bài kiểm tra!" />
      </main>
    </div>
  );
}
