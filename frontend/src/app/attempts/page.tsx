"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { quizApi } from "@/lib/api";
import type { MyAttemptSummary } from "@/lib/types";
import { useAuthStore } from "@/store/auth";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN");
}

export default function MyAttemptsPage() {
  const { accessToken, hydrated } = useAuthStore();
  const [attempts, setAttempts] = useState<MyAttemptSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated || !accessToken) return;
    quizApi
      .myAttempts(accessToken)
      .then(setAttempts)
      .catch(() => setError("Không tải được lịch sử làm bài."));
  }, [hydrated, accessToken]);

  const submitted = (attempts ?? [])
    .filter((a) => a.status !== "IN_PROGRESS")
    .sort((a, b) => {
      const at = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const bt = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return bt - at;
    });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-6 text-2xl font-bold">Lịch sử làm bài</h1>

        {error && <p className="text-sm text-red">{error}</p>}

        {!attempts && !error && <p className="text-muted">Đang tải…</p>}

        {attempts && submitted.length === 0 && (
          <p className="text-muted">Bạn chưa nộp bài làm nào.</p>
        )}

        {submitted.length > 0 && (
          <div className="space-y-3">
            {submitted.map((a) => (
              <div
                key={a.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold">{a.quizTitle ?? "Bài đã bị xóa"}</p>
                  <p className="text-sm text-muted">
                    {a.courseTitle ?? ""} · Nộp lúc {fmtDate(a.submittedAt)}
                  </p>
                  <p className="text-sm text-muted">
                    Điểm: {a.rawScore ?? "—"}/{a.maxScore ?? "—"}
                    {a.bandScore != null && ` · Band ${a.bandScore}`}
                  </p>
                </div>
                {a.allowReviewAfterSubmit ? (
                  <Link
                    href={`/quiz/${a.id}`}
                    className="shrink-0 rounded-lg bg-primary px-4 py-2 text-center text-sm font-semibold text-white"
                  >
                    Xem lại →
                  </Link>
                ) : (
                  <span className="shrink-0 text-sm text-faint">
                    Giáo viên đã tắt xem lại cho bài này.
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
